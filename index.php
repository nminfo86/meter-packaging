<?php
require_once (__DIR__ . "/php/functions.php");
require_once (__DIR__ . "/php/DbServices.php");
?>
<html>
<?php include "includes/head.php"; ?>

<body id="Meter">
    <?php include "includes/header.php"; ?>
    <section class="container mt-4">

        <div class="welcome-user text-center">
            <div class="row justify-content-center mb-3">
                <div class="col-md-8 d-flex justify-content-center align-items-center">
                    <select id="meterTypeSelect" class="form-control form-control-lg text-center w-75" style="border: 2px solid #007bff; font-weight: bold;">
                        <option value="" disabled selected>-- COMPTEUR - Sélectionnez le Type --</option>
                    </select>
                    <button id="manualPrintBtn" class="btn btn-success btn-lg ml-3 d-none" title="Imprimer l'étiquette du carton fermé">
                        <i class="fas fa-print"></i> Imprimer
                    </button>
                </div>
            </div>

            <div id="inputDiv" class="mb-3">
                <!-- <input id="qrProduct" class="form-control form-control-lg col-8 m-auto text-center" type="text" placeholder="Scanner le code barre du compteur"> -->
                <input id="currentBoxId" type="hidden" value="">
            </div>
            
            <div class="alert alert-danger d-none mt-3 text-center col-8 m-auto" role="alert" id="qrAlert" style="font-weight: 500; font-size: 20px;">
                <span id="alertMessage"></span>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        </div>

        <div id="generalInfo" class="mb-3 mt-4 card p-3 bg-light d-none">
            <div class="row text-center">
                <h5 class="col-4">Modèle : <span class="meterTypeName text-primary font-weight-bold"></span></h5>
                <h5 class="col-4">N° Carton : <span class="boxNumber text-primary font-weight-bold"></span></h5> 
                <h5 class="col-4">Progression : <span class="packedQteBox text-success font-weight-bold">0/0</span></h5>
            </div>
        </div>

        <div>
            <table id="packTable" class='table table-hover table-striped table-bordered text-center'>
                <thead class="thead-dark">
                    <tr>
                        <th>N°</th>
                        <th>Code à Barre</th>
                        <th>Modèle</th>
                        <th>Date et Heure</th>
                    </tr>
                </thead>
                <tbody>
                    </tbody>
            </table>
        </div>

        <div id="printDiv" class="d-none">
            
            <h4 class="saieg"> SOCIETE ALGERIENNE DES INDUSTRIES<br>ELECTRIQUES ET GAZIERS</h4>
            <img id="saieglogo" src="images/misc/SaiegLogo.png" class="mb-2">
            <h5 class="contrat" id=""></h5>
            <h5 class="nomenclature"></h5>

            <h3 class="productName text-center font-weight-bold"></h3>

            <h4 class="boxNumberPrint"></h4>
            <div id="qrcode" class="mt-2 mb-2"></div>

            <table class= "bareCodePrint">
                <tr>
                    <td style="padding: 5px; border-bottom: 1px dashed #ddd;">
                        <h6 style="font-weight: bold; margin-bottom: 3px; font-size: 13px; text-transform: uppercase; color: #555;">Premier numéro</h6>
                        <svg id="firstBarcode" style="max-width: 90%; height: auto;"></svg>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 20px 5px 5px 5px;">
                        <h6 style="font-weight: bold; margin-bottom: 3px; font-size: 13px; text-transform: uppercase; color: #555;">Dernier numéro</h6>
                        <svg id="lastBarcode" style="max-width: 90%; height: auto;"></svg>
                    </td>
                </tr>
            </table>

            <h4 class="qte"></h4>

            <!-- <h4 class="date text-right d-none"></h4> -->
            <!-- <img id="imgLabel" src="images/misc/label2.bmp" class="mt-2 d-none"> -->
        </div>

    </section>

    <?php include "includes/footer.php"; ?>
    <?php include "includes/leg.php"; ?>
    <script src="js/ajaxIndex.js?v=<?= filemtime('js/ajaxIndex.js') ?>"></script>
</body>
</html>