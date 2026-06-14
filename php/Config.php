<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Description of Config
 *
 * @author Nminfo
 */

date_default_timezone_set('Africa/Algiers');

class Config {


    public static $box_status_open = "open";
    public static $box_status_closed = "closed";
    
    public static $box_full = "box-full";
   

//************** ******************** MESSAGES ******************************************//
// Messages to display to users
// The messages in global.js file must be the same as these
// Please see js/global.js file

    public static $user_error = "Ooops! there was a problem. ";
// this message must be the same as the variable noDataFound in Global.js
    public static $no_data_found = "no-data-found";
    public static $data_exist = "data-exist";

    public static $user_not_found = "user-not-found";
    public static $user_still_blocked = "user-still-blocked";

//********************************** CONFIG VARIABLES ************************************//

    // The path of the log file ,
    // this variable is used in functions.php/addTrace()
    public static $log_file_path= "/logs/my-logs.log";

}

