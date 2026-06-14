var dataType = "JSON";
var qrAlert = $("#qrAlert");
var packTable = $("#packTable");

$(document).ready(function () {
    $("#qrProduct").focus();
    loadMeterTypes();

    var barcodeStr = '';

    // Détection de la douchette
    document.addEventListener('keypress', e => {
        if (e.target.nodeName === "INPUT" && e.target.id !== "qrProduct") return;

        if (e.keyCode !== 13) {
            barcodeStr += e.key;
        } else {
            let meterTypeId = $("#meterTypeSelect").val();
            let barcode = barcodeStr.trim();
            
            // 1. Vérification du choix de modèle
            if (!meterTypeId) {
                showAlertFailed("Veuillez d'abord sélectionner un Modèle !");
                barcodeStr = '';
                return;
            }

            // 2. Validation stricte : uniquement des chiffres
            // Cela bloque les scans si le clavier bascule en AZERTY ou majuscules
            if (!/^\d+$/.test(barcode)) {
                showAlertFailed("Erreur : Le code barre doit contenir uniquement des chiffres. Veuillez vérifier la langue de votre clavier (Caps Lock / MAJ).");
                barcodeStr = '';
                $("#qrProduct").val(''); // On vide l'input
                return;
            }

            // 3. Traitement si tout est OK
            if (barcode !== '') {
                qrAlert.addClass("d-none");
                packMeter(barcode, meterTypeId);
            }
            
            barcodeStr = '';
            $("#qrProduct").val('');
        }
    });

    $("#meterTypeSelect").change(function() {
        $("#qrProduct").focus();
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
                if (data.state === "f") {
                    showAlertFailed(data.message);
                } else if (data.state === "s") {
                    
                    $("#generalInfo").removeClass("d-none");
                    $(".meterTypeName").text(data.meter_type_name);
                    $(".boxNumber").text(data.box_number);
                    $(".packedQteBox").text(data.packed_box_qte);
                    $("#currentBoxId").val(data.id_box);

                    let rowCount = packTable.find("tbody tr").length + 1;
                    
                    let newRow = "<tr class='table-success'>" +
                        "<td>" + rowCount + "</td>" +
                        "<td class='td-barcode font-weight-bold'>" + data.barcode + "</td>" +
                        "<td>" + data.meter_type_name + "</td>" +
                        "<td>" + data.date + "</td>" +
                    "</tr>";
                    
                    packTable.find("tbody").prepend(newRow);

                    if (data.message === "box-full") {
                        swal("Carton Plein !", "Impression de l'étiquette en cours...", "success");
                        printBox(data.meter_type_name, data.box_number);
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

    function printBox(meterTypeName, boxNumber) {
        let qte = packTable.find("tbody tr").length;

        $("#printDiv .productName").text("COMPTEUR " + meterTypeName.toUpperCase());
        $("#printDiv .boxNumber").text("CARTON N°: " + boxNumber);
        $("#printDiv .qte").text("Quantité : " + qte + " Pièces");
        $("#printDiv .date").text(getDateTime());

        // Récupérer tous les codes barres de la table pour l'étiquette
        $("#printDiv .sn").empty();
        packTable.find('tbody tr .td-barcode').each(function (index) {
            $("#printDiv .sn").append($(this).text() + "<br>");
        });

        // Générer le QR Code pour le carton entier (contenant le numéro du carton)
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
        
        // Réinitialiser l'interface pour le prochain carton
        packTable.find("tbody").empty();
        $("#generalInfo").addClass("d-none");
        $("#currentBoxId").val('');
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