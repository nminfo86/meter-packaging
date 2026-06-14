<?php
require_once "functions.php";
require_once "Connection.php";

class Database {
    public static $conn = null;

    public static function getConnection() {
        if (self::$conn == null) {
            try {
                // Utilisation du driver MySQL selon ton fichier SQL phpMyAdmin
                self::$conn = new PDO("mysql:host=" . Connection::$host . ";dbname=" . Connection::$db_name . ";charset=utf8mb4", Connection::$username, Connection::$password);
                self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } catch (PDOException $exception) {
                echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
                addTrace($exception->getMessage());
                exit;
            }
        }
        return self::$conn;
    }
}
?>