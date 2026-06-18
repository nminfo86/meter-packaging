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

    // --- NOUVELLES ROUTES POUR LA GESTION DES PALETTES ---
    if ($_POST['function'] == "packBox" && isset($_POST['box_number']) && isset($_POST['id_meter_type'])) {
        DbServices::packBox(trim($_POST['box_number']), intval($_POST['id_meter_type']));
    }
    if ($_POST['function'] == "reopenPalette" && isset($_POST['id_palette'])) {
        DbServices::reopenPalette(intval($_POST['id_palette']));
    }
    if ($_POST['function'] == "getPalettePrintData" && isset($_POST['id_palette'])) {
        DbServices::getPalettePrintData(intval($_POST['id_palette']));
    }
}

class DbServices {

    static function getMeterTypes() {
        $conn = Database::getConnection();
        $stmt = $conn->prepare("SELECT * FROM meter_type");
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // FONCTION PRIVÉE UTILITAIRE : Cherche un carton ouvert ou en crée un
    private static function getOrCreateBox($conn, $id_meter_type, $qtyLimit, $typeName, $barcode) {
        // Extraction de l'année depuis le code-barres (3ème et 4ème caractère)
        $production_year = substr($barcode, 2, 2);
        $prefix = "BX-" . $typeName . "-" . $production_year . "-";

        // IMPORTANT : On vérifie que le carton "open" appartient à la MÊME ANNÉE
        $queryBox = "SELECT b.id, b.box_number FROM box b 
                     WHERE b.status = 'open' 
                     AND b.box_number LIKE :box_prefix
                     AND (
                        (SELECT COUNT(*) FROM meter m WHERE m.id_box = b.id) = 0 
                        OR 
                        (SELECT id_meter_type FROM meter m WHERE m.id_box = b.id LIMIT 1) = :id_type
                     ) 
                     AND (SELECT COUNT(*) FROM meter m WHERE m.id_box = b.id) < :qtyLimit
                     ORDER BY b.id ASC LIMIT 1";
        
        $stmtBox = $conn->prepare($queryBox);
        $stmtBox->execute([':box_prefix' => $prefix . '%', ':id_type' => $id_meter_type, ':qtyLimit' => $qtyLimit]);

        if ($stmtBox->rowCount() > 0) {
            $box = $stmtBox->fetch(PDO::FETCH_ASSOC);
            return ["id" => $box['id'], "box_number" => $box['box_number']];
        } else {
            // Chercher le dernier carton UNIQUEMENT pour cette année
            $stmtLastBox = $conn->prepare("SELECT box_number FROM box WHERE box_number LIKE :prefix ORDER BY id DESC LIMIT 1");
            $stmtLastBox->execute([':prefix' => $prefix . '%']);
            
            if ($stmtLastBox->rowCount() > 0) {
                $lastBox = $stmtLastBox->fetch(PDO::FETCH_ASSOC)['box_number'];
                $parts = explode('-', $lastBox);
                $lastNum = intval(end($parts));
                $nextNum = str_pad($lastNum + 1, 5, '0', STR_PAD_LEFT); // Sur 5 chiffres (ex: 00001)
            } else {
                $nextNum = "00001"; // Réinitialisation à 00001 pour la nouvelle année
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
                
                // NOUVEAU : On extrait les années pour comparer
                $scannedYear = substr($barcode, 2, 2);
                $lastBarcodeYear = substr($lastBarcode, 2, 2);

                // On ne vérifie la séquence QUE si on est dans la même année de production
                // (Cela évite l'erreur au passage au premier janvier)
                if ($scannedYear === $lastBarcodeYear) {
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
            }

            // NOUVEAU : On passe $barcode à la fonction pour déduire l'année
            $boxData = self::getOrCreateBox($conn, $id_meter_type, $qtyLimit, $typeName, $barcode);
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

        // On passe $barcode
        $boxData = self::getOrCreateBox($conn, $id_meter_type, $qtyLimit, $typeName, $barcode);
        $id_box = $boxData['id'];

        $stmtInsert = $conn->prepare("INSERT INTO meter (barcode, id_meter_type, id_box, status) VALUES (:barcode, :id_type, :id_box, 'wait')");
// ... suite inchangée
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

    // ========================================================================
    // GESTION DES PALETTES (PACKING PALETTE)
    // ========================================================================

    private static function getOrCreatePalette($conn, $id_meter_type, $qtyLimitPalette, $typeName, $box_number) {
        // Extraction de l'année depuis le numéro du carton (ex: BX-SGM12-DL-26-00001)
        $parts = explode('-', $box_number);
        $production_year = $parts[count($parts) - 2]; // L'avant-dernière partie est toujours l'année
        
        $prefix = "PL-" . $typeName . "-" . $production_year . "-";

        // Chercher une palette ouverte de la même année
        $queryPalette = "SELECT p.id, p.palette_number 
                         FROM palette p 
                         WHERE p.status = 'open' 
                         AND p.palette_number LIKE :pal_prefix
                         AND (
                            (SELECT COUNT(*) FROM box b WHERE b.id_palette = p.id) = 0 
                            OR 
                            (SELECT m.id_meter_type FROM meter m JOIN box b ON m.id_box = b.id WHERE b.id_palette = p.id LIMIT 1) = :id_type
                         ) 
                         AND (SELECT COUNT(*) FROM box b WHERE b.id_palette = p.id) < :qtyLimit
                         ORDER BY p.id ASC LIMIT 1";
        
        $stmtPal = $conn->prepare($queryPalette);
        $stmtPal->execute([':pal_prefix' => $prefix . '%', ':id_type' => $id_meter_type, ':qtyLimit' => $qtyLimitPalette]);

        if ($stmtPal->rowCount() > 0) {
            $palette = $stmtPal->fetch(PDO::FETCH_ASSOC);
            return ["id" => $palette['id'], "palette_number" => $palette['palette_number']];
        } else {
            $stmtLastPal = $conn->prepare("SELECT palette_number FROM palette WHERE palette_number LIKE :prefix ORDER BY id DESC LIMIT 1");
            $stmtLastPal->execute([':prefix' => $prefix . '%']);
            
            if ($stmtLastPal->rowCount() > 0) {
                $lastPal = $stmtLastPal->fetch(PDO::FETCH_ASSOC)['palette_number'];
                $partsPal = explode('-', $lastPal);
                $lastNum = intval(end($partsPal));
                $nextNum = str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT); // Sur 4 chiffres
            } else {
                $nextNum = "0001"; // Réinitialisation de la palette à 0001
            }
            
            $palette_number = $prefix . $nextNum;
            $stmtNewPal = $conn->prepare("INSERT INTO palette (palette_number, status) VALUES (:pal_num, 'open')");
            $stmtNewPal->execute([':pal_num' => $palette_number]);
            return ["id" => $conn->lastInsertId(), "palette_number" => $palette_number];
        }
    }

    static function packBox($box_number, $id_meter_type) {
        $conn = Database::getConnection();

        // 1. Vérifier si le carton existe et récupérer ses infos
        $stmtBox = $conn->prepare("SELECT id, status, id_palette FROM box WHERE box_number = :box_num");
        $stmtBox->execute([':box_num' => $box_number]);

        if ($stmtBox->rowCount() == 0) {
            echo json_encode(["state" => "f", "message" => "Carton introuvable dans la base de données."]);
            exit;
        }

        $boxInfo = $stmtBox->fetch(PDO::FETCH_ASSOC);
        $id_box = $boxInfo['id'];

        // 2. Vérifier que le carton est bien "fermé" (complet avec ses compteurs)
        if ($boxInfo['status'] !== 'closed') {
            echo json_encode(["state" => "f", "message" => "Ce carton n'est pas encore fermé/complet. Impossible de le palettiser."]);
            exit;
        }

        // 3. Vérifier le type de compteur contenu dans ce carton
        $stmtTypeCheck = $conn->prepare("SELECT id_meter_type FROM meter WHERE id_box = :id_box LIMIT 1");
        $stmtTypeCheck->execute([':id_box' => $id_box]);
        $boxTypeInfo = $stmtTypeCheck->fetch(PDO::FETCH_ASSOC);

        if (!$boxTypeInfo || $boxTypeInfo['id_meter_type'] != $id_meter_type) {
            echo json_encode(["state" => "f", "message" => "Erreur : Ce carton ne contient pas le modèle sélectionné pour cette palette."]);
            exit;
        }

        // 4. Vérifier si le carton est déjà dans une palette
        if (!empty($boxInfo['id_palette'])) {
            $stmtPalCheck = $conn->prepare("SELECT status FROM palette WHERE id = :id_pal");
            $stmtPalCheck->execute([':id_pal' => $boxInfo['id_palette']]);
            $palStatus = $stmtPalCheck->fetch(PDO::FETCH_ASSOC)['status'];

            echo json_encode([
                "state" => "already_packed",
                "message" => "Ce carton est déjà assigné à une palette !",
                "id_palette" => $boxInfo['id_palette'],
                "palette_status" => $palStatus
            ]);
            exit;
        }

        // 5. Récupérer les limites de la palette pour ce modèle
        $stmtType = $conn->prepare("SELECT meter_type, qty_box_palette FROM meter_type WHERE id = :id");
        $stmtType->execute([':id' => $id_meter_type]);
        $typeData = $stmtType->fetch(PDO::FETCH_ASSOC);
        $qtyLimitPalette = $typeData['qty_box_palette'];
        $typeName = $typeData['meter_type'];

        // 6. Affecter à une palette existante ou nouvelle
        // NOUVEAU : On passe $box_number pour extraire l'année
        $palData = self::getOrCreatePalette($conn, $id_meter_type, $qtyLimitPalette, $typeName, $box_number);
        $id_palette = $palData['id'];
        $palette_number = $palData['palette_number'];

        // Mise à jour du carton
        $stmtUpdateBox = $conn->prepare("UPDATE box SET id_palette = :id_pal, update_date = CURRENT_TIMESTAMP WHERE id = :id_box");
        $stmtUpdateBox->execute([':id_pal' => $id_palette, ':id_box' => $id_box]);

        // 7. Vérifier si la palette est pleine après cet ajout
        $stmtAllBoxes = $conn->prepare("SELECT id, box_number, update_date FROM box WHERE id_palette = :id_pal ORDER BY id DESC");
        $stmtAllBoxes->execute([':id_pal' => $id_palette]);
        $allBoxes = $stmtAllBoxes->fetchAll(PDO::FETCH_ASSOC);
        $currentQty = count($allBoxes);

        $message = "success";

        if ($currentQty >= $qtyLimitPalette) {
            $stmtClose = $conn->prepare("UPDATE palette SET status = 'closed', update_date = CURRENT_TIMESTAMP WHERE id = :id_pal");
            $stmtClose->execute([':id_pal' => $id_palette]);
            $message = "palette-full";
        }

        echo json_encode([
            "state" => "s",
            "message" => $message,
            "palette_number" => $palette_number,
            "id_palette" => $id_palette,
            "packed_palette_qte" => "$currentQty/$qtyLimitPalette",
            "meter_type_name" => $typeName,
            "all_boxes" => $allBoxes
        ]);
    }

    static function reopenPalette($id_palette) {
        $conn = Database::getConnection();
        
        // Obtenir les infos de la palette
        $stmtPal = $conn->prepare("SELECT p.palette_number, t.meter_type, t.qty_box_palette 
                                   FROM palette p
                                   JOIN box b ON b.id_palette = p.id
                                   JOIN meter m ON m.id_box = b.id
                                   JOIN meter_type t ON m.id_meter_type = t.id
                                   WHERE p.id = :id_palette LIMIT 1");
        $stmtPal->execute([':id_palette' => $id_palette]);

        if ($stmtPal->rowCount() > 0) {
            $palInfo = $stmtPal->fetch(PDO::FETCH_ASSOC);
            $typeName = $palInfo['meter_type'];
            $qtyLimit = $palInfo['qty_box_palette'];
            $palette_number = $palInfo['palette_number'];

            $stmtAllBoxes = $conn->prepare("SELECT id, box_number, update_date FROM box WHERE id_palette = :id_palette ORDER BY id DESC");
            $stmtAllBoxes->execute([':id_palette' => $id_palette]);
            $allBoxes = $stmtAllBoxes->fetchAll(PDO::FETCH_ASSOC);
            $currentQty = count($allBoxes);

            echo json_encode([
                "state" => "s",
                "palette_number" => $palette_number,
                "id_palette" => $id_palette,
                "packed_palette_qte" => "$currentQty/$qtyLimit",
                "meter_type_name" => $typeName,
                "all_boxes" => $allBoxes
            ]);
        } else {
            echo json_encode(["state" => "f", "message" => "Palette introuvable ou vide."]);
        }
    }

    static function getPalettePrintData($id_palette) {
        $conn = Database::getConnection();

        // Obtenir info globale
        $stmtPal = $conn->prepare("SELECT p.palette_number, t.meter_type, p.update_date  
                                   FROM palette p
                                   JOIN box b ON b.id_palette = p.id
                                   JOIN meter m ON m.id_box = b.id
                                   JOIN meter_type t ON m.id_meter_type = t.id
                                   WHERE p.id = :id_palette LIMIT 1");
        $stmtPal->execute([':id_palette' => $id_palette]);
        $info = $stmtPal->fetch(PDO::FETCH_ASSOC);

        // Obtenir la liste des cartons et des compteurs
        $stmtBoxes = $conn->prepare("SELECT id, box_number FROM box WHERE id_palette = :id_palette ORDER BY box_number ASC");
        $stmtBoxes->execute([':id_palette' => $id_palette]);
        $boxesResult = $stmtBoxes->fetchAll(PDO::FETCH_ASSOC);

        $printBoxes = [];
        foreach ($boxesResult as $box) {
            $stmtMeters = $conn->prepare("SELECT barcode FROM meter WHERE id_box = :id_box ORDER BY barcode ASC");
            $stmtMeters->execute([':id_box' => $box['id']]);
            $meters = $stmtMeters->fetchAll(PDO::FETCH_COLUMN); // Récupère uniquement le tableau des code-barres

            $printBoxes[] = [
                "box_number" => $box['box_number'],
                "meters" => $meters
            ];
        }

        echo json_encode([
            "state" => "s",
            "palette_number" => $info['palette_number'],
            "meter_type_name" => $info['meter_type'],
            "update_date" => $info['update_date'],
            "boxes" => $printBoxes
        ]);
    }
}
?>