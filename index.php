
<?php
require_once (__DIR__ . "/php/functions.php");
require_once (__DIR__ . "/php/DbServices.php");
//confirmLoggedIn();
//accessControl("admin");
?>
<html>
<?php include "includes/head.php"; ?> <!-- head -->

    <body id="Admin panel">

        <!--Start Header-->
<?php include "includes/header.php"; ?> <!-- header -->
        <!--End Header-->
        <section class="container">


            <div class="welcome-user">
                <div id="inputDiv" class="mt-5 mb-3">
                    <input id="qrProduct" class="form-control form-control-lg col-8 m-auto text-center d-none" type="text" placeholder="Scanner un produit" >
                    <input id="po" type="text"  value="" class="d-none">
                    <input id="box" type="text"  value="" class="d-none">
                    <input id="printManually" type="text"  value="" class="d-none">
                </div>
                <div class="alert alert-warning alert-dismissible d-none mt-5 text-center col-8 m-auto" role="alert" id="qrAlert" 
                     style="font-weight: 500; font-size: 25px;">
                    <strong>Holy guacamole!</strong> You should check in on some of those fields below.
                    <button type="button"  class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <!--<button type="button" onclick="printJS('printDiv', 'html')">Print Form</button>-->

            </div>
            <div id="generalInfo" class="mb-3">
                <div class="row mb-2">
                    <h5 class="col-3">OF : <span class="PO"></span></h5> 
                    <h5 class="col-3"><span class="name"></span></h5> 
                    <h5 class="col-3">Qte Ordre : <span class="qtePo"></span></h5>
                    <h5 class="col-3">Produits emballés : <span class="packedQtePO"></span></h5>
                </div>
                <div class="row">
                    <h5 class="col-4">N° Carton : <span class="box"></span></h5> 
                    <h5 class="col-4 ">Qte emballé : <span class="packedQteBox"></span></h5>
                    <button id="manualPrint" class="btn btn-sm btn-success d-none" style="margin-left: 10%;"><i class="fas fa-print"> </i> Impression Manuel</button>
                </div>
            </div>
            <div>
                <table id ="packTable" class='table table-hover table-responsive-md table-sm'>
                    <thead class="thead-light">
                        <tr>
                            <th>N°</th>
                            <th class="">OF</th>
                            <th>Numéro de Série</th>
                            <th class="">Date</th>
                        </tr>
                    </thead>
                </table>
            </div>
            <!--Start Print Div-->
            <div id="printDiv" class="d-none">
                <!--PO and Product Name-->    
                <!--<div class="row ml-1 mb-2">-->
                <h4 class="productName"></h4>
                <h4 class="calibre"></h4>
                
                <h4 class="boxNumber"></h4>
                <div id="qrcode"></div>
                <h5 class="sn"></h5>
<!--                <h5 class="sn">
                    00001 - 02598 - 22674 - 05108 - 09856 - 00001 - 02598<br>
                    00001 - 02598 - 22674 - 05108 - 09856 - 00001 - 02598<br>
                    00001 - 02598 - 22674 - 05108 - 09856 - 00001 - 02598<br>
                    00001 - 02598 - 22674 - 05108 - 09856 - 00001 - 02598<br>
                    00001 - 02598 - 22674 - 05108 - 09856 - 00001 - 02598<br>
                    00001 - 02598 - 22674 - 05108 - 09856<br>
                </h5>-->
                <h4 class="qte" ></h4>
                <!--Date Time-->
                <h4 class="date"></h4>
                <img id ="imgLabel" src="images/misc/label2.bmp">
            </div>
            <!--End Print Div-->
        </section>

        <!--Start Footer-->
<?php include "includes/footer.php"; ?>
        <!--Start Footer-->

<?php include "includes/leg.php"; ?> <!-- leg-->
        <script src="js/ajaxIndex.js?v=<?= filemtime('js/ajaxIndex.js') ?>"></script>
    </body>

</html>