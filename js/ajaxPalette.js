var dataType = "JSON";
var qrAlert = $("#qrAlert");
var packTable = $("#packTable");

$(document).ready(function () {
    loadMeterTypes();

    var barcodeStr = '';

    // Écoute du scan au clavier (Douchette)
    document.addEventListener('keypress', e => {
        if (e.target.tagName === "INPUT" && e.target.type !== "hidden") return;

        if (e.keyCode !== 13) {
            barcodeStr += e.key;
        } else {
            let meterTypeId = $("#meterTypeSelect").val();
            let scannedBox = barcodeStr.trim();

            if (!meterTypeId) {
                showAlertFailed("Veuillez d'abord sélectionner le Modèle pour la Palette !");
                barcodeStr = '';
                return;
            }

            // Vérification basique si c'est bien un carton scanné (ex: BX-SGM12-DL-01)
            if (!scannedBox.toUpperCase().startsWith("BX-")) {
                showAlertFailed("Erreur : Veuillez scanner le QR Code d'un CARTON fermé (Commence par BX-).");
                barcodeStr = '';
                return;
            }

            if (scannedBox !== '') {
                qrAlert.addClass("d-none");
                packBoxToPalette(scannedBox, meterTypeId);
            }

            barcodeStr = '';
        }
    });

    $("#manualPrintBtn").click(function () {
        let paletteId = $("#currentPaletteId").val();
        if (paletteId) {
            generateAndPrintPackingList(paletteId);
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
                        'data-contrat': item.contrat,
                        'data-nomenclature': item.nomenclature,
                        text: item.meter_type + " (Palette de " + item.qty_box_palette + " Cartons)"
                    }));
                });
            }
        });
    }

    function packBoxToPalette(boxNumber, meterTypeId) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            dataType: dataType,
            data: {
                function: "packBox",
                box_number: boxNumber,
                id_meter_type: meterTypeId
            },
            beforeSend: function () { $("#divLoadingcms").removeClass("d-none"); },
            success: function (data) {
                if (data.state === "already_packed") {
                    let currentUIRows = packTable.find("tbody tr").length;
                    if (currentUIRows === 0 && data.palette_status === "closed") {
                        swal({
                            title: "Carton déjà palettisé !",
                            text: data.message + "\nCette palette est déjà fermée. Voulez-vous l'ouvrir et la consulter ?",
                            icon: "info",
                            buttons: ["Non", "Oui, l'ouvrir"],
                        }).then((result) => {
                            if ((result === true) || (result && result.isConfirmed)) loadPaletteData(data.id_palette);
                        });
                    } else {
                        showAlertFailed(data.message);
                    }
                }
                else if (data.state === "f") {
                    showAlertFailed(data.message);
                }
                else if (data.state === "s") {
                    $("#generalInfo").removeClass("d-none");
                    $(".meterTypeName").text(data.meter_type_name);
                    $(".paletteNumber").text(data.palette_number);
                    $(".packedQtePalette").text(data.packed_palette_qte);
                    $("#currentPaletteId").val(data.id_palette);

                    packTable.find("tbody").empty();
                    let totalBoxes = data.all_boxes.length;

                    $.each(data.all_boxes, function (index, box) {
                        let rowNum = totalBoxes - index;
                        let newRow = "<tr class='table-info'>" +
                            "<td>" + rowNum + "</td>" +
                            "<td class='font-weight-bold'>" + box.box_number + "</td>" +
                            "<td>" + data.meter_type_name + "</td>" +
                            "<td>" + box.update_date + "</td>" +
                            "</tr>";
                        packTable.find("tbody").append(newRow);
                    });

                    if (data.message === "palette-full") {
                        swal("Palette Pleine", "La palette a atteint sa limite. Génération de la liste de colisage...", "success").then(() => {
                            generateAndPrintPackingList(data.id_palette);
                            clearUI();
                        });
                    } else {
                        // On s'assure que le bouton reste caché pendant le remplissage
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

    function loadPaletteData(id_palette) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            dataType: dataType,
            data: { function: "reopenPalette", id_palette: id_palette },
            beforeSend: function () { $("#divLoadingcms").removeClass("d-none"); },
            success: function (data) {
                if (data.state === "f") {
                    showAlertFailed(data.message);
                } else if (data.state === "s") {
                    $("#generalInfo").removeClass("d-none");
                    $(".meterTypeName").text(data.meter_type_name);
                    $(".paletteNumber").text(data.palette_number);
                    $(".packedQtePalette").text(data.packed_palette_qte);
                    $("#currentPaletteId").val(data.id_palette);

                    packTable.find("tbody").empty();
                    let totalBoxes = data.all_boxes.length;

                    $.each(data.all_boxes, function (index, box) {
                        let rowNum = totalBoxes - index;
                        let newRow = "<tr class='table-info'>" +
                            "<td>" + rowNum + "</td>" +
                            "<td class='font-weight-bold'>" + box.box_number + "</td>" +
                            "<td>" + data.meter_type_name + "</td>" +
                            "<td>" + box.update_date + "</td>" +
                            "</tr>";
                        packTable.find("tbody").append(newRow);
                    });

                    $("#manualPrintBtn").removeClass("d-none");
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function () {
                showAlertFailed("Erreur lors de la récupération des données de la palette.");
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }

    function generateAndPrintPackingList(id_palette) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            dataType: dataType,
            data: { function: "getPalettePrintData", id_palette: id_palette },
            beforeSend: function () { $("#divLoadingcms").removeClass("d-none"); },
            success: function (data) {
                if (data.state === "s") {
                    let selectedOption = $("#meterTypeSelect").find(':selected');
                    let contrat = selectedOption.attr('data-contrat');
                    let nomenclature = selectedOption.attr('data-nomenclature');

                    $(".printPaletteNumber").text("N° Palette : " + data.palette_number);
                    $(".printMeterName").text("Modèle : " + data.meter_type_name);
                    $(".printContrat").text("N° Contrat : " + contrat);
                    $(".printNomenclature").text("N° Nomenclature : " + nomenclature);
                    $(".printDate").text("Date : " + getDateTime().split(' ')[0]);

                    let printTableBody = $("#printTable tbody");
                    printTableBody.empty();

                    let totalMetersCount = 0;

                    $.each(data.boxes, function (index, box) {
                        let meterStr = box.meters.join(", "); // Concaténer les numéros de série
                        totalMetersCount += box.meters.length;

                        let tr = "<tr>" +
                            "<td style='border: 1px solid #000; padding: 6px;'>" + (index + 1) + "</td>" +
                            "<td style='border: 1px solid #000; padding: 6px; font-weight:bold;'>" + box.box_number + "</td>" +
                            "<td style='border: 1px solid #000; padding: 6px;'>" + box.meters.length + "</td>" +
                            "<td style='border: 1px solid #000; padding: 6px; font-family: monospace; text-align: justify;'>" + meterStr + "</td>" +
                            "</tr>";
                        printTableBody.append(tr);
                    });

                    $(".printTotalBoxes").text(data.boxes.length);
                    $(".printTotalMeters").text(totalMetersCount);

                    $("#printDiv").removeClass("d-none");

                    printJS({
                        printable: 'printDiv',
                        type: 'html',
                        targetStyles: ['*'],
                        documentTitle: 'Liste Colisage - ' + data.palette_number
                    });

                    $("#printDiv").addClass("d-none");
                } else {
                    showAlertFailed(data.message);
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function () {
                showAlertFailed("Erreur lors de la génération de la liste de colisage.");
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }

    function clearUI() {
        $("#generalInfo").addClass("d-none");
        $(".meterTypeName").text("");
        $(".paletteNumber").text("");
        $(".packedQtePalette").text("0/0");
        $("#currentPaletteId").val("");
        packTable.find("tbody").empty();
        $("#manualPrintBtn").addClass("d-none");
    }

    function showAlertFailed(msg) {
        $("#alertMessage").text(msg);
        qrAlert.removeClass("d-none");
        setTimeout(function () { qrAlert.addClass("d-none"); }, 5000);
    }

    function getDateTime() {
        let now = new Date();
        return now.toISOString().slice(0, 19).replace('T', ' ');
    }
});