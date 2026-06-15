<?php
require_once "Database.php";
require_once "functions.php";
require_once "Config.php";

if (isset($_POST['function'])) {
    if ($_POST['function'] == "getMeterTypes") {
        DbServices::getMeterTypes();
    }
    if ($_POST['function'] == "packMeter" && isset($_POST['barcode']) && isset($_POST['id_meter_type'])) {
        DbServices::packMeter(trim($_POST['barcode']), intval($_POST['id_meter_type']));
    }
    if ($_POST['function'] == "getPackedMetersOfBox" && isset($_POST['id_box'])) {
        DbServices::getPackedMetersOfBox(intval($_POST['id_box']));
    }
    if ($_POST['function'] == "reopenBox" && isset($_POST['id_box'])) {
        DbServices::reopenBox(intval($_POST['id_box']));
    }
}

class DbServices {

    static function getMeterTypes() {
        $conn = Database::getConnection();
        $stmt = $conn->prepare("SELECT id, meter_type, qty_box, model_code FROM meter_type");
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    static function packMeter($barcode, $id_meter_type) {
        $conn = Database::getConnection();

        // 1. Vérifier si le compteur est déjà scanné/emballé
        // MODIFICATION : On fait une jointure avec la table 'box' pour obtenir son statut
        $stmtCheck = $conn->prepare("
            SELECT m.id, m.id_box, b.status 
            FROM meter m 
            LEFT JOIN box b ON m.id_box = b.id 
            WHERE m.barcode = :barcode
        ");
        $stmtCheck->execute([':barcode' => $barcode]);
        
        if ($stmtCheck->rowCount() > 0) {
            $row = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            echo json_encode([
                "state" => "already_packed", 
                "message" => "Ce compteur (Code: $barcode) est déjà emballé !",
                "id_box" => $row['id_box'],
                "box_status" => $row['status'] // Ajout du statut du carton ('open' ou 'closed')
            ]);
            exit;
        }

        // 2. Obtenir la limite du carton pour ce type de compteur
        $stmtType = $conn->prepare("SELECT meter_type, qty_box FROM meter_type WHERE id = :id");
        $stmtType->execute([':id' => $id_meter_type]);
        $typeInfo = $stmtType->fetch(PDO::FETCH_ASSOC);
        $qtyLimit = $typeInfo['qty_box'];
        $typeName = $typeInfo['meter_type'];

        // 3. Trouver un carton ouvert pour ce type ou en créer un nouveau
        $queryBox = "SELECT b.id, b.box_number FROM box b 
                     WHERE b.status = 'open' 
                     AND (
                        (SELECT COUNT(*) FROM meter m WHERE m.id_box = b.id) = 0 
                        OR 
                        (SELECT id_meter_type FROM meter m WHERE m.id_box = b.id LIMIT 1) = :id_type
                     ) ORDER BY b.id ASC LIMIT 1";
        
        $stmtBox = $conn->prepare($queryBox);
        $stmtBox->execute([':id_type' => $id_meter_type]);

        if ($stmtBox->rowCount() > 0) {
            $box = $stmtBox->fetch(PDO::FETCH_ASSOC);
            $id_box = $box['id'];
            $box_number = $box['box_number'];
        } else {
            // Création du format personnalisé : BX-SGM12-DL-01
            $prefix = "BX-" . $typeName . "-";
            
            // On cherche le dernier carton créé avec ce préfixe
            $stmtLastBox = $conn->prepare("SELECT box_number FROM box WHERE box_number LIKE :prefix ORDER BY id DESC LIMIT 1");
            $stmtLastBox->execute([':prefix' => $prefix . '%']);
            
            if ($stmtLastBox->rowCount() > 0) {
                $lastBox = $stmtLastBox->fetch(PDO::FETCH_ASSOC)['box_number'];
                // On extrait le dernier numéro et on ajoute 1
                $parts = explode('-', $lastBox);
                $lastNum = intval(end($parts)); // Récupère la dernière partie (ex: 01)
                $nextNum = str_pad($lastNum + 1, 2, '0', STR_PAD_LEFT); // Transforme 2 en "02"
            } else {
                $nextNum = "01"; // Premier carton de ce type
            }
            
            $box_number = $prefix . $nextNum;
            
            // Insertion du nouveau carton
            $stmtNewBox = $conn->prepare("INSERT INTO box (box_number, status) VALUES (:box_num, 'open')");
            $stmtNewBox->execute([':box_num' => $box_number]);
            $id_box = $conn->lastInsertId();
        }

        // 4. Insérer le compteur scanné
        $stmtInsert = $conn->prepare("INSERT INTO meter (barcode, id_meter_type, id_box) VALUES (:barcode, :id_type, :id_box)");
        if (!$stmtInsert->execute([':barcode' => $barcode, ':id_type' => $id_meter_type, ':id_box' => $id_box])) {
            echo json_encode(["state" => "f", "message" => "Erreur lors de l'insertion."]);
            exit;
        }

        // 5. Récupérer tous les compteurs actuellement dans ce carton (pour l'historique UI)
        $stmtAllMeters = $conn->prepare("SELECT barcode, create_date FROM meter WHERE id_box = :id_box ORDER BY id DESC");
        $stmtAllMeters->execute([':id_box' => $id_box]);
        $allMeters = $stmtAllMeters->fetchAll(PDO::FETCH_ASSOC);
        $currentQty = count($allMeters); // On compte la taille du tableau directement

        $message = "success";
        
        // 6. Fermer le carton si la limite est atteinte
        if ($currentQty >= $qtyLimit) {
            $stmtClose = $conn->prepare("UPDATE box SET status = 'closed' WHERE id = :id_box");
            $stmtClose->execute([':id_box' => $id_box]);
            $message = "box-full"; // On garde le message codé en dur pour faire correspondre avec le frontend
        }

        echo json_encode([
            "state" => "s",
            "message" => $message,
            "box_number" => $box_number,
            "id_box" => $id_box,
            "packed_box_qte" => "$currentQty/$qtyLimit",
            "meter_type_name" => $typeName,
            "barcode" => $barcode,
            "date" => date('Y-m-d H:i:s'),
            "all_meters" => $allMeters // NOUVEAU: On envoie l'historique complet du carton
        ]);
    }

    static function getPackedMetersOfBox($id_box) {
        $conn = Database::getConnection();
        $stmt = $conn->prepare("SELECT m.barcode, m.create_date, t.meter_type 
                                FROM meter m 
                                JOIN meter_type t ON m.id_meter_type = t.id 
                                WHERE m.id_box = :id_box 
                                ORDER BY m.id DESC");
        $stmt->execute([':id_box' => $id_box]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($results) > 0) {
            echo json_encode(["state" => "s", "data" => $results]);
        } else {
            echo json_encode(["state" => "f", "message" => Config::$no_data_found]);
        }
    }

    static function reopenBox($id_box) {
        $conn = Database::getConnection();
        
        // 1. Obtenir les infos générales du carton et le type de compteur
        $stmtBox = $conn->prepare("SELECT b.box_number, t.meter_type, t.qty_box 
                                   FROM box b
                                   JOIN meter m ON m.id_box = b.id
                                   JOIN meter_type t ON m.id_meter_type = t.id
                                   WHERE b.id = :id_box
                                   LIMIT 1");
        $stmtBox->execute([':id_box' => $id_box]);
        
        if ($stmtBox->rowCount() > 0) {
            $boxInfo = $stmtBox->fetch(PDO::FETCH_ASSOC);
            $box_number = $boxInfo['box_number'];
            $typeName = $boxInfo['meter_type'];
            $qtyLimit = $boxInfo['qty_box'];
            
            // 2. Obtenir tous les compteurs liés à ce carton pour rebâtir le tableau
            $stmtAllMeters = $conn->prepare("SELECT barcode, create_date FROM meter WHERE id_box = :id_box ORDER BY id DESC");
            $stmtAllMeters->execute([':id_box' => $id_box]);
            $allMeters = $stmtAllMeters->fetchAll(PDO::FETCH_ASSOC);
            $currentQty = count($allMeters);
            
            echo json_encode([
                "state" => "s",
                "box_number" => $box_number,
                "id_box" => $id_box,
                "packed_box_qte" => "$currentQty/$qtyLimit",
                "meter_type_name" => $typeName,
                "all_meters" => $allMeters
            ]);
        } else {
            echo json_encode(["state" => "f", "message" => "Carton introuvable."]);
        }
    }
}
?>