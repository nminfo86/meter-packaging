/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


//**************************** PARAMS************************************/
//******************** AJAX PARAMS********/
var dataType = "JSON";

//*********************** ************** ********
var qrAlert = $("#qrAlert");
var packTable = $("#packTable");
var numberOfSNLabel = 7;

$(document).ready(function () {

    $("#qrProduct").focus();
    $("#qrProduct").val('');

    var QR = '';
    var printing = false;
    var QRStatus = '';

    $("#manualPrint").click(function (event) {
        event.preventDefault();
        printBox();
        //
    });


    document.addEventListener('keypress', e => {
        //usually scanners throw an 'Enter' key at the end of read

        if (e.keyCode !== 13) {
            QR += e.key;
        } else {
            initAlert(qrAlert);
//            QR = $("#qrProduct").val();
//            alert(QR);
            //Check if a valid QrCode
            if (isValidqrCode(QR)) {
                //Check if not a sub Assumbly product
                if (!isSubAssumbly(QR)) {
                    //Check if last mouvement status is OK
                    QRStatus = getTestStatus(lastStatusCheckStation, QR);

                    if (QRStatus === 'OK') {
                        //Check if product is not packed
                        if (getTestStatus('Packaging', QR) !== 'OK') {

                            //Get the Box number to pack in and start Packaging Process
                            getBox(QR);

                        } else {
                            checkProductHaveClosedBox(QR);
                        }

                    } else {
                        if (QRStatus === msgDatabaseConnexion) {
                            showAlertFailed(qrAlert, msgDatabaseConnexion);
                        } else {

//                            showAlertFailed(qrAlert, msgLastStatusNotValid);
                            getProductLastMvt(QR);
                        }
                    }

                } else {
                    showAlertFailed(qrAlert, msgSubAssumbly);
                }
            } else {
                showAlertFailed(qrAlert, msgQrCodeValidation);
            }
            QR = '';
            $("#qrProduct").val('');
        }
    })

// ************* FUNCTIONS ******************//

//This function return the box that the product will be packed in.
    function getBox(QR) {

        var PO = splitQrcode(QR, "po");
        var name = splitQrcode(QR, "name");
        var sn = splitQrcode(QR, "sn");

        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            jsonp: false,
            dataType: dataType,
            data: "function=getBoxOfPackaging&PO=" + PO,
            beforeSend: function () {
                $("#divLoadingcms").removeClass("d-none");
            },
            success: function (data) {
                if (data.state === "f") {
                    showAlertFailed(qrAlert, data.message);
                } else {

                    var id_box = data[0].id;

                    if ((data[0].status === 'open') && (packTable.find("tr").length <= 1)) {

                        fillPackedProducts(id_box, data[0].boxNumber, QR, PO, sn, name, true);
                    } else {

                        packProduct(id_box, QR, PO, sn, name);
                    }
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function (jqXHR, exception) {
                showAlertFailed(qrAlert, getAjaxErrorMessage(jqXHR, exception));
                $("#divLoadingcms").addClass("d-none");
            }
        });

    }

    function checkProductHaveClosedBox(QR) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            jsonp: false,
            dataType: dataType,
            data: "function=getBoxOfPackedProduct&QR=" + QR,
            beforeSend: function () {
                $("#divLoadingcms").removeClass("d-none");
            },
            success: function (data) {
                if (data.state === "f") {
                    showAlertFailed(qrAlert, data.message);
                } else {

                    var id_box = data[0].id;

                    if ((data[0].status === 'closed')) {

                        $("#manualPrint").removeClass("d-none");
                        $("#printManually").attr('value', '1');

                        fillPackedProducts(id_box, data[0].boxNumber, QR, '', '', '', false);
                    } else {
                        showAlertFailed(qrAlert, msgisPacked + " - Carton N° " + data[0].boxNumber);
                    }

                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function (jqXHR, exception) {
                showAlertFailed(qrAlert, getAjaxErrorMessage(jqXHR, exception));
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }

    function packProduct(id_box, QR, PO, sn, name) {

        if (($("#po").val() !== '') && (PO !== $("#po").val())) {
            swal("Attention", "Produit appartien à un autre OF !. Si vous désirez emballer cet OF, Cliquer sur OK et re-scanner vos produits.", 'warning')

                    .then(() => {
                        window.location = "/";
                    });
        } else {

            if ($("#printManually").val() === '1') {
                swal("Info", "Veillez imprimer le carton manuallement", "warning")
            } else {
                $.ajax({
                    url: "php/DbServices.php",
                    type: "POST",
                    jsonp: false,
                    dataType: dataType,
                    data: "function=packProduct&id_box=" + id_box + "&QR=" + QR + "&PO=" + PO + "&sn=" + sn + "&name=" + name,
                    beforeSend: function () {
                        $("#divLoadingcms").removeClass("d-none");
                    },
                    success: function (data) {
                        if (data.state === "f") {
                            showAlertFailed(qrAlert, data.message);
                        } else {
                            if (data.state === "s") {

                                //remove css from table rows
                                initTable(packTable);
                                //Fill general infos
                                fillGeneralInfos(splitQrcode(QR, "po"), splitQrcode(QR, "name"), data.box, splitQrcode(QR, "qte"), data.packed_po_qte, data.packed_box_qte)

                                packTable.find("tr:first").after(
                                        "<tr class='table-success'>" +
                                        "<td>" + (packTable.find("tr").length) + "</td>" +
                                        "<td>" + PO + "</td>" +
                                        "<td class='td-sn'>" + sn + "</td>" +
                                        "<td>" + getDateTime() + "</td>" +
                                        "</tr>"
                                        )

                                if (data.message === msgBoxFull) {

                                    printBox();
                                }
                            }
                        }
                        $("#divLoadingcms").addClass("d-none");
                    },
                    error: function (jqXHR, exception) {
                        showAlertFailed(qrAlert, getAjaxErrorMessage(jqXHR, exception));
                        $("#divLoadingcms").addClass("d-none");
                    }
                });
            }
        }
    }

    function fillPackedProducts(id_box, boxNumber, QR, PO, sn, name, pack) {

        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            jsonp: false,
            dataType: dataType,
            data: "function=getPackedProductsOfBox&id_box=" + id_box,
            beforeSend: function () {
                $("#divLoadingcms").removeClass("d-none");
            },
            success: function (data) {
                if (data.state === "f") {
                    if (data.message === noDataFound) {
                        packProduct(id_box, QR, PO, sn, name);
                    } else {
                        showAlertFailed(qrAlert, data.message);
                    }
                } else {

                    packTable.find("tr:gt(0)").remove();
                    fillGeneralInfos(splitQrcode(QR, "po"), splitQrcode(QR, "name"), boxNumber, splitQrcode(QR, "qte"), "", "")

                    for (var i = 0; i < data.length; i++) {

                        packTable.append(
                                "<tr>" +
                                "<td>" + (data.length - i) + "</td>" +
                                "<td>" + data[i].PO + "</td>" +
                                "<td class='td-sn'>" + data[i].SerialNo + "</td>" +
                                "<td>" + data[i].CreateTime + "</td>" +
                                "</tr>");
                    }
                    if (pack === true) {
                        packProduct(id_box, QR, PO, sn, name);
                    }
                }
                $("#divLoadingcms").addClass("d-none");

            },
            error: function (jqXHR, exception) {
                showAlertFailed(qrAlert, getAjaxErrorMessage(jqXHR, exception));
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }

    function getTestStatus(station, QR) {
        var testStatus = '';
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            jsonp: false,
            dataType: dataType,
            async: false,
            data: "function=getTestStatus&station=" + station + "&QR=" + QR,
            beforeSend: function () {
                $("#divLoadingcms").removeClass("d-none");
            },
            success: function (data) {
                if (data.state === "f") {
                    if (data.message === noDataFound) {
                        testStatus = noDataFound;
                    } else {
                        testStatus = msgDatabaseConnexion;
                    }
                } else {
                    if (data[0].TestStatus === "OK") {
                        testStatus = "OK";
                    }
                    if (data[0].TestStatus === "NOK") {
                        testStatus = "NOK";
                    }
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function (jqXHR, exception) {
                showAlertFailed(qrAlert, getAjaxErrorMessage(jqXHR, exception));
                $("#divLoadingcms").addClass("d-none");
            }
        });
        return testStatus;
    }

    function getProductLastMvt(QR) {
        $.ajax({
            url: "php/DbServices.php",
            type: "POST",
            jsonp: false,
            dataType: dataType,
            async: false,
            data: "function=getProductLastMvt&QR=" + QR,
            beforeSend: function () {
                $("#divLoadingcms").removeClass("d-none");
            },
            success: function (data) {
                if (data.state === "f") {
                    showAlertFailed(qrAlert, data.message);
                } else {
                    showAlertFailed(qrAlert, msgLastStatusNotValid + " - " + data[0].Station + " " + data[0].TestStatus);
                }
                $("#divLoadingcms").addClass("d-none");
            },
            error: function (jqXHR, exception) {
                showAlertFailed(qrAlert, getAjaxErrorMessage(jqXHR, exception));
                $("#divLoadingcms").addClass("d-none");
            }
        });
    }
    //This function tests whether the scanned qr Code is a valid contactor QR or not
    function isValidqrCode(QR) {
        var regexp = new RegExp(/^([a-zA-Z0-9]+#)+([0-9]+#)+([a-zA-Z0-9]+#)+([0-9]+#)+([0-9/:])/);
        if (regexp.test(QR)) {
            return true;
        } else {
            return false;
        }
    }

    function isSubAssumbly(QR) {
        var regexp = new RegExp(/^93272/);
        if (regexp.test(QR)) {
            return true;
        } else {
            return false;
        }
    }

    function splitQrcode(QR, info) {
        var fields = QR.split('#');

        switch (info) {
            case "po":
                return fields[0];
                break;
            case "qte":
                return fields[1];
                break;
            case "name":
                var contactor = fields[2].slice(0, 8);
                var calibre = fields[2].slice(9, 11);
                var voltage = fields[2].slice(11, 14);

                contactor = contactor.replace(contactor, "Contacteur ");
                calibre = calibre.replace(calibre, "D" + calibre + "-");
                voltage = voltage.replace(voltage, voltage + "V ");

                return contactor + calibre + voltage;
                break;
            case "sn":
                return fields[3];
                break;
            case "datetime":
                return fields[4];
                break;
            default:
        }

    }

    function printBox() {

        fillPrintLabel();

        $("#printDiv").removeClass("d-none");
        packTable.find("tr:gt(0)").remove();
        $("#po").attr('value', '');
        $("#box").attr('value', '');
        $("#printManually").attr('value', '');
        $("#manualPrint").addClass("d-none");
//        printJS('printDiv', 'html');
        printJS({
            printable: 'printDiv',
            type: 'html',
            targetStyles: ['*']
        })

        $("#printDiv .sn").text("");
        $("#printDiv").addClass("d-none");
        
        //Reset #qrcode div to prevent generate more than one Qr COde 
        $("#qrcode").attr("title",'');
         $("#qrcode").empty();
         //

    }

    function fillPrintLabel() {


        var productName = $("#generalInfo .name").text(); //Contacteur DXX-XXXV ex : Contactuer D12-220V
         var contacteur = productName.slice(0,11);
        var  calibre= productName.slice(11,20);


        var po = $("#generalInfo .PO").text();
        var box = $("#generalInfo .box").text();
        var qte = (packTable.find("tr").length - 1);

        $("#printDiv .productName").text(contacteur);
        $("#printDiv .calibre").text(calibre);
        $("#printDiv .boxNumber").text(box);
        $("#printDiv .qte").text(qte);

//Fill Serial number in label
        var i = 0;
        j = 1;
        packTable.find('tr .td-sn').each(function () {
            i++;
            if (j === numberOfSNLabel) {
                $("#printDiv .sn").append($(this).text() + "<br>");
                j = 1;
            } else {
                $("#printDiv .sn").append($(this).text() + (i === (packTable.find("tr").length - 1) ? '' : ' - '));
                j++;
            }
        });

        $("#printDiv .date").text(getDateTime());

        var qrcode = new QRCode("qrcode", {
            width: 71,
            height: 71,
            correctLevel: QRCode.CorrectLevel.H
        });
        qrcode.clear();
        qrcode.makeCode( box);

    }

    function fillGeneralInfos(po, name, box, poQte, packedPoQte, packedBoxQte) {

        $("#po").attr('value', po);
        $("#box").attr('value', box);

        $("#generalInfo .PO").text(po);
        $("#generalInfo .name").text(name);
        $("#generalInfo .qtePo").text(poQte);
        $("#generalInfo .packedQtePO").text(packedPoQte);

        $("#generalInfo .box").text(box);
        $("#generalInfo .packedQteBox").text(packedBoxQte);
    }

    function initTable(table) {

        table.find("tr[class='table-success']").removeClass("table-success");
    }
});
