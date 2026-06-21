//$('#product_details_slider .item img').each(function() {
//  var imgSrc = $(this).attr('src');
//  $(this).parent().css({'background-image': 'url('+imgSrc+')'});
//  $(this).remove();
//});


$('[data-toggle="tooltip"]').tooltip();

var year = "&copy; 2015" + "-" + new Date().getFullYear() + " ";
    $("#copyrightCms").html(year);

// Load version from changelog.json
$.getJSON("changelog.json", function(changelog) {
    if (changelog && changelog.length > 0) {
        $("#appVersion").html("&mdash; v" + changelog[0].version);
    }
});

//Change the head title depending the body id of every page
    $("#headtitle").append($("body").attr('id'));

//**************** GLOBAL VARIABLES AND MESSAGES ***********************//

var user_error = "Ooops! there was a problem.";
var noDataFound = "no-data-found";
var data_exist = "data-exist";

var userNotFound = "user-not-found";
var user_still_blocked = "user-still-blocked";

// These custom messages are used only for log-in page ajaxLogin.js
var msgUserNotFound = "Je reconnaît pas ce nom d'utilisateur.. :(";
var msgPswNotMatch = "Le nom d'utilisateur et le mot de passe saisis ne correspondent pas."
var msgUserRedirect = "vous serez redirigé vers une nouvelle page dans 03 secondes :)";
var msgUserStillBlocked = "Vous avez atteint le nombre maximum de tentatives autorisées.\n Veuillez réessayer dans 05 minutes.";
//
var msgConfirmDelete = "Voulez vous vraiment supprimer l'enregistrement ?";



var msgDatabaseConnexion = 'Problème connexion avec la base de donnée';
var msgQrCodeValidation = 'Merci de scanner un Produit  ..!';
var msgSubAssumbly = 'Contacteur sous ensemble ..:(';
var msgLastStatusNotValid = 'SVP - Verifier le dernier mouvement';
var msgisPacked = 'Produit déja emballé';
var msgBoxFull = 'box-full';
//

lastStatusCheckStation='Fastening';


//**************** GLOBAL FUNCTIONS ********************//
function initAlert(alert) {
    alert.addClass("d-none");
}
function autoRemoveAlert(alert) {
    window.setTimeout(function () {
        alert.addClass("d-none");
    }, 3500);
}
function showAlertSuccess(alert, message) {
    alert.removeClass("d-none");
    alert.text(message);
    alert.removeClass("alert-danger");
    alert.addClass("alert-success");
//    autoRemoveAlert(alert);
}
function showAlertFailed(alert, message) {
    alert.removeClass("d-none");
    alert.text(message);
    alert.removeClass("alert-success");
    alert.addClass("alert-danger");
    autoRemoveAlert(alert);
}

// This function is used to get error message for all ajax calls
function getAjaxErrorMessage(jqXHR, exception) {
    var msg = '';
    if (jqXHR.status === 0) {
        msg = 'Not connect.\n Verify Network.';
    } else if (jqXHR.status === 404) {
        msg = 'Requested page not found. [404]';
    } else if (jqXHR.status === 500) {
        msg = 'Internal Server Error [500].';
    } else if (exception === 'parsererror') {
        msg = 'Requested JSON parse failed.';
    } else if (exception === 'timeout') {
        msg = 'Time out error.';
    } else if (exception === 'abort') {
        msg = 'Ajax request aborted.';
    } else if (exception === 'null') {
        msg = '';
    } else {
        msg = 'Uncaught Error.\n' + jqXHR.responseText;
    }
    return msg;
}

function getDateTime(){
    var today = new Date();
var date = today.getDate()+'-'+(today.getMonth()+1)+'-'+today.getFullYear();
var time = today.getHours() + ":" + (today.getMinutes()<10?"0"+today.getMinutes():today.getMinutes());
var dateTime = date+' '+time;
    return dateTime;
}