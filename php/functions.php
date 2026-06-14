<?php

require_once "Config.php";
session_start();

//
//
// *************** GLOBAL FUNCTIONS ************** ************//

function getCurrentDate() {
    return date('Y-m-d H:i:s');
}

function getMsgPdoStmt(PDOStatement $stmt) {
    $arr = $stmt->errorInfo();
    return $arr [2];
}

function loggedIn() {
    return isset($_SESSION["username"]);
}

function checkSessionAlive() {

    $inactive = Config::$session_inactive;
    if (!isset($_SESSION['timeout'])) {
        $_SESSION['timeout'] = time() + $inactive;
    }

    $session_life = time() - $_SESSION['timeout'];

    if ($session_life >= $inactive) {
        session_unset();
        session_destroy();
        redirectTo("../mycms/login.php");
    }

    $_SESSION['timeout'] = time();
}

function confirmLoggedIn() {
    //regenerate session id to prevent SESSION FIXATION ATTACK
    session_regenerate_id();
    //
    if (!loggedIn()) {
        redirectTo("../mycms/login.php");
    }
    checkSessionAlive();
}

function autoRedirect($username) {
    redirectTo($username . "Panel.php");
}

function accessControl($username) {
    if (loggedIn()&&($_SESSION["username"]!=='admin')) {
        if ($_SESSION["username"] !== $username) {
            logout();
        }
    }
}

function logout() {
    session_unset();
    session_destroy();
    redirectTo("../../mycms/login.php");
}

function redirectTo($page) {
    header("Location: {$page}");
    exit;
}
function redirectToHome() {
    redirectTo("https://" . $_SERVER['SERVER_NAME']);
    exit;
}

function addTrace($message) {

    $user = "[Unknown user]";
    if (loggedIn()) {
        $user = '[' . $_SESSION["username"] . ']';
    }
    $time = @date('[d/M/Y:H:i:s]');
    $newMessage = "\n" . $time . " " . $user . " " . $message . "\n";
    error_log($newMessage, 3, $_SERVER['DOCUMENT_ROOT'].Config::$log_file_path);
}

    function getBoxQteLimit($PO){
         $result = $PO.substr(0, 8);
         switch ($result) {
            case stristr($result,"93271005"):
                return 40;
                break;
            case stristr($result,"93271006"):
                return 40;
                break;
            case stristr($result,"93271017"):
                return 40;
                break;
            case stristr($result,"93271018"):
                return 40;
                break;
            case stristr($result,"93271029"):
                return 40;
                break;
            case stristr($result,"93271030"):
                return 40;
                break;
            default:
                return 35;
        }
    }


?>