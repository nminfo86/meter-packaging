<?php
require_once "Config.php";
session_start();

function getCurrentDate() {
    return date('Y-m-d H:i:s');
}

function getMsgPdoStmt(PDOStatement $stmt) {
    $arr = $stmt->errorInfo();
    return $arr[2] ?? "Erreur SQL inconnue";
}

function addTrace($message) {
    $user = "[Operateur]"; // Peut être dynamique si gestion de session
    $time = @date('[d/M/Y:H:i:s]');
    $newMessage = "\n" . $time . " " . $user . " " . $message . "\n";
    error_log($newMessage, 3, $_SERVER['DOCUMENT_ROOT'].Config::$log_file_path);
}
?>