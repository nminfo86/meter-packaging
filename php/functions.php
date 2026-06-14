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




function addTrace($message) {

    $user = "[Unknown user]";

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