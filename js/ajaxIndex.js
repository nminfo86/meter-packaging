var dataType = "JSON";
var qrAlert = $("#qrAlert");
var packTable = $("#packTable");

$(document).ready(function () {
    loadMeterTypes();

    var barcodeStr = '';

    // Amélioration 1 : Écoute du scan de manière globale (Window)
    document.addEventListener('keypress', e => {
        // Optionnel : ne pas bloquer si l'utilisateur écrit dans un vrai champ texte
        if (e.target.tagName === "INPUT" && e.target.type !== "hidden" && e.target.id !== "qrProduct") return;

        if (e.keyCode !== 13) {
            barcodeStr += e.key;
        } else {
            let meterTypeId = $("#meterTypeSelect").val();
            let barcode = barcodeStr.trim();
            
            if (!meterTypeId) {
                showAlertFailed("Veuillez d'abord sélectionner un Modèle !");
                barcodeStr = '';
                return;
            }

            if (!/^\d+$/.test(barcode)) {
                showAlertFailed("Erreur BareCode. Vérifier la langue de votre clavier.");
                barcodeStr = '';
                return;
            }

            if (barcode !== '') {
                qrAlert.addClass("d-none");
                packMeter(barcode, meterTypeId);
            }
            
            barcodeStr = '';
        }
    });

    // Action pour le bouton d'impression manuelle (Amélioration 3)
    $("#manualPrintBtn").click(function() {
        let meterName = $(this).attr("data-meter");
        let boxNum = $(this).attr("data-box");
        if(meterName && boxNum) {
            printBox(meterName, boxNum);
        }
    });

    function loadMeterTypes() {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            dataType: dataType,
            data: { function: "getMeterTypes" },
            success: function (data) {
                $.each(data, function (index, item) {
                    $("#meterTypeSelect").append($('<option>', {
                        value: item.id,
                        text: item.meter_type + " (Carton de " + item.qty_box + ")"
                    }));
                });
            }
        });
    }

    function packMeter(barcode, meterTypeId) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            dataType: dataType,
            data: { 
                function: "packMeter", 
                barcode: barcode, 
                id_meter_type: meterTypeId 
            },
            beforeSend: function () { $("#divLoadingcms").removeClass("d-none"); },
            success: function (data) {
                // Gestion du compteur déjà emballé
                if (data.state === "already_packed") {
                    let currentUIRows = packTable.find("tbody tr").length;
                    
                    // MODIFICATION : On vérifie que l'UI est vide ET que le carton est FERMÉ ("closed")
                    if (currentUIRows === 0 && data.box_status === "closed") {
                        
                        swal({
                            title: "Compteur déjà emballé !",
                            text: data.message + "\nCe carton est déjà fermé. Voulez-vous l'ouvrir pour consulter ou réimprimer l'étiquette ?",
                            icon: "warning",
                            buttons: ["Non", "Oui, l'ouvrir"],
                            dangerMode: false,
                        }).then((result) => {
                            let isConfirmed = (result === true) || (result && result.isConfirmed);
                            if (isConfirmed) {
                                loadBoxData(data.id_box);
                            }
                        });
                        
                    } else {
                        // L'UI n'est pas vide, OU le carton est toujours ouvert : on affiche juste l'erreur
                        showAlertFailed(data.message);
                    }
                } 
                else if (data.state === "f") {
                    showAlertFailed(data.message);
                } 
                else if (data.state === "s") {
                    
                    $("#generalInfo").removeClass("d-none");
                    $(".meterTypeName").text(data.meter_type_name);
                    $(".boxNumber").text(data.box_number);
                    $(".packedQteBox").text(data.packed_box_qte);
                    $("#currentBoxId").val(data.id_box);

                    // Amélioration 2 : Reconstruction complète du tableau via l'historique de la DB
                    packTable.find("tbody").empty();
                    let totalMeters = data.all_meters.length;
                    
                    $.each(data.all_meters, function(index, meter) {
                        // Ordre d'affichage : le plus récent en haut
                        let rowNum = totalMeters - index; 
                        let newRow = "<tr class='table-success'>" +
                            "<td>" + rowNum + "</td>" +
                            "<td class='td-barcode font-weight-bold'>" + meter.barcode + "</td>" +
                            "<td>" + data.meter_type_name + "</td>" +
                            "<td>" + meter.create_date + "</td>" +
                        "</tr>";
                        packTable.find("tbody").append(newRow); // On "append" car le tri DESC est déjà géré en SQL
                    });

                    // Gérer l'état du bouton d'impression manuelle et l'auto-print
                    if (data.message === "box-full") {
                        // Afficher et lier les datas au bouton d'impression manuel
                        $("#manualPrintBtn").removeClass("d-none");
                        $("#manualPrintBtn").attr("data-meter", data.meter_type_name);
                        $("#manualPrintBtn").attr("data-box", data.box_number);

                        swal("Carton Plein !", "Impression de l'étiquette en cours...", "success");
                        printBox(data.meter_type_name, data.box_number);
                    } else {
                        // Cacher le bouton si c'est un nouveau carton ouvert
                        $("#manualPrintBtn").addClass("d-none");
                    }
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function () {
                showAlertFailed("Erreur de communication avec le serveur.");
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }

    // Fonction permettant de charger et d'afficher un carton depuis la BDD
    function loadBoxData(id_box) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            dataType: dataType,
            data: { function: "reopenBox", id_box: id_box },
            beforeSend: function () { $("#divLoadingcms").removeClass("d-none"); },
            success: function (data) {
                if (data.state === "f") {
                    showAlertFailed(data.message);
                } else if (data.state === "s") {
                    
                    // Remplir les informations de l'entête
                    $("#generalInfo").removeClass("d-none");
                    $(".meterTypeName").text(data.meter_type_name);
                    $(".boxNumber").text(data.box_number);
                    $(".packedQteBox").text(data.packed_box_qte);
                    $("#currentBoxId").val(data.id_box);

                    // Reconstruire le tableau
                    packTable.find("tbody").empty();
                    let totalMeters = data.all_meters.length;
                    
                    $.each(data.all_meters, function(index, meter) {
                        let rowNum = totalMeters - index; 
                        let newRow = "<tr class='table-success'>" +
                            "<td>" + rowNum + "</td>" +
                            "<td class='td-barcode font-weight-bold'>" + meter.barcode + "</td>" +
                            "<td>" + data.meter_type_name + "</td>" +
                            "<td>" + meter.create_date + "</td>" +
                        "</tr>";
                        packTable.find("tbody").append(newRow);
                    });

                    // Afficher et attribuer les données au bouton d'impression manuel
                    $("#manualPrintBtn").removeClass("d-none");
                    $("#manualPrintBtn").attr("data-meter", data.meter_type_name);
                    $("#manualPrintBtn").attr("data-box", data.box_number);
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function () {
                showAlertFailed("Erreur lors de la récupération des données du carton.");
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }

    function printBox(meterTypeName, boxNumber) {
        let qte = packTable.find("tbody tr").length;

        $("#printDiv .productName").text("COMPTEUR " + meterTypeName.toUpperCase());
        $("#printDiv .boxNumber").text("CARTON N°: " + boxNumber);
        $("#printDiv .qte").text("Quantité : " + qte + " Pièces");
        $("#printDiv .date").text(getDateTime());

        $("#printDiv .sn").empty();
        packTable.find('tbody tr .td-barcode').each(function () {
            $("#printDiv .sn").append($(this).text() + "<br>");
        });

        $("#qrcode").empty();
        new QRCode("qrcode", {
            text: boxNumber,
            width: 80,
            height: 80,
            correctLevel: QRCode.CorrectLevel.H
        });

        $("#printDiv").removeClass("d-none");
        
        printJS({
            printable: 'printDiv',
            type: 'html',
            targetStyles: ['*']
        });

        $("#printDiv").addClass("d-none");
        
        // IMPORTANT (Amélioration 3) : 
        // Nous retirons la réinitialisation de l'UI ici pour que le tableau reste 
        // affiché afin que le bouton "Impression manuelle" puisse retrouver les données.
        // Le tableau se videra automatiquement et se recréera au premier scan du NOUVEAU carton 
        // grâce à "packTable.find("tbody").empty()" exécuté au début du callback "success" de packMeter.
    }

    function showAlertFailed(msg) {
        $("#alertMessage").text(msg);
        qrAlert.removeClass("d-none");
        setTimeout(function() { qrAlert.addClass("d-none"); }, 4000);
    }

    function getDateTime() {
        let now = new Date();
        return now.toISOString().slice(0, 19).replace('T', ' ');
    }
});