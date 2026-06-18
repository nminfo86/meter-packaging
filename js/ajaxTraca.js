$(document).ready(function() {

    // Focaliser l'input automatiquement
    setTimeout(() => { $('#trackBarcode').focus(); }, 500);

    // --- TRACK : bouton ---
    $("#btnTrack").click(function() {
        doTrack();
    });

    // --- TRACK : touche Entrée ---
    $("#trackBarcode").keypress(function(e) {
        if (e.which == 13) {
            e.preventDefault();
            doTrack();
        }
    });
});

function doTrack() {
    let identifier = $("#trackBarcode").val().trim();
    if (identifier === "") return;

    $("#btnTrack").prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

    $.ajax({
        url: "php/DbStatistics.php",
        type: "POST",
        data: { function: "trackItem", identifier: identifier },
        dataType: "json",
        success: function(res) {
            let resultDiv = $("#trackResult");
            resultDiv.removeClass().empty();

            if (res.state === "s") {
                let html = '';

                // ==========================================
                // COMPTEUR
                // ==========================================
                if (res.item_type === "meter") {
                    let d = res.data;
                    let boxText  = d.box_number    ? `<span class="font-weight-bold text-success">${d.box_number}</span>`     : '<span class="text-danger">Pas encore en carton</span>';
                    let palText  = d.palette_number ? `<span class="font-weight-bold text-success">${d.palette_number}</span>` : '<span class="text-warning">Pas encore palettisé</span>';
                    let statusBadge = d.meter_status === 'wait'
                        ? '<span class="badge badge-warning">En attente</span>'
                        : '<span class="badge badge-success">Emballé</span>';

                    html = `
                        <div class="card flat-card">
                            <div class="card-header flat-card-header font-weight-bold">
                                <i class="fas fa-tachometer-alt"></i> Détails du Compteur
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6 mb-2"><strong>Code-barres :</strong> <span class="font-weight-bold">${d.barcode}</span></div>
                                    <div class="col-md-6 mb-2"><strong>Modèle :</strong> <span class="text-primary font-weight-bold">${d.meter_type}</span></div>
                                    <div class="col-md-6 mb-2"><strong>Emballé le :</strong> ${d.packing_date}</div>
                                    <div class="col-md-6 mb-2"><strong>Statut :</strong> ${statusBadge}</div>
                                    <div class="col-md-6 mb-2"><strong>Carton :</strong> ${boxText}</div>
                                    <div class="col-md-6 mb-2"><strong>Palette :</strong> ${palText}</div>
                                </div>
                            </div>
                        </div>`;
                }

                // ==========================================
                // CARTON
                // ==========================================
                else if (res.item_type === "box") {
                    let info   = res.info;
                    let palText = info.palette_number
                        ? `<span class="font-weight-bold text-success">${info.palette_number}</span>`
                        : '<span class="text-warning">Pas encore sur palette</span>';

                    let rows = '';
                    res.contents.forEach((m, index) => {
                        let mStatus = m.status === 'wait'
                            ? '<span class="badge badge-warning">Attente</span>'
                            : '<span class="badge badge-success">OK</span>';
                        rows += `<tr>
                                    <td>${index + 1}</td>
                                    <td class="font-weight-bold">${m.barcode}</td>
                                    <td>${m.create_date}</td>
                                    <td>${mStatus}</td>
                                 </tr>`;
                    });

                    html = `
                        <div class="card flat-card">
                            <div class="card-header flat-card-header font-weight-bold text-primary">
                                <i class="fas fa-box"></i> Carton : ${info.box_number}
                            </div>
                            <div class="card-body">
                                <div class="row mb-3">
                                    <div class="col-md-3 mb-2"><strong>Modèle :</strong> ${info.meter_type}</div>
                                    <div class="col-md-3 mb-2"><strong>Statut :</strong> ${info.box_status}</div>
                                    <div class="col-md-3 mb-2"><strong>Créé le :</strong> ${info.create_date}</div>
                                    <div class="col-md-3 mb-2"><strong>Palette :</strong> ${palText}</div>
                                    <div class="col-md-3 mb-2"><strong>Quantité :</strong> <span class="badge badge-success">${res.contents.length}</span> compteur(s)</div>
                                </div>
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered bg-white text-center">
                                        <thead class="thead-dark">
                                            <tr><th>N°</th><th>Code-barres Compteur</th><th>Date d'emballage</th><th>Statut</th></tr>
                                        </thead>
                                        <tbody>${rows}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>`;
                }

                // ==========================================
                // PALETTE
                // ==========================================
                else if (res.item_type === "palette") {
                    let info = res.info;

                    let rows = '';
                    res.contents.forEach((b, index) => {
                        rows += `<tr>
                                    <td>${index + 1}</td>
                                    <td class="font-weight-bold">${b.box_number}</td>
                                    <td>${b.meter_count}</td>
                                    <td>${b.create_date}</td>
                                 </tr>`;
                    });

                    html = `
                        <div class="card flat-card">
                            <div class="card-header flat-card-header font-weight-bold text-success">
                                <i class="fas fa-pallet"></i> Palette : ${info.palette_number}
                            </div>
                            <div class="card-body">
                                <div class="row mb-3">
                                    <div class="col-md-4 mb-2"><strong>Statut :</strong> ${info.status}</div>
                                    <div class="col-md-4 mb-2"><strong>Créée le :</strong> ${info.create_date}</div>
                                    <div class="col-md-4 mb-2"><strong>Total Cartons :</strong> <span class="badge badge-primary">${res.contents.length}</span></div>
                                </div>
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered bg-white text-center">
                                        <thead class="thead-dark">
                                            <tr><th>N°</th><th>Numéro du Carton</th><th>Qté Compteurs</th><th>Date d'ajout</th></tr>
                                        </thead>
                                        <tbody>${rows}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>`;
                }

                resultDiv.html(html).show();

            } else {
                resultDiv.addClass('alert alert-danger').html(`<i class="fas fa-exclamation-triangle"></i> <strong>Introuvable :</strong> ${res.message}`).show();
            }

            // Vider le champ et remettre le focus
            $("#trackBarcode").val('').focus();
        },
        error: function() {
            $("#trackResult")
                .removeClass()
                .addClass('alert alert-danger')
                .html('<i class="fas fa-exclamation-triangle"></i> Erreur de communication avec le serveur.')
                .show();
        },
        complete: function() {
            $("#btnTrack").prop('disabled', false).html('<i class="fas fa-search"></i> Chercher');
        }
    });
}
