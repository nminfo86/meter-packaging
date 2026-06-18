<?php
require_once "Database.php";
require_once "Config.php";

if (isset($_POST['function'])) {
    
    // --- ROUTAGE INTELLIGENT POUR LE TRACKING ---
    if ($_POST['function'] == "trackItem" && isset($_POST['identifier'])) {
        $identifier = trim($_POST['identifier']);
        
        // Détecter le type d'élément scanné via son préfixe
        if (strpos($identifier, 'BX-') === 0) {
            DbStatistics::trackBox($identifier);
        } else if (strpos($identifier, 'PL-') === 0) {
            DbStatistics::trackPalette($identifier);
        } else {
            DbStatistics::trackMeter($identifier);
        }
    }
    
    // --- ROUTAGE POUR LES STATISTIQUES ---
    if ($_POST['function'] == "getStatistics") {
        DbStatistics::getStatistics($_POST);
    }
}

class DbStatistics {

    // 1. Rechercher un compteur spécifique
    static function trackMeter($barcode) {
        $conn = Database::getConnection();
        $stmt = $conn->prepare("
            SELECT m.barcode, m.create_date as packing_date, m.status as meter_status, 
                   t.meter_type, 
                   b.box_number, b.status as box_status,
                   p.palette_number, p.status as palette_status
            FROM meter m
            JOIN meter_type t ON m.id_meter_type = t.id
            LEFT JOIN box b ON m.id_box = b.id
            LEFT JOIN palette p ON b.id_palette = p.id
            WHERE m.barcode = :barcode
        ");
        $stmt->execute([':barcode' => $barcode]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["state" => "s", "item_type" => "meter", "data" => $stmt->fetch(PDO::FETCH_ASSOC)]);
        } else {
            echo json_encode(["state" => "f", "message" => "Enregistrement introuvable."]);
        }
    }

    // 2. Rechercher un carton spécifique
    static function trackBox($box_number) {
        $conn = Database::getConnection();
        
        // Obtenir les infos du carton et de sa palette
        $stmtBox = $conn->prepare("
            SELECT b.id, b.box_number, b.status as box_status, b.create_date, 
                   p.palette_number, p.status as palette_status
            FROM box b
            LEFT JOIN palette p ON b.id_palette = p.id
            WHERE b.box_number = :box_number
        ");
        $stmtBox->execute([':box_number' => $box_number]);
        
        if ($stmtBox->rowCount() == 0) {
            echo json_encode(["state" => "f", "message" => "Enregistrement introuvable."]);
            return;
        }
        $boxInfo = $stmtBox->fetch(PDO::FETCH_ASSOC);

        // Obtenir les compteurs dans ce carton
        $stmtMeters = $conn->prepare("
            SELECT m.barcode, m.status, m.create_date, t.meter_type
            FROM meter m
            JOIN meter_type t ON m.id_meter_type = t.id
            WHERE m.id_box = :id_box
            ORDER BY m.id ASC
        ");
        $stmtMeters->execute([':id_box' => $boxInfo['id']]);
        $meters = $stmtMeters->fetchAll(PDO::FETCH_ASSOC);

        // Déduire le modèle à partir du premier compteur (si le carton n'est pas vide)
        $boxInfo['meter_type'] = count($meters) > 0 ? $meters[0]['meter_type'] : "Vide";

        echo json_encode(["state" => "s", "item_type" => "box", "info" => $boxInfo, "contents" => $meters]);
    }

    // 3. Rechercher une palette spécifique
    static function trackPalette($palette_number) {
        $conn = Database::getConnection();
        
        // Obtenir les infos de la palette
        $stmtPal = $conn->prepare("SELECT id, palette_number, status, create_date FROM palette WHERE palette_number = :palette_number");
        $stmtPal->execute([':palette_number' => $palette_number]);
        
        if ($stmtPal->rowCount() == 0) {
            echo json_encode(["state" => "f", "message" => "Enregistrement introuvable."]);
            return;
        }
        $palInfo = $stmtPal->fetch(PDO::FETCH_ASSOC);

        // Obtenir les cartons dans cette palette et compter leurs compteurs
        $stmtBoxes = $conn->prepare("
            SELECT b.box_number, b.status, b.create_date, 
                   (SELECT COUNT(*) FROM meter m WHERE m.id_box = b.id) as meter_count
            FROM box b
            WHERE b.id_palette = :id_palette
            ORDER BY b.box_number ASC
        ");
        $stmtBoxes->execute([':id_palette' => $palInfo['id']]);
        $boxes = $stmtBoxes->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["state" => "s", "item_type" => "palette", "info" => $palInfo, "contents" => $boxes]);
    }


    // 4. Récupérer les statistiques globales
    static function getStatistics($params) {
        $conn = Database::getConnection();
        
        // Paramètres de filtrage optionnels
        $id_meter_type = (isset($params['id_meter_type']) && $params['id_meter_type'] !== 'all') ? intval($params['id_meter_type']) : null;
        $start_date = !empty($params['start_date']) ? $params['start_date'] : null;
        $end_date = !empty($params['end_date']) ? $params['end_date'] : null;
        $start_hour = (isset($params['start_hour']) && $params['start_hour'] !== '') ? intval($params['start_hour']) : null;
        $end_hour = (isset($params['end_hour']) && $params['end_hour'] !== '') ? intval($params['end_hour']) : null;

        // Déterminer si on regroupe par heure ou par jour
        $isOneDayContext = ($start_date && $end_date && $start_date === $end_date) || (!$start_date && !$end_date);
        $groupByHour = true;
        
        if ($start_hour === null && $end_hour === null && !$isOneDayContext) {
            $groupByHour = false;
        }

        // Construction du Select
        $sql = "SELECT DATE(m.create_date) as pack_date, t.meter_type, COUNT(m.id) as total_meters";
        if ($groupByHour) {
            $sql .= ", HOUR(m.create_date) as pack_hour ";
        }
        $sql .= " FROM meter m JOIN meter_type t ON m.id_meter_type = t.id WHERE 1=1 ";
        
        $execParams = [];

        if ($id_meter_type) {
            $sql .= " AND m.id_meter_type = :id_type ";
            $execParams[':id_type'] = $id_meter_type;
        }
        if ($start_date) {
            $sql .= " AND DATE(m.create_date) >= :start_date ";
            $execParams[':start_date'] = $start_date;
        }
        if ($end_date) {
            $sql .= " AND DATE(m.create_date) <= :end_date ";
            $execParams[':end_date'] = $end_date;
        }
        if ($start_hour !== null) {
            $sql .= " AND HOUR(m.create_date) >= :start_hour ";
            $execParams[':start_hour'] = $start_hour;
        }
        if ($end_hour !== null) {
            $sql .= " AND HOUR(m.create_date) <= :end_hour ";
            $execParams[':end_hour'] = $end_hour;
        }

        // Construction du Group By
        if ($groupByHour) {
            $sql .= " GROUP BY pack_date, pack_hour, t.meter_type ORDER BY pack_date ASC, pack_hour ASC";
        } else {
            $sql .= " GROUP BY pack_date, t.meter_type ORDER BY pack_date ASC";
        }

        $stmt = $conn->prepare($sql);
        $stmt->execute($execParams);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["state" => "s", "data" => $data]);
    }
}
?>