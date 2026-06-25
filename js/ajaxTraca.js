$(document).ready(function () {

    // Focaliser l'input automatiquement
    setTimeout(() => { $('#trackBarcode').focus(); }, 500);

    // --- TRACK : bouton ---
    $("#btnTrack").click(function () {
        doTrack();
    });

    // --- TRACK : touche Entrée ---
    $("#trackBarcode").keypress(function (e) {
        if (e.which == 13) {
            e.preventDefault();
            doTrack();
        }
    });

    // Gestion du switch "Activer la recherche manuelle"
    $("#enableAutocomplete").change(function() {
        if ($(this).is(":checked")) {
            $("#trackBarcode").attr("placeholder", "Tapez une partie du code, carton ou palette...");
            $("#trackBarcode").focus();
        } else {
            $("#trackBarcode").attr("placeholder", "Scanner Code-barres, Carton (BX-) ou Palette (PL-)");
            $("#trackBarcode").focus();
        }
    });

    // --- Nouveaux Boutons ---
    $("#btnMetersWait").click(function () {
        getSpecialList('metersWait');
    });

    $("#btnBoxesOpen").click(function () {
        getSpecialList('boxesOpen');
    });

    $("#btnPalettesOpen").click(function () {
        getSpecialList('palettesOpen');
    });

    // Autocomplétion intelligente
    $("#trackBarcode").autocomplete({
        // La fonction "search" est appelée juste avant de lancer la requête
        search: function(event, ui) {
            // Si la case n'est PAS cochée, on annule l'autocomplétion
            if (!$("#enableAutocomplete").is(":checked")) {
                return false; 
            }
        },
        source: function (request, response) {
            $.ajax({
                url: "php/DbStatistics.php",
                type: "GET",
                dataType: "json",
                data: {
                    function: "searchAutocomplete",
                    term: request.term
                },
                success: function (data) {
                    response(data);
                }
            });
        },
        minLength: 2, // Démarrer la recherche après 3 caractères
        select: function (event, ui) {
            // Quand une option est sélectionnée, on met la valeur et on valide
            $("#trackBarcode").val(ui.item.value);
            doTrack(); 
            return false;
        }
    }).autocomplete("instance")._renderItem = function (ul, item) {
        return $("<li>")
            .append("<div>" + item.label + "</div>")
            .appendTo(ul);
    };
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
        success: function (res) {
            let resultDiv = $("#trackResult");
            resultDiv.removeClass().empty();

            if (res.state === "s") {
                let html = '';

                // ==========================================
                // COMPTEUR
                // ==========================================
                if (res.item_type === "meter") {
                    let d = res.data;
                    let boxText = d.box_number ? `<a href="javascript:void(0);" onclick="quickTrack('${d.box_number}')" class="font-weight-bold text-primary text-decoration-none"><i class="fas fa-link"></i> ${d.box_number}</a>` : '<span class="text-danger">Pas encore en carton</span>';
                    let palText = d.palette_number ? `<a href="javascript:void(0);" onclick="quickTrack('${d.palette_number}')" class="font-weight-bold text-success text-decoration-none"><i class="fas fa-link"></i> ${d.palette_number}</a>` : '<span class="text-warning">Pas encore palettisé</span>';
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
                    let info = res.info;
                    let palText = info.palette_number
                        ? `<a href="javascript:void(0);" onclick="quickTrack('${info.palette_number}')" class="font-weight-bold text-success text-decoration-none"><i class="fas fa-link"></i> ${info.palette_number}</a>`
                        : '<span class="text-warning">Pas encore sur palette</span>';

                    let rows = '';
                    res.contents.forEach((m, index) => {
                        let mStatus = m.status === 'wait'
                            ? '<span class="badge badge-warning">Attente</span>'
                            : '<span class="badge badge-success">OK</span>';
                        rows += `<tr>
                                <td>${index + 1}</td>
                                <td class="font-weight-bold"><a href="javascript:void(0);" onclick="quickTrack('${m.barcode}')" class="text-dark text-decoration-none">${m.barcode}</a></td>
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
                                <td class="font-weight-bold"><a href="javascript:void(0);" onclick="quickTrack('${b.box_number}')" class="text-primary text-decoration-none">${b.box_number}</a></td>
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
        error: function () {
            $("#trackResult")
                .removeClass()
                .addClass('alert alert-danger')
                .html('<i class="fas fa-exclamation-triangle"></i> Erreur de communication avec le serveur.')
                .show();
        },
        complete: function () {
            $("#btnTrack").prop('disabled', false).html('<i class="fas fa-search"></i> Chercher');
        }
    });
}

// Fonction pour chercher directement un élément depuis un lien
function quickTrack(identifier) {
    $("#trackBarcode").val(identifier);
    doTrack();
    // Scroll tout en haut au besoin
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getSpecialList(listType) {
    let resultDiv = $("#trackResult");
    resultDiv.removeClass().empty().html('<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i></div>').show();

    $.ajax({
        url: "php/DbStatistics.php",
        type: "POST",
        data: { function: "getSpecialList", listType: listType },
        dataType: "json",
        success: function (res) {
            resultDiv.empty();

            if (res.state === "s") {
                let html = '';
                
                if (listType === 'metersWait') {
                    if(res.data.length === 0) {
                        resultDiv.html('<div class="alert alert-info">Aucun compteur en attente trouvé.</div>');
                        return;
                    }
                    let rows = '';
                    res.data.forEach((item, index) => {
                        let boxText = item.box_number ? `<a href="javascript:void(0);" onclick="quickTrack('${item.box_number}')" class="text-primary font-weight-bold text-decoration-none"><i class="fas fa-link"></i> ${item.box_number}</a>` : '<span class="text-muted">Aucun</span>';
                        rows += `<tr>
                                    <td>${index + 1}</td>
                                    <td class="font-weight-bold"><a href="javascript:void(0);" onclick="quickTrack('${item.barcode}')" class="text-dark text-decoration-none">${item.barcode}</a></td>
                                    <td>${item.meter_type}</td>
                                    <td>${boxText}</td>
                                    <td>${item.create_date}</td>
                                 </tr>`;
                    });

                    html = `
                        <div class="card flat-card">
                            <div class="card-header flat-card-header font-weight-bold text-warning">
                                <i class="fas fa-hourglass-half"></i> Compteurs en attente
                            </div>
                            <div class="card-body">
                                <span class="badge badge-warning mb-3">Total : ${res.data.length} compteur(s)</span>
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered bg-white text-center">
                                        <thead class="thead-dark">
                                            <tr><th>N°</th><th>Code-barres</th><th>Modèle</th><th>Carton (Lien)</th><th>Date d'emballage</th></tr>
                                        </thead>
                                        <tbody>${rows}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>`;
                } else if (listType === 'boxesOpen') {
                     if(res.data.length === 0) {
                        resultDiv.html('<div class="alert alert-info">Aucun carton en attente trouvé.</div>');
                        return;
                    }
                    let rows = '';
                    res.data.forEach((item, index) => {
                         let palText = item.palette_number ? `<a href="javascript:void(0);" onclick="quickTrack('${item.palette_number}')" class="text-success font-weight-bold text-decoration-none"><i class="fas fa-link"></i> ${item.palette_number}</a>` : '<span class="text-muted">Aucun</span>';
                        rows += `<tr>
                                    <td>${index + 1}</td>
                                    <td class="font-weight-bold"><a href="javascript:void(0);" onclick="quickTrack('${item.box_number}')" class="text-primary text-decoration-none">${item.box_number}</a></td>
                                    <td>${palText}</td>
                                    <td>${item.create_date}</td>
                                 </tr>`;
                    });

                     html = `
                        <div class="card flat-card">
                            <div class="card-header flat-card-header font-weight-bold text-warning">
                                <i class="fas fa-box-open"></i> Cartons en attente
                            </div>
                            <div class="card-body">
                                <span class="badge badge-warning mb-3">Total : ${res.data.length} carton(s)</span>
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered bg-white text-center">
                                        <thead class="thead-dark">
                                            <tr><th>N°</th><th>Numéro du Carton</th><th>Palette (Lien)</th><th>Date de création</th></tr>
                                        </thead>
                                        <tbody>${rows}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>`;
                } else if (listType === 'palettesOpen') {
                    if(res.data.length === 0) {
                        resultDiv.html('<div class="alert alert-info">Aucune palette ouverte trouvée.</div>');
                        return;
                    }
                    let rows = '';
                    res.data.forEach((item, index) => {
                        rows += `<tr>
                                    <td>${index + 1}</td>
                                    <td class="font-weight-bold"><a href="javascript:void(0);" onclick="quickTrack('${item.palette_number}')" class="text-success text-decoration-none">${item.palette_number}</a></td>
                                    <td>${item.create_date}</td>
                                 </tr>`;
                    });

                     html = `
                        <div class="card flat-card">
                            <div class="card-header flat-card-header font-weight-bold text-success">
                                <i class="fas fa-pallet"></i> Palettes Ouvertes
                            </div>
                            <div class="card-body">
                                <span class="badge badge-success mb-3">Total : ${res.data.length} palette(s)</span>
                                <div class="table-responsive">
                                    <table class="table table-sm table-bordered bg-white text-center">
                                        <thead class="thead-dark">
                                            <tr><th>N°</th><th>Numéro de la Palette</th><th>Date de création</th></tr>
                                        </thead>
                                        <tbody>${rows}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>`;
                }

                resultDiv.html(html);

            } else {
                 resultDiv.addClass('alert alert-danger').html(`<i class="fas fa-exclamation-triangle"></i> Erreur: ${res.message}`);
            }
        },
        error: function () {
             resultDiv.addClass('alert alert-danger').html('<i class="fas fa-exclamation-triangle"></i> Erreur de communication.');
        }
    });
}
