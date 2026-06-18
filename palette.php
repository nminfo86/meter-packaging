<?php
require_once (__DIR__ . "/php/functions.php");
require_once (__DIR__ . "/php/DbServices.php");
?>
<html>
<?php include "includes/head.php"; ?>

<body id="Palette">
    <?php include "includes/header.php"; ?>
    <section class="container mt-4">

        <div class="welcome-user text-center">
            <div class="row justify-content-center mb-3">
                <div class="col-md-8 d-flex justify-content-center align-items-center">
                    <select id="meterTypeSelect" class="form-control form-control-lg text-center w-75" style="border: 2px solid #007bff; font-weight: bold;">
                        <option value="" disabled selected>-- PALETTE - Sélectionnez le Type --</option>
                    </select>
                    <button id="manualPrintBtn" class="btn btn-success btn-lg ml-3 d-none" title="Imprimer la liste de colisage">
                        <i class="fas fa-print"></i> Liste de Colisage
                    </button>
                </div>
            </div>

            <div id="inputDiv" class="mb-3">
                <input id="currentPaletteId" type="hidden" value="">
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
                <h5 class="col-4">N° Palette : <span class="paletteNumber text-primary font-weight-bold"></span></h5> 
                <h5 class="col-4">Progression : <span class="packedQtePalette text-success font-weight-bold">0/0</span></h5>
            </div>
        </div>

        <div>
            <table id="packTable" class='table table-hover table-striped table-bordered text-center'>
                <thead class="thead-dark">
                    <tr>
                        <th>N°</th>
                        <th>N° Carton</th>
                        <th>Modèle</th>
                        <th>Date et Heure d'ajout</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>

        <div id="printDiv" class="d-none" style="padding: 20px; font-family: Arial, sans-serif; background: #fff;">
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h4 style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">SOCIETE ALGERIENNE DES INDUSTRIES<br>ELECTRIQUES ET GAZIERES</h4>
                <img src="images/misc/SaiegLogo.png" style="max-height: 60px; margin-bottom: 10px;">
                <h2 style="font-weight: bold; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">LISTE DE COLISAGE (PACKING LIST)</h2>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 16px; font-weight: bold;">
                <div>
                    <p class="printPaletteNumber" style="margin-bottom: 5px;"></p>
                    <p class="printMeterName" style="margin-bottom: 5px;"></p>
                </div>
                <div style="text-align: right;">
                    <p class="printContrat" style="margin-bottom: 5px;"></p>
                    <p class="printNomenclature" style="margin-bottom: 5px;"></p>
                    <!-- <p class="printDate" style="margin-bottom: 5px;"></p> -->
                </div>
            </div>
            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
            <!-- <div style="margin-top: 30px; display: flex; font-weight: bold; font-size: 16px;"> -->
                <p>TOTAL CARTONS : <span class="printTotalBoxes text-primary"></span></p>
                <p>TOTAL COMPTEURS : <span class="printTotalMeters text-primary"></span></p>
                <p class="printDate" style="margin-bottom: 5px;"></p>
            </div>

            <table id="printTable" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 5%;">N°</th>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 10%;">N° Carton</th>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 5%;">Qté Compteurs</th>
                        <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; width: 80%;">Numéros de Série</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
            
            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
                <p>TOTAL CARTONS : <span class="printTotalBoxes text-primary"></span></p>
                <p>TOTAL COMPTEURS : <span class="printTotalMeters text-primary"></span></p>
                <p>Signature Chef d'Équipe : ................................</p>
            </div>
        </div>

    </section>

    <?php include "includes/footer.php"; ?>
    <?php include "includes/leg.php"; ?>
    <script src="js/ajaxPalette.js?v=<?= filemtime('js/ajaxPalette.js') ?>"></script>
</body>
</html>