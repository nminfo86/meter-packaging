var dataType = "JSON";
var qrAlert = $("#qrAlert");
var packTable = $("#packTable");

// --- VALIDATION CODE-BARRES : valeurs injectées une seule fois par index.php depuis Config.php ---
// Sécurité production : si la configuration est absente ou incomplète, on arrête tout avec un message
// clair plutôt que de valider les scans avec des valeurs indéfinies (ce qui laisserait passer ou
// rejetterait tous les codes-barres de façon silencieuse).
(function () {
    var cfg = window.APP_CONFIG;
    var valid = cfg &&
        Number.isInteger(cfg.barcodeLength) &&
        Array.isArray(cfg.validManufacturerCodes) && cfg.validManufacturerCodes.length > 0 &&
        Number.isInteger(cfg.productionYearMin) &&
        Number.isInteger(cfg.currentYear);
    if (!valid) {
        alert("Configuration manquante ou invalide : rechargez la page (F5) ou contactez le support.");
        throw new Error("APP_CONFIG missing or invalid");
    }
})();

var BARCODE_LENGTH = window.APP_CONFIG.barcodeLength;
var VALID_MANUFACTURER_CODES = window.APP_CONFIG.validManufacturerCodes;
var PRODUCTION_YEAR_MIN = window.APP_CONFIG.productionYearMin;
// Année courante du SERVEUR (2 chiffres) : évite de dépendre de l'horloge du PC d'emballage
var SERVER_CURRENT_YEAR = window.APP_CONFIG.currentYear;


function getCurrentShift() {
    var now = new Date();
    var h = now.getHours();

    function padDate(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    var today = padDate(now);
    var yesterday = padDate(new Date(now.getTime() - 86400000));
    var tomorrow = padDate(new Date(now.getTime() + 86400000));

    if (h >= 5 && h < 13) {
        return { name: "Équipe 1  |  05h → 13h", start_date: today, end_date: today, start_hour: 5, end_hour: 12 };
    } else if (h >= 13 && h < 21) {
        return { name: "Équipe 2  |  13h → 21h", start_date: today, end_date: today, start_hour: 13, end_hour: 20 };
    } else if (h >= 21) {
        return { name: "Équipe 3  |  21h → 05h", start_date: today, end_date: tomorrow, start_hour: 21, end_hour: 4 };
    } else { // h < 5
        return { name: "Équipe 3  |  21h → 05h", start_date: yesterday, end_date: today, start_hour: 21, end_hour: 4 };
    }
}

function loadTeamCount() {
    var shift = getCurrentShift();
    let selectedMeter = $("#meterTypeSelect").val();
    $.ajax({
        url: "php/DbStatistics.php",
        type: "POST",
        dataType: "JSON",
        data: {
            function: "getStatistics",
            id_meter_type: selectedMeter,
            start_date: shift.start_date,
            end_date: shift.end_date,
            start_hour: shift.start_hour,
            end_hour: shift.end_hour
        },
        success: function (data) {
            if (data.state === "s") {
                var total = 0;
                $.each(data.data, function (i, row) { total += parseInt(row.total_meters); });
                $("#teamMeterCount").text(total);
                $("#teamShiftName").text(shift.name);
            }
        }
    });
}

$(document).ready(function () {
    loadMeterTypes();
    loadTeamCount();   // ← ADD THIS

    $('#meterTypeSelect').on('change', function() {
    loadTeamCount();
});
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

            // --- VALIDATION STRICTE DU CODE-BARRES (longueur, fabricant, année) ---
            // Bloque ici tout code-barres mal formé, avant même la vérification du modèle.
            if (barcode.length !== BARCODE_LENGTH) {
                showAlertFailed("Erreur : Le code-barres doit contenir exactement " + BARCODE_LENGTH + " chiffres (reçu : " + barcode.length + ").");
                barcodeStr = '';
                return;
            }

            let manufacturerCode = barcode.substring(0, 2);
            if (VALID_MANUFACTURER_CODES.indexOf(manufacturerCode) === -1) {
                showAlertFailed("Erreur : Fabricant inconnu (code " + manufacturerCode + ").");
                barcodeStr = '';
                return;
            }

            let yearCode = barcode.substring(2, 4);
            let scannedYear = parseInt(yearCode, 10);
            // Année du serveur (cohérent avec DbServices::validateBarcodeFormat), pas l'horloge du PC
            let maxYear = SERVER_CURRENT_YEAR + 1; // tolère la production anticipée de l'année suivante
            if (isNaN(scannedYear) || scannedYear < PRODUCTION_YEAR_MIN || scannedYear > maxYear) {
                showAlertFailed("Erreur : Année de production incorrecte (" + yearCode + ").");
                barcodeStr = '';
                return;
            }
            // --- FIN VALIDATION LONGUEUR / FABRICANT / ANNÉE ---

            // --- NOUVELLE VÉRIFICATION DU MODÈLE DE COMPTEUR ---
            let selectedOption = $("#meterTypeSelect").find(':selected');

            // On convertit en chaîne de caractères (String) pour s'assurer de pouvoir vérifier sa longueur
            let expectedModelCode = String(selectedOption.attr('data-model-code'));
            let selectedModelName = selectedOption.text().split(' (')[0]; // Récupère le nom sans la parenthèse

            // On calcule le nombre de caractères du code attendu (ex: "1" = 1, "55" = 2)
            let codeLength = expectedModelCode.length;

            // Extrait les caractères en commençant par le 5ème (index 4).
            // Si expectedModelCode est "1", il extrait 1 caractère (index 4 à 5).
            // Si expectedModelCode est "55", il extrait 2 caractères (index 4 à 6).
            let scannedModelCode = barcode.substring(4, 4 + codeLength);

            if (scannedModelCode !== expectedModelCode) {
                showAlertFailed("Erreur : Ce compteur n'est pas un " + selectedModelName + " ! (Code trouvé : " + scannedModelCode + ", Code attendu : " + expectedModelCode + ")");
                barcodeStr = ''; // On vide la variable pour le prochain scan
                return; // On bloque l'exécution ici, rien ne sera envoyé au serveur
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
        let order = $(this).attr("data-order"); // NOUVEAU pour l'ordre du carton dans la palette
        if (meterName && boxNum) {
            printBox(meterName, boxNum, order);
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
                        'data-qty-palette': item.qty_box_palette,
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
                // --- NOUVEAU : Rejet serveur d'un code-barres mal formé (garde-fou ultime) ---
                if (data.state === "invalid_barcode") {
                    showAlertFailed(data.message);
                }
                else if (data.state === "already_packed") {
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
                        printBox(data.meter_type_name, data.box_number, data.order_in_palette); // <-- Ajouter data.order_in_palette
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
                    loadTeamCount();  // ← ADD THIS (real-time update after every scan)
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
                    $("#manualPrintBtn").attr("data-order", data.order_in_palette); // <--- NOUVELLE ATTRIBUTION POUR L'ORDRE DU CARTON DANS LA PALETTE
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function () {
                showAlertFailed("Erreur lors de la récupération des données du carton.");
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }

    function printBox(meterTypeName, boxNumber, orderInPalette) {
        let qte = packTable.find("tbody tr").length;

        // 1. Ajouter le N° de l'ordre 
        // let orderString = orderInPalette ? " - N° " + orderInPalette : "";
        let orderString = orderInPalette;

        // 2. Garder BX, l'année et la série (ex: BX-26-00586)
        let boxParts = boxNumber.split('-');
        let shortBoxNumber = boxNumber;
        if (boxParts.length >= 2) {
            // boxParts[0] correspond à "BX"
            shortBoxNumber = boxParts[0] + "-" + boxParts[boxParts.length - 2] + "-" + boxParts[boxParts.length - 1];
        }

        // Impression à l'écran
        $("#printDiv .productName").text("COMPTEUR : " + meterTypeName.toUpperCase());
        $("#printDiv .boxNumberPrint").text(shortBoxNumber); // On utilise le nom court !
        $("#printDiv .boxOrder").text(orderString); // On utilise le nom court !
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