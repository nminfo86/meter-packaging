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
    // NOUVELLE FONCTION : Déclarer un compteur en attente
    if ($_POST['function'] == "declareWaitMeter" && isset($_POST['expected_barcode']) && isset($_POST['id_meter_type'])) {
        DbServices::declareWaitMeter(trim($_POST['expected_barcode']), intval($_POST['id_meter_type']));
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
        $stmt = $conn->prepare("SELECT id, meter_type, qty_box, model_code, contrat, nomenclature FROM meter_type");
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // FONCTION PRIVÉE UTILITAIRE : Cherche un carton ouvert ou en crée un
    private static function getOrCreateBox($conn, $id_meter_type, $qtyLimit, $typeName) {
        // IMPORTANT : On vérifie que le carton "open" a physiquement de la place (< qtyLimit)
        $queryBox = "SELECT b.id, b.box_number FROM box b 
                     WHERE b.status = 'open' 
                     AND (
                        (SELECT COUNT(*) FROM meter m WHERE m.id_box = b.id) = 0 
                        OR 
                        (SELECT id_meter_type FROM meter m WHERE m.id_box = b.id LIMIT 1) = :id_type
                     ) 
                     AND (SELECT COUNT(*) FROM meter m WHERE m.id_box = b.id) < :qtyLimit
                     ORDER BY b.id ASC LIMIT 1";
        
        $stmtBox = $conn->prepare($queryBox);
        $stmtBox->execute([':id_type' => $id_meter_type, ':qtyLimit' => $qtyLimit]);

        if ($stmtBox->rowCount() > 0) {
            $box = $stmtBox->fetch(PDO::FETCH_ASSOC);
            return ["id" => $box['id'], "box_number" => $box['box_number']];
        } else {
            $prefix = "BX-" . $typeName . "-";
            $stmtLastBox = $conn->prepare("SELECT box_number FROM box WHERE box_number LIKE :prefix ORDER BY id DESC LIMIT 1");
            $stmtLastBox->execute([':prefix' => $prefix . '%']);
            
            if ($stmtLastBox->rowCount() > 0) {
                $lastBox = $stmtLastBox->fetch(PDO::FETCH_ASSOC)['box_number'];
                $parts = explode('-', $lastBox);
                $lastNum = intval(end($parts));
                $nextNum = str_pad($lastNum + 1, 2, '0', STR_PAD_LEFT);
            } else {
                $nextNum = "01";
            }
            
            $box_number = $prefix . $nextNum;
            $stmtNewBox = $conn->prepare("INSERT INTO box (box_number, status) VALUES (:box_num, 'open')");
            $stmtNewBox->execute([':box_num' => $box_number]);
            return ["id" => $conn->lastInsertId(), "box_number" => $box_number];
        }
    }

    static function packMeter($barcode, $id_meter_type) {
        $conn = Database::getConnection();

        // 1. Vérifier si le compteur existe déjà
        $stmtCheck = $conn->prepare("
            SELECT m.id, m.id_box, m.status as meter_status, b.status as box_status 
            FROM meter m 
            LEFT JOIN box b ON m.id_box = b.id 
            WHERE m.barcode = :barcode
        ");
        $stmtCheck->execute([':barcode' => $barcode]);
        
        $isResolvingWait = false;
        $id_box = null;

        if ($stmtCheck->rowCount() > 0) {
            $row = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            
            if ($row['meter_status'] === 'wait') {
                // RÉGULARISATION : Le compteur "wait" vient d'être scanné !
                $isResolvingWait = true;
                $id_box = $row['id_box'];
                
                $stmtUpdate = $conn->prepare("UPDATE meter SET status = 'packed', update_date = CURRENT_TIMESTAMP WHERE barcode = :barcode");
                $stmtUpdate->execute([':barcode' => $barcode]);
            } else {
                echo json_encode([
                    "state" => "already_packed", 
                    "message" => "Ce compteur (Code: $barcode) est déjà emballé !",
                    "id_box" => $row['id_box'],
                    "box_status" => $row['box_status']
                ]);
                exit;
            }
        }

        // 2. Limite du carton
        $stmtType = $conn->prepare("SELECT meter_type, qty_box FROM meter_type WHERE id = :id");
        $stmtType->execute([':id' => $id_meter_type]);
        $typeInfo = $stmtType->fetch(PDO::FETCH_ASSOC);
        $qtyLimit = $typeInfo['qty_box'];
        $typeName = $typeInfo['meter_type'];

        // 3. Traitement d'un NOUVEAU compteur (pas une régularisation)
        if (!$isResolvingWait) {
            // Vérification stricte de la séquence
            $stmtLastGlobal = $conn->prepare("SELECT barcode FROM meter WHERE id_meter_type = :id_type ORDER BY id DESC LIMIT 1");
            $stmtLastGlobal->execute([':id_type' => $id_meter_type]);
            
            if ($stmtLastGlobal->rowCount() > 0) {
                $lastBarcode = $stmtLastGlobal->fetch(PDO::FETCH_ASSOC)['barcode'];
                $expectedBarcode = str_pad(intval($lastBarcode) + 1, strlen($lastBarcode), '0', STR_PAD_LEFT);
                
                if ($barcode !== $expectedBarcode) {
                    echo json_encode([
                        "state" => "sequence_broken",
                        "expected" => $expectedBarcode,
                        "scanned" => $barcode,
                        "message" => "Le dernier compteur était le $lastBarcode."
                    ]);
                    exit;
                }
            }

            // Insertion du nouveau compteur
            $boxData = self::getOrCreateBox($conn, $id_meter_type, $qtyLimit, $typeName);
            $id_box = $boxData['id'];
            $box_number = $boxData['box_number'];

            $stmtInsert = $conn->prepare("INSERT INTO meter (barcode, id_meter_type, id_box, status) VALUES (:barcode, :id_type, :id_box, 'packed')");
            $stmtInsert->execute([':barcode' => $barcode, ':id_type' => $id_meter_type, ':id_box' => $id_box]);
        } else {
            // Récupérer le numéro du carton existant pour l'affichage
            $stmtBoxNum = $conn->prepare("SELECT box_number FROM box WHERE id = :id_box");
            $stmtBoxNum->execute([':id_box' => $id_box]);
            $box_number = $stmtBoxNum->fetch(PDO::FETCH_ASSOC)['box_number'];
        }

        // 4. Récupérer tous les compteurs du carton et vérifier la présence de 'wait'
        $stmtAllMeters = $conn->prepare("SELECT barcode, create_date, status FROM meter WHERE id_box = :id_box ORDER BY id DESC");
        $stmtAllMeters->execute([':id_box' => $id_box]);
        $allMeters = $stmtAllMeters->fetchAll(PDO::FETCH_ASSOC);
        $currentQty = count($allMeters);
        
        $hasWaitMeters = false;
        foreach($allMeters as $m) {
            if ($m['status'] === 'wait') {
                $hasWaitMeters = true;
                break;
            }
        }

        $message = "success";
        
        // 5. Fermeture du carton si plein ET sans compteurs "wait"
        if ($currentQty >= $qtyLimit && !$hasWaitMeters) {
            $stmtClose = $conn->prepare("UPDATE box SET status = 'closed' WHERE id = :id_box");
            $stmtClose->execute([':id_box' => $id_box]);
            $message = "box-full";
            
        } else if ($isResolvingWait) {
            // CORRECTION ICI : On donne la priorité au message de régularisation.
            // Ainsi, l'interface ne se vide pas et vous voyez le 008 passer au vert 
            // pendant que le 007 reste jaune.
            $message = "wait-resolved";
            
        } else if ($currentQty >= $qtyLimit && $hasWaitMeters) {
            // Le carton se remplit physiquement avec un nouveau scan, mais bloqué par des 'wait'
            $message = "box-full-wait"; 
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
            "all_meters" => $allMeters
        ]);
    }

    static function declareWaitMeter($barcode, $id_meter_type) {
        $conn = Database::getConnection();
        
        $stmtType = $conn->prepare("SELECT meter_type, qty_box FROM meter_type WHERE id = :id");
        $stmtType->execute([':id' => $id_meter_type]);
        $typeInfo = $stmtType->fetch(PDO::FETCH_ASSOC);
        $qtyLimit = $typeInfo['qty_box'];
        $typeName = $typeInfo['meter_type'];

        // On obtient un carton (cela réserve physiquement l'emplacement pour le compteur manquant)
        $boxData = self::getOrCreateBox($conn, $id_meter_type, $qtyLimit, $typeName);
        $id_box = $boxData['id'];

        $stmtInsert = $conn->prepare("INSERT INTO meter (barcode, id_meter_type, id_box, status) VALUES (:barcode, :id_type, :id_box, 'wait')");
        if ($stmtInsert->execute([':barcode' => $barcode, ':id_type' => $id_meter_type, ':id_box' => $id_box])) {
            echo json_encode(["state" => "s"]);
        } else {
            echo json_encode(["state" => "f", "message" => "Erreur lors de la déclaration."]);
        }
    }

    static function getPackedMetersOfBox($id_box) {
        $conn = Database::getConnection();
        $stmt = $conn->prepare("SELECT m.barcode, m.create_date, m.status, t.meter_type 
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
            
            // NOUVEAU : Récupération du statut pour conserver la couleur
            $stmtAllMeters = $conn->prepare("SELECT barcode, create_date, status FROM meter WHERE id_box = :id_box ORDER BY id DESC");
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