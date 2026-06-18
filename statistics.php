<?php
require_once (__DIR__ . "/php/functions.php");
require_once (__DIR__ . "/php/DbServices.php");
?>
<html>
<?php include "includes/head.php"; ?>

<body id="Statistics">
    <?php include "includes/header.php"; ?>
    <section class="container mt-4">

        <div class="welcome-user text-center mb-4">
            <h2 class="font-weight-bold flat-title">
                <i class="fas fa-chart-bar"></i> Statistiques d'Emballage
            </h2>
        </div>

        <div class="card mb-5 flat-card">
            <div class="card-header flat-card-header font-weight-bold">
                <i class="fas fa-chart-line"></i> Statistiques d'Emballage
            </div>
            <div class="card-body bg-light">
                <form id="statsForm" class="row justify-content-center align-items-end mb-4">
                    <div class="col-md-3 mb-2">
                        <label class="font-weight-bold">Modèle</label>
                        <select id="statMeterType" name="id_meter_type" class="form-control flat-select">
                            <option value="all">Tous les Modèles</option>
                        </select>
                    </div>
                    <div class="col-md-2 mb-2">
                        <label class="font-weight-bold">Date de début</label>
                        <input type="date" id="startDate" name="start_date" class="form-control flat-date">
                    </div>
                    <div class="col-md-2 mb-2">
                        <label class="font-weight-bold">Date de fin</label>
                        <input type="date" id="endDate" name="end_date" class="form-control flat-date">
                    </div>
                    <div class="col-md-2 mb-2">
                        <label class="font-weight-bold">De l'heure</label>
                        <input type="number" id="startHour" name="start_hour" class="form-control flat-number" min="0" max="23" placeholder="Ex: 8">
                    </div>
                    <div class="col-md-2 mb-2">
                        <label class="font-weight-bold">À l'heure</label>
                        <input type="number" id="endHour" name="end_hour" class="form-control flat-number" min="0" max="23" placeholder="Ex: 16">
                    </div>
                    <div class="col-md-1 mb-2">
                        <button type="button" id="btnGenerateStats" class="btn btn-success w-100 flat-btn font-weight-bold" title="Filtrer">
                            <i class="fas fa-filter"></i>
                        </button>
                    </div>
                </form>

                <h4 id="totalMetersText" class="text-center text-primary font-weight-bold mb-3"></h4>

                <div id="statsLoader" class="text-center py-5" style="display:none;">
                    <div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;">
                        <span class="sr-only">Chargement...</span>
                    </div>
                </div>
                
                <div class="flat-canvas-container">
                    <canvas id="statsChart"></canvas>
                </div>
            </div>
        </div>

    </section>

    <?php include "includes/footer.php"; ?>
    <?php include "includes/leg.php"; ?>
    
    <script src="js/ajaxStatistics.js?v=<?= filemtime('js/ajaxStatistics.js') ?: time() ?>"></script>
</body>
</html>