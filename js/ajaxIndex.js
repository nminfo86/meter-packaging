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
                showAlertFailed("Erreur BarreCode. Vérifier la langue de votre clavier.");
                barcodeStr = '';
                return;
            }

            // --- NOUVELLE VÉRIFICATION DU MODÈLE DE COMPTEUR ---
            let selectedOption = $("#meterTypeSelect").find(':selected');
            let expectedModelCode = selectedOption.attr('data-model-code');
            let selectedModelName = selectedOption.text().split(' (')[0]; // Récupère le nom sans la parenthèse

            // On s'assure que le code fait au moins 5 caractères de long pour éviter un bug
            if (barcode.length >= 5) {
                // charAt(4) cible le 5ème caractère, car l'indexation commence à 0 (0,1,2,3,4)
                let scannedModelCode = barcode.charAt(4);

                if (scannedModelCode !== expectedModelCode) {
                    showAlertFailed("Erreur : Ce compteur n'est pas un " + selectedModelName + " ! (Code trouvé : " + scannedModelCode + ", Code attendu : " + expectedModelCode + ")");
                    barcodeStr = ''; // On vide la variable pour le prochain scan
                    return; // On bloque l'exécution ici, rien ne sera envoyé au serveur
                }
            } else {
                showAlertFailed("Erreur : Code barre invalide (trop court).");
                barcodeStr = '';
                return;
            }
            // --- FIN DE LA VÉRIFICATION ---

            if (barcode !== '') {
                qrAlert.addClass("d-none");
                packMeter(barcode, meterTypeId);
            }

            barcodeStr = '';
        }
    });

    // Action pour le bouton d'impression manuelle (Amélioration 3)
    $("#manualPrintBtn").click(function () {
        let meterName = $(this).attr("data-meter");
        let boxNum = $(this).attr("data-box");
        if (meterName && boxNum) {
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
                        'data-model-code': item.model_code,
                        'data-contrat': item.contrat,            // NOUVEAU
                        'data-nomenclature': item.nomenclature,  // NOUVEAU
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
                if (data.state === "already_packed") {
                    let currentUIRows = packTable.find("tbody tr").length;
                    if (currentUIRows === 0 && data.box_status === "closed") {
                        swal({
                            title: "Compteur déjà emballé !",
                            text: data.message + "\nCe carton est déjà fermé. Voulez-vous l'ouvrir ?",
                            icon: "warning",
                            buttons: ["Non", "Oui, l'ouvrir"],
                        }).then((result) => {
                            if ((result === true) || (result && result.isConfirmed)) loadBoxData(data.id_box);
                        });
                    } else {
                        showAlertFailed(data.message);
                    }
                }
                // --- NOUVEAU : Gestion de la séquence brisée ---
                else if (data.state === "sequence_broken") {
                    swal({
                        title: "Séquence Brisée !",
                        text: data.message + "\n\nLe système attendait le N° " + data.expected + ".\nVoulez-vous le déclarer en attente (manquant) ?",
                        icon: "warning",
                        buttons: ["Annuler", "Oui, déclarer en attente"],
                        dangerMode: true,
                    }).then((willDeclare) => {
                        if (willDeclare) {
                            // On passe le code scanné original pour pouvoir le re-scanner automatiquement
                            declareWaitMeter(data.expected, meterTypeId, barcode);
                        } else {
                            showAlertFailed("Opération annulée. Scannez le compteur attendu (" + data.expected + ").");
                        }
                    });
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

                    packTable.find("tbody").empty();
                    let totalMeters = data.all_meters.length;

                    $.each(data.all_meters, function (index, meter) {
                        let rowNum = totalMeters - index;

                        // --- NOUVEAU : Coloration selon le statut ---
                        let rowClass = meter.status === 'wait' ? 'table-warning text-danger' : 'table-success';
                        let statusIcon = meter.status === 'wait' ? ' <i class="fas fa-exclamation-triangle"></i> (Attente)' : '';

                        let newRow = "<tr class='" + rowClass + "'>" +
                            "<td>" + rowNum + "</td>" +
                            "<td class='td-barcode font-weight-bold'>" + meter.barcode + statusIcon + "</td>" +
                            "<td>" + data.meter_type_name + "</td>" +
                            "<td>" + meter.create_date + "</td>" +
                            "</tr>";
                        packTable.find("tbody").append(newRow);
                    });

                    // Gestion des différents cas de fermeture/attente
                    if (data.message === "box-full") {
                        printBox(data.meter_type_name, data.box_number);
                        clearUI();
                    } else if (data.message === "box-full-wait") {
                        swal("Carton mis en pause", "Ce carton est plein, mais il contient des compteurs en attente. Mettez-le de côté. L'étiquette ne sera pas imprimée.", "info");
                        $("#manualPrintBtn").addClass("d-none");
                        clearUI();
                    } else if (data.message === "wait-resolved") {
                        swal("Compteur Régularisé", "Le compteur manquant a été réintégré à son carton !", "success");
                        $("#manualPrintBtn").addClass("d-none");
                    } else {
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

    // NOUVELLE FONCTION : Déclare le compteur et re-scanne l'actuel
    function declareWaitMeter(expectedBarcode, meterTypeId, originalScannedBarcode) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            dataType: dataType,
            data: {
                function: "declareWaitMeter",
                expected_barcode: expectedBarcode,
                id_meter_type: meterTypeId
            },
            beforeSend: function () { $("#divLoadingcms").removeClass("d-none"); },
            success: function (data) {
                if (data.state === "s") {
                    swal("Déclaré !", "Le compteur " + expectedBarcode + " a bien été mis en attente.", "success");

                    // MAGIE UX : Une fois le compteur manquant déclaré, on relance automatiquement
                    // le scan du compteur que l'opérateur tenait dans la main (originalScannedBarcode).
                    setTimeout(function () {
                        packMeter(originalScannedBarcode, meterTypeId);
                    }, 1200);

                } else {
                    showAlertFailed(data.message);
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function () {
                showAlertFailed("Erreur lors de la déclaration en attente.");
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

                    $.each(data.all_meters, function (index, meter) {
                        let rowNum = totalMeters - index;

                        // --- NOUVEAU : Gestion de la coloration et du statut en fonction de la BDD ---
                        let rowClass = meter.status === 'wait' ? 'table-warning text-danger' : 'table-success';
                        let statusIcon = meter.status === 'wait' ? ' <i class="fas fa-exclamation-triangle"></i> (Attente)' : '';

                        let newRow = "<tr class='" + rowClass + "'>" +
                            "<td>" + rowNum + "</td>" +
                            "<td class='td-barcode font-weight-bold'>" + meter.barcode + statusIcon + "</td>" +
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

        $("#printDiv .productName").text("COMPTEUR : " + meterTypeName.toUpperCase());
        $("#printDiv .boxNumberPrint").text(boxNumber);
        $("#printDiv .qte").text("QTE : " + qte + " PCS");
        $("#printDiv .date").text(getDateTime());

        // 1. Ajouter le Contrat et la Nomenclature
        // Vous pouvez récupérer ces données dynamiquement depuis l'option sélectionnée
        let selectedOption = $("#meterTypeSelect").find(':selected');
        let contrat = selectedOption.attr('data-contrat');
        let nomenclature = selectedOption.attr('data-nomenclature');  

         $("#printDiv .contrat").text("N° Contrat : " + contrat);
        $("#printDiv .nomenclature").text("N° Nomenclature : " + nomenclature);

        // 2. Extraire, nettoyer et trier tous les codes-barres scannés
        let barcodes = [];
        packTable.find('tbody tr .td-barcode').each(function () {
            // On nettoie le texte pour enlever l'éventuelle mention "(Attente)"
            let text = $(this).text().replace('(Attente)', '').trim();
            if (text) barcodes.push(text);
        });

        // Tri numérique/alphabétique pour garantir d'avoir le vrai premier et dernier,
        // même si l'opérateur a scanné dans le désordre ou régularisé un compteur manquant.
        barcodes.sort((a, b) => a.localeCompare(b));

        if (barcodes.length > 0) {
            let firstBarcodeValue = barcodes[0];
            let lastBarcodeValue = barcodes[barcodes.length - 1];

            // 3. Génération des codes-barres 1D
            JsBarcode("#firstBarcode", firstBarcodeValue, {
                format: "CODE128", // Format très fiable pour les numéros de série industriels
                displayValue: true, // Affiche les chiffres (ex: 852610000008) sous les barres
                fontSize: 17,
                fontOptions: "bold",
                height: 50,
                width: 2.2,
                margin: 0
            });

            JsBarcode("#lastBarcode", lastBarcodeValue, {
                format: "CODE128",
                displayValue: true,
                fontSize: 17,
                fontOptions: "bold",
                height: 50,
                width: 2.2,
                margin: 0
            });
        }

        // 4. Génération du QR Code pour le numéro de carton
        $("#qrcode").empty();
        new QRCode("qrcode", {
            text: boxNumber,
            width: 90,
            height: 90,
            correctLevel: QRCode.CorrectLevel.H
        });

        $("#printDiv").removeClass("d-none");

        printJS({
            printable: 'printDiv',
            type: 'html',
            targetStyles: ['*']
        });

        $("#printDiv").addClass("d-none");
    }


    // Fonction pour remettre l'interface à zéro
    function clearUI() {
        $("#generalInfo").addClass("d-none"); // Cache les infos du carton
        $(".meterTypeName").text("");
        $(".boxNumberPrint").text("");
        $(".packedQteBox").text("0/0");
        $("#currentBoxId").val("");

        packTable.find("tbody").empty(); // Vide le tableau

        $("#manualPrintBtn").addClass("d-none"); // Cache le bouton d'impression manuel
    }

    function showAlertFailed(msg) {
        $("#alertMessage").text(msg);
        qrAlert.removeClass("d-none");
        setTimeout(function () { qrAlert.addClass("d-none"); }, 4000);
    }

    function getDateTime() {
        let now = new Date();
        return now.toISOString().slice(0, 19).replace('T', ' ');
    }
});