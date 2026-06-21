let myChart = null; 

$(document).ready(function() {
    
    // 1. Charger la liste des types de compteurs au démarrage
    loadMeterTypes();

    // --- SET DEFAULT DATE TO CURRENT MONTH ---
    const now = new Date();
    // First day of current month
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    // Last day of current month (day 0 of next month)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Function to format date as YYYY-MM-DD for input type="date"
    const formatDate = (date) => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${y}-${m}-${d}`;
    };

    // Set the inputs
    $('#startDate').val(formatDate(firstDay));
    $('#endDate').val(formatDate(lastDay)); // Or use formatDate(now) to stop at today's date


    // --- FEATURE 2: STATISTICS ---
    $("#btnGenerateStats").click(function() {
        let formData = $("#statsForm").serialize() + "&function=getStatistics";
        
        $.ajax({
            url: "php/DbStatistics.php",
            type: "POST",
            data: formData,
            dataType: "json",
            beforeSend: function() {
                $('#statsLoader').show();
                $('.flat-canvas-container').hide();
                $('#totalMetersText').text('');
            },
            success: function(res) {
                if(res.state === "s") {
                    renderChart(res.data);
                }
            },
            complete: function() {
                $('#statsLoader').hide();
                $('.flat-canvas-container').show();
            }
        });
    });

    // Générer les stats globales automatiquement au démarrage
    setTimeout(() => { $("#btnGenerateStats").click(); }, 300);
});

// Récupérer la liste des modèles pour le filtre (utilise DbServices existant)
function loadMeterTypes() {
    $.ajax({
        url: "php/DbServices.php", 
        type: "POST",
        data: { function: "getMeterTypes" },
        dataType: "json",
        success: function(data) {
            data.forEach(type => {
                $("#statMeterType").append(`<option value="${type.id}">${type.meter_type}</option>`);
            });
        }
    });
}

// Fonction de création du graphique avec Chart.js
function renderChart(data) {
    let labels = [];
    let datasets = [];
    let totalMeters = 0;

    // Agréger les données et préparer les étiquettes de l'axe X
    data.forEach(row => {
        let label = (row.pack_hour !== undefined && row.pack_hour !== null) 
            ? `${row.pack_date} à ${row.pack_hour}h` 
            : `${row.pack_date}`; // Si la date est regroupée par jour, pas d'heure affichée

        if(!labels.includes(label)) labels.push(label);
        totalMeters += parseInt(row.total_meters);
    });

    // --- NOUVEAU : CALCUL DE LA CADENCE ---
    let cadence = 0;
    let sDate = $('#startDate').val();
    let eDate = $('#endDate').val();
    let sHour = $('#startHour').val();
    let eHour = $('#endHour').val();
    let shiftHours = 0;

    // Si l'utilisateur a défini une plage horaire spécifique (Ex: Equipe de nuit 21h à 05h)
    if(sDate && eDate && sHour !== "" && eHour !== "") {
        let startStr = sDate + 'T' + sHour.padStart(2, '0') + ':00:00';
        let endStr = eDate + 'T' + eHour.padStart(2, '0') + ':59:59';
        
        let diffMs = new Date(endStr) - new Date(startStr);
        // On convertit les millisecondes en heures (arrondi à l'heure supérieure)
        shiftHours = Math.ceil(diffMs / (1000 * 60 * 60)); 
    } 
    // Sinon (ex: filtre sur plusieurs jours sans heure précise), on se base sur les heures productives trouvées
    else {
        shiftHours = labels.length; 
    }

    // Protection contre la division par zéro
    if (shiftHours > 0) {
        cadence = Math.round(totalMeters / shiftHours);
    } else {
        cadence = totalMeters;
    }

    // Mise à jour de l'affichage avec le Total et la Cadence (Utilisation de .html() pour intégrer des balises)
    $("#totalMetersText").html(`
        Total des compteurs emballés : ${totalMeters} 
        <br> 
        <span class="badge badge-info mt-2" style="font-size: 0.85em; padding: 8px;">
            <i class="fas fa-tachometer-alt"></i> Cadence moyenne : ${cadence} compteurs/heure
        </span>
    `);

    // Créer les points de données (en accumulant s'il y a plusieurs types de compteurs)
    let dataPoints = labels.map(label => {
        let modelsWithLabel = data.filter(r => {
            let rLabel = (r.pack_hour !== undefined && r.pack_hour !== null) 
                ? `${r.pack_date} à ${r.pack_hour}h` 
                : `${r.pack_date}`;
            return rLabel === label;
        });

        // Somme des compteurs si plusieurs enregistrements partagent la même étiquette
        return modelsWithLabel.reduce((sum, current) => sum + parseInt(current.total_meters), 0);
    });

    datasets.push({
        label: 'Quantité emballée',
        data: dataPoints,
        backgroundColor: 'rgba(0, 123, 255, 0.7)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 2,
        borderRadius: 4
    });

    // Détruire l'ancien graphique s'il existe (pour rafraîchissement)
    if (myChart != null) {
        myChart.destroy();
    }

    // Dessiner le nouveau graphique
    let ctx = document.getElementById('statsChart').getContext('2d');
     // Un plugin personnalisé pour afficher les valeurs sur les barres
    const drawValuesPlugin = {
        id: 'drawValuesPlugin',
        afterDatasetsDraw(chart) {
            const { ctx, data } = chart;
            ctx.save();
            
            data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (!meta.hidden) {
                    meta.data.forEach((element, index) => {
                        const value = dataset.data[index];
                        // Ignorer l'affichage s'il n'y a pas de donnée
                        if(value > 0) {
                            ctx.fillStyle = '#ffffff'; // Blanc pour contraster sur le bleu
                            ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'top'; // Aligner par rapport au haut du texte

                            // element.y représente le sommet de la barre. 
                            // On y ajoute +5 pixels pour que le texte soit juste à l'intérieur, en haut.
                            const yPos = element.y + 5; 

                            ctx.shadowColor = "rgba(0,0,0,0.5)"; // Légère ombre pour la lisibilité
                            ctx.shadowBlur = 4;
                            ctx.fillText(value, element.x, yPos);
                        }
                    });
                }
            });
            ctx.restore();
        }
    };
    
    myChart = new Chart(ctx, {
        type: 'bar', // Type de graphique (barres)
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: [drawValuesPlugin], // <--- IL MANQUAIT CETTE LIGNE !
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Quantité (Compteurs)', font: { weight: 'bold' } }
                },
                x: {
                    title: { display: true, text: 'Date & Heure', font: { weight: 'bold' } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}