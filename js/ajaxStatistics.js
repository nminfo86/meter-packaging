let myChart = null; 

$(document).ready(function() {
    
    // 1. Charger la liste des types de compteurs au démarrage
    loadMeterTypes();

    // Focaliser l'input automatiquement
    setTimeout(() => { $('#trackBarcode').focus(); }, 500);

    // --- FEATURE 1: TRACK METER, BOX OR PALETTE ---
    $("#btnTrack").click(function() {
        let identifier = $("#trackBarcode").val().trim();
        if(identifier === "") return;

        $.ajax({
            url: "php/DbStatistics.php",
            type: "POST",
            data: { function: "trackItem", identifier: identifier },
            dataType: "json",
            success: function(res) {
                let resultDiv = $("#trackResult");
                resultDiv.removeClass('d-none alert-danger alert-info alert-success').empty();

                if(res.state === "s") {
                    resultDiv.addClass('alert-success');
                    let html = '';

                    // ==========================================
                    // AFFICHAGE SI C'EST UN COMPTEUR
                    // ==========================================
                    if (res.item_type === "meter") {
                        let d = res.data;
                        let boxText = d.box_number ? d.box_number : '<span class="text-danger">Pas encore en carton</span>';
                        let palText = d.palette_number ? d.palette_number : '<span class="text-warning">Pas encore palettisé</span>';
                        
                        html = `<div class="text-left">
                                    <h5 class="border-bottom pb-2"><i class="fas fa-tachometer-alt"></i> Détails du Compteur</h5>
                                    <div class="row mt-3">
                                        <div class="col-md-6 mb-2"><strong>Code-barres:</strong> ${d.barcode}</div>
                                        <div class="col-md-6 mb-2"><strong>Modèle:</strong> <span class="text-primary font-weight-bold">${d.meter_type}</span></div>
                                        <div class="col-md-6 mb-2"><strong>Emballé le:</strong> ${d.packing_date}</div>
                                        <div class="col-md-6 mb-2"><strong>Statut:</strong> ${d.meter_status === 'wait' ? '<span class="text-warning">En attente</span>' : '<span class="text-success">Emballé</span>'}</div>
                                        <div class="col-md-6 mb-2"><strong>Carton:</strong> ${boxText}</div>
                                        <div class="col-md-6 mb-2"><strong>Palette:</strong> ${palText}</div>
                                    </div>
                                </div>`;
                    }
                    
                    // ==========================================
                    // AFFICHAGE SI C'EST UN CARTON
                    // ==========================================
                    else if (res.item_type === "box") {
                        let info = res.info;
                        let palText = info.palette_number ? info.palette_number : '<span class="text-warning">Pas encore sur palette</span>';
                        
                        html = `<div class="text-left">
                                    <h5 class="border-bottom pb-2 text-primary"><i class="fas fa-box"></i> Carton : ${info.box_number}</h5>
                                    <div class="row mt-3 mb-3">
                                        <div class="col-md-4"><strong>Modèle:</strong> ${info.meter_type}</div>
                                        <div class="col-md-4"><strong>Statut:</strong> ${info.box_status}</div>
                                        <div class="col-md-4"><strong>Créé le:</strong> ${info.create_date}</div>
                                        <div class="col-md-4 mt-2"><strong>Palette:</strong> ${palText}</div>
                                        <div class="col-md-4 mt-2"><strong>Quantité:</strong> <span class="badge badge-success">${res.contents.length}</span> compteur(s)</div>
                                    </div>
                                    <table class="table table-sm table-bordered bg-white text-center mt-2">
                                        <thead class="thead-dark"><tr><th>N°</th><th>Code-barres Compteur</th><th>Date d'emballage</th><th>Statut</th></tr></thead>
                                        <tbody>`;
                        res.contents.forEach((m, index) => {
                            let mStatus = m.status === 'wait' ? '<span class="text-warning font-weight-bold">Attente</span>' : '<span class="text-success">OK</span>';
                            html += `<tr><td>${index + 1}</td><td class="font-weight-bold">${m.barcode}</td><td>${m.create_date}</td><td>${mStatus}</td></tr>`;
                        });
                        html += `</tbody></table></div>`;
                    }

                    // ==========================================
                    // AFFICHAGE SI C'EST UNE PALETTE
                    // ==========================================
                    else if (res.item_type === "palette") {
                        let info = res.info;
                        
                        html = `<div class="text-left">
                                    <h5 class="border-bottom pb-2 text-success"><i class="fas fa-pallet"></i> Palette : ${info.palette_number}</h5>
                                    <div class="row mt-3 mb-3">
                                        <div class="col-md-4"><strong>Statut:</strong> ${info.status}</div>
                                        <div class="col-md-4"><strong>Créée le:</strong> ${info.create_date}</div>
                                        <div class="col-md-4"><strong>Total Cartons:</strong> <span class="badge badge-primary">${res.contents.length}</span></div>
                                    </div>
                                    <table class="table table-sm table-bordered bg-white text-center mt-2">
                                        <thead class="thead-dark"><tr><th>N°</th><th>Numéro du Carton</th><th>Qté Compteurs</th><th>Date d'ajout</th></tr></thead>
                                        <tbody>`;
                        res.contents.forEach((b, index) => {
                            html += `<tr><td>${index + 1}</td><td class="font-weight-bold">${b.box_number}</td><td>${b.meter_count}</td><td>${b.create_date}</td></tr>`;
                        });
                        html += `</tbody></table></div>`;
                    }

                    resultDiv.html(html);
                } else {
                    resultDiv.addClass('alert-danger').html(`<strong>Erreur :</strong> ${res.message}`);
                }
                
                // Vider le champ et remettre le focus pour le prochain scan
                $("#trackBarcode").val('').focus();
            }
        });
    });

    // Déclencher la recherche en appuyant sur "Entrée"
    $("#trackBarcode").keypress(function(e) {
        if(e.which == 13) { 
            e.preventDefault();
            $("#btnTrack").click(); 
        }
    });

    // --- FEATURE 2: STATISTICS ---
    $("#btnGenerateStats").click(function() {
        let formData = $("#statsForm").serialize() + "&function=getStatistics";
        
        $.ajax({
            url: "php/DbStatistics.php",
            type: "POST",
            data: formData,
            dataType: "json",
            success: function(res) {
                if(res.state === "s") {
                    renderChart(res.data);
                }
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
        let label = `${row.pack_date} à ${row.pack_hour}h`;
        if(!labels.includes(label)) labels.push(label);
        totalMeters += parseInt(row.total_meters);
    });

    $("#totalMetersText").text(`Total des compteurs emballés : ${totalMeters}`);

    // Créer les points de données
    let dataPoints = labels.map(label => {
        let match = data.find(r => `${r.pack_date} à ${r.pack_hour}h` === label);
        return match ? parseInt(match.total_meters) : 0;
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
    myChart = new Chart(ctx, {
        type: 'bar', // Type de graphique (barres)
        data: {
            labels: labels,
            datasets: datasets
        },
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