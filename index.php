<?php
require_once (__DIR__ . "/php/functions.php");
require_once (__DIR__ . "/php/DbServices.php");
?>
<html>
<?php include "includes/head.php"; ?>

<body id="Admin panel">
    <?php include "includes/header.php"; ?>
    <section class="container mt-4">

        <div class="welcome-user text-center">
            <div class="row justify-content-center mb-3">
                <div class="col-md-6">
                    <select id="meterTypeSelect" class="form-control form-control-lg text-center" style="border: 2px solid #007bff; font-weight: bold;">
                        <option value="" disabled selected>-- Sélectionnez le Type de Compteur --</option>
                    </select>
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
            <h3 class="productName text-center font-weight-bold"></h3>
            <hr>
            <h4 class="boxNumber"></h4>
            <div id="qrcode" class="mt-2 mb-2"></div>
            <h5 class="qte"></h5>
            <hr>
            <h5 class="sn" style="font-family: monospace;"></h5>
            <hr>
            <h4 class="date text-right"></h4>
            <img id="imgLabel" src="images/misc/label2.bmp" class="mt-2">
        </div>

    </section>

    <?php include "includes/footer.php"; ?>
    <?php include "includes/leg.php"; ?>
    <script src="js/ajaxIndex.js?v=<?= filemtime('js/ajaxIndex.js') ?>"></script>
</body>
</html>