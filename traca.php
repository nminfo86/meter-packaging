<?php
require_once (__DIR__ . "/php/functions.php");
require_once (__DIR__ . "/php/DbServices.php");
?>
<html>
<?php include "includes/head.php"; ?>

<body id="Traca">
    <?php include "includes/header.php"; ?>
    <section class="container mt-4">

        <div class="welcome-user text-center mb-4">
            <h2 class="font-weight-bold flat-title">
                <i class="fas fa-search"></i> Traçabilité
            </h2>
        </div>

        <div class="card mb-5 flat-card">
            <div class="card-header flat-card-header font-weight-bold">
                <i class="fas fa-barcode"></i> Scanner Compteur, Carton ou Palette
            </div>
            <div class="card-body">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="input-group input-group-lg mb-3">
                            <input type="text" id="trackBarcode" class="form-control text-center flat-input" placeholder="Scanner Code-barres, Carton (BX-) ou Palette (PL-)">
                            <div class="input-group-append">
                                <button class="btn btn-primary flat-btn font-weight-bold" type="button" id="btnTrack">
                                    <i class="fas fa-search"></i> Chercher
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="trackResult" class="mt-3" style="display:none;"></div>
            </div>
        </div>

    </section>

    <?php include "includes/footer.php"; ?>
    <?php include "includes/leg.php"; ?>

    <script src="js/ajaxTraca.js?v=<?= filemtime('js/ajaxTraca.js') ?: time() ?>"></script>
</body>
</html>
