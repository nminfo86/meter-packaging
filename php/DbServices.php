<?php

require_once "Database.php";
require_once "functions.php";
require_once "Config.php";

if (isset($_POST['function'])) {

    if (($_POST['function'] == "getTestStatus") && (isset($_POST['station'])) && (isset($_POST['QR']))) {
        DbServices::getTestStatus($_POST['station'], $_POST['QR'], True);
    }
    if (($_POST['function'] == "getProductLastMvt") &&  (isset($_POST['QR']))) {
        DbServices::getProductLastMvt($_POST['QR'], True);
    }
    if (($_POST['function'] == "getBoxOfPackaging") && (isset($_POST['PO']))) {
        DbServices::getBoxOfPackaging($_POST['PO']);
    }
    if (($_POST['function'] == "getBoxOfPackedProduct") && (isset($_POST['QR']))) {
        DbServices::getBoxOfPackedProduct($_POST['QR']);
    }
    if (($_POST['function'] == "closeBox") && (isset($_POST['id_box']))) {
        DbServices::closeBox($_POST['id_box']);
    }
    if (($_POST['function'] == "getPackedProductsOfBox") && (isset($_POST['id_box']))) {
        DbServices::getPackedProductsOfBox($_POST['id_box']);
    }
    if (($_POST['function'] == "packProduct") && (isset($_POST['id_box'])) && (isset($_POST['QR'])) && (isset($_POST['PO'])) && (isset($_POST['sn'])) && (isset($_POST['name']))) {
        DbServices::packProduct($_POST['id_box'],$_POST['QR'], $_POST['PO'], $_POST['sn'], $_POST['name']);
    }
}

class DbServices {

    static function createBox($PO) {
        $conn = Database::getConnection();

        $query = "INSERT INTO " .
                " Box " .
                " (boxNumber,status,box_PO)" .
                " VALUES " .
                " (:boxNumber, :status, :box_PO)";

        $stmt = $conn->prepare($query);

        $stmt->bindValue(':boxNumber', DbServices::getInsertBoxNumber($PO), PDO::PARAM_STR);
        $stmt->bindValue(':status', Config::$box_status_open, PDO::PARAM_STR);
        $stmt->bindValue(':box_PO', $PO, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }

        $query = "SELECT TOP 1" .
                " * " .
                " FROM " .
                " Box " .
                " ORDER BY " .
                " id " .
                " DESC";
        $stmt = $conn->prepare($query);
        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }
        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($output);
    }

//This function return the Box number to be inserted while creating a new box
    static function getInsertBoxNumber($PO) {
        $conn = Database::getConnection();
        $query = "Select " .
                " count(id) as number" .
                " FROM " .
                " Box " .
                " WHERE " .
                " box_PO" . " = :PO";

        $stmt = $conn->prepare($query);
        $stmt->bindParam(':PO', $PO, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }
        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);
        return $PO . "-" . ($output[0]["number"] + 1);
    }

    static function geData($extractData) {
        $conn = Database::getConnection();
        $query = "SELECT *" .
                " FROM " .
                " ProductInfo " .
                " WHERE " .
                "ProductInfo.Station = 'packaging'";

        $stmt = $conn->prepare($query);
//        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }
        if ($stmt->rowCount() == 0) {
            if ($extractData) {
                echo json_encode(array("state" => "f", "message" => Config::$no_data_found));
                exit;
            }
        }
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $output[] = $row;
        }
        if ($extractData) {
            echo json_encode($output);
        }
        return $output;
    }

    static function getTestStatus($station, $QR, $extractData) {
        $conn = Database::getConnection();
        $query = "SELECT " . " TestStatus " .
                " FROM " .
                " ProductInfo " .
                " WHERE " .
                "Station" . "= :station" .
                " AND " .
                " QR" . "= :QR";

        $stmt = $conn->prepare($query);

        $stmt->bindValue(':station', $station, PDO::PARAM_STR);
        $stmt->bindValue(':QR', $QR, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }
        if ($stmt->rowCount() == 0) {
            if ($extractData) {
                echo json_encode(array("state" => "f", "message" => Config::$no_data_found));
                exit;
            }
        }

        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($extractData) {
            echo json_encode($output);
        }
        return $output;
    }

    static function getBoxOfPackaging($PO) {
        $conn = Database::getConnection();
        $query = "SELECT " . " * " .
                " FROM " .
                " Box " .
                " WHERE " .
                " box_PO" . "= :PO" .
                " AND " .
                " status" . " = 'open'";

        $stmt = $conn->prepare($query);

        $stmt->bindValue(':PO', $PO, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }
        if ($stmt->rowCount() == 0) {
            DbServices::createBox($PO);
            exit;
        }

        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($output);

        return $output;
    }
    
    static function getBoxOfPackedProduct($QR) {
        $conn = Database::getConnection();

        $query = " SELECT Box.* " .
                 " , ProductInfo_Laser.id_box , ProductInfo_Laser.QR".
                 " FROM ".
                 " Box " .
                 " JOIN " .
                 " ProductInfo_Laser " .
                 " ON " .
                 " Box.id = ProductInfo_Laser.id_box".
                 " WHERE ".
                 " ProductInfo_Laser.QR" . " = :QR";

        $stmt = $conn->prepare($query);

        $stmt->bindValue(':QR', $QR, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }

        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($output);

        return $output;
    }

    static function packProduct($id_box, $QR, $PO, $sn, $name) {
        $conn = Database::getConnection();

        //Update ProductInfoLaser table
        $query1 = " UPDATE " . " ProductInfo_Laser " .
                " SET " .
                " IsPackage" . "= 1" .
                " , " .
                " id_box" . "= :id_box" .
                " WHERE " .
                " QR " . "= :QR";

//        print_r($query1);
        $stmt1 = $conn->prepare($query1);

        $stmt1->bindValue(':id_box', $id_box, PDO::PARAM_INT);
        $stmt1->bindValue(':QR', $QR, PDO::PARAM_STR);

        if (!$stmt1->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt1) . " " . __FUNCTION__." Query 1");
            exit;
        }
        
        //Create Mouvement "Packaging -OK" in ProductInfo table
        $query2 = "INSERT INTO " .
                " ProductInfo " .
                " (PO, QR, SerialNo, CreateTime, ProName, Station, TestStatus)" .
                " VALUES " .
                " (:PO, :QR, :SerialNo, :CreateTime, :ProName, :Station, :TestStatus)";

        $stmt2 = $conn->prepare($query2);

        $stmt2->bindValue(':PO', $PO, PDO::PARAM_STR);
        $stmt2->bindValue(':QR', $QR, PDO::PARAM_STR);
        $stmt2->bindValue(':SerialNo', $sn, PDO::PARAM_STR);
        $stmt2->bindValue(':CreateTime', date("d-m-Y h:i"), PDO::PARAM_STR);
        $stmt2->bindValue(':ProName', $name, PDO::PARAM_STR);
        $stmt2->bindValue(':Station', "Packaging", PDO::PARAM_STR);
        $stmt2->bindValue(':TestStatus', "OK", PDO::PARAM_STR);

        if (!$stmt2->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt2) . " " . __FUNCTION__." Query 2");
            exit;
        }
        
        //Close Box management
        if (DbServices::countBoxPackedProducts($id_box) == getBoxQteLimit($PO)) {
            DbServices::closeBox($id_box);
              echo json_encode(array(
                "state" => "s",
                "message" => Config::$box_full,
                "box" => DbServices::getBoxById($id_box),
                "packed_box_qte"=>(DbServices::countBoxPackedProducts($id_box)."/".getBoxQteLimit($PO)),
                "packed_po_qte"=>DbServices::countPOPackedProducts($PO)
                    ));
        } else {

            echo json_encode(array(
                "state" => "s", 
                "box" => DbServices::getBoxById($id_box),
                "packed_box_qte"=>(DbServices::countBoxPackedProducts($id_box)."/".getBoxQteLimit($PO)),
                "packed_po_qte"=>DbServices::countPOPackedProducts($PO)
                    ));
        }
    }

    static function closeBox($id_box) {
        $conn = Database::getConnection();

        //Update ProductInfoLaser table
        $query = " UPDATE " . " Box " .
                " SET " .
                " status" . "= 'closed'" .
                " WHERE " .
                " id " . "= :id_box";
 
        $stmt = $conn->prepare($query);

        $stmt->bindValue(':id_box', $id_box, PDO::PARAM_INT);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt1) . " " . __FUNCTION__);
            exit;
        }
    }
    
    static function countBoxPackedProducts($id_box){
         $conn = Database::getConnection();
        $query = "Select " .
                " count(id) as number".
                " FROM " . 
                "ProductInfo_Laser" .
                " WHERE ".
                "id_box =:id_box";

        $stmt = $conn->prepare($query);
        $stmt->bindValue(':id_box', $id_box, PDO::PARAM_INT);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }

        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);

            return $output[0]["number"];
    }
    
    static function countPOPackedProducts($PO){
         $conn = Database::getConnection();
        $query = "Select " .
                " count(id) as number".
                " FROM " . 
                "ProductInfo_Laser" .
                " WHERE ".
                "PO =:PO".
                " AND ".
                " IsPackage = '1'";

        $stmt = $conn->prepare($query);
        $stmt->bindValue(':PO', $PO, PDO::PARAM_INT);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }

        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);

            return $output[0]["number"];
    }
    
    static function getBoxById($id_box){
         $conn = Database::getConnection();
        $query = "SELECT " . " * " .
                " FROM " .
                " Box " .
                " WHERE " .
                " id" . "= :id_box";

        $stmt = $conn->prepare($query);

        $stmt->bindValue(':id_box', $id_box, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }

        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);

            return $output[0]["boxNumber"];
    }
    
    static function getPackedProductsOfBox($id_box){
         $conn = Database::getConnection();
        $query = "SELECT " .
                 " ProductInfo_Laser.PO , ProductInfo_Laser.QR , ProductInfo_Laser.SerialNo , ProductInfo_Laser.IsPackage, ProductInfo_Laser.id_box ,".
                 " ProductInfo.ProName , ProductInfo.CreateTime".
                 " FROM ".
                 " ProductInfo_Laser " .
                 " JOIN " .
                 " ProductInfo " .
                 " ON " .
                 " ProductInfo_Laser.QR = ProductInfo.QR".
                 " WHERE ".
                 " ProductInfo_Laser.id_box" . " = :id_box".
                 " AND ".
                 "ProductInfo.Station = 'Packaging'";
        
//         print_r($query);

        $stmt = $conn->prepare($query);

        $stmt->bindValue(':id_box', $id_box, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }
        if ($stmt->rowCount() == 0) {
            echo json_encode(array("state" => "f", "message" => Config::$no_data_found));
            exit;
        }

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $output[] = $row;
        }
        echo json_encode($output);
    }

    static function  getProductLastMvt($QR,$extractData){
            $conn = Database::getConnection();
        $query = "SELECT TOP 1 " . " * " .
                " FROM " .
                " ProductInfo " .
                " WHERE " .
                " QR" . "= :QR ".
                " ORDER BY ProId DESC";
        $stmt = $conn->prepare($query);

        $stmt->bindValue(':QR', $QR, PDO::PARAM_STR);

        if (!$stmt->execute()) {
            echo json_encode(array("state" => "f", "message" => Config::$user_error . " " . __FUNCTION__));
            addTrace(getMsgPdoStmt($stmt) . " " . __FUNCTION__);
            exit;
        }
        if ($stmt->rowCount() == 0) {
            if ($extractData) {
                echo json_encode(array("state" => "f", "message" => Config::$no_data_found));
                exit;
            }
        }

        $output[] = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($extractData) {
            echo json_encode($output);
        }
        return $output;
        
    }
}

?>