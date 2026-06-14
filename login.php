<?php
require_once (__DIR__ . "/php/functions.php");

if (loggedIn()) {
    autoRedirect($_SESSION["username"]);
} 
?>

<?php include "includes/head.php"; ?> <!-- head -->

<body id="Login">

    <section class="container">

        <!--Start Header-->
        <!--End Header-->

        <div class="page-header">
            <h1>Login</h1>
        </div>

            <div id="myAlert" class="alert alert-dismissable hidden text-center resize-div">
                <button  type= "button"  class="close" data-dismiss="alert" aria-hidden="true"> &times;</button>
            </div>
        <!--loading image-->
        <div id="loadingImage" class="hidden" style="text-align:center"><img src="images/misc/ajax-loader.gif"></div>

        <div id ="formDiv" class="resize-div">
            <form id ="loginForm" class="form-horizontal">
                <div class="validation-div hide-div">
                </div>
                <div class="form-group">
                    <label for="username" class="col-sm-3 control-label">Nom d'utilisateur</label>
                    <div class="col-sm-9">
                        <input type="text" class="form-control" name = "username" id="username" placeholder="Nom d'utilisateur" validation="NOTEMPTY,MIXED,TRIM">
                    </div>
                </div>
                <div class="form-group">
                    <label for="password" class="col-sm-3 control-label">Mot de passe</label>
                    <div class="col-sm-9">
                        <input type="password" class="form-control" name = "password" id="password" placeholder="Mot de passe" validation="NOSPACE,NOTEMPTY">
                    </div>
                </div>
                <div class="form-group">
                    <div class="col-sm-offset-3 col-sm-5">
                        <button type="submit" class="btn btn-default btn-success">Se connecter</button>
                    </div>
                </div>
            </form>
        </div>

        <!--Start Footer -->
       <?php include "includes/footer.php"; ?>
        <!--End Footer -->

    </section><!-- end container -->

    <?php include "includes/leg.php"; ?> <!-- leg-->
    <script src="js/ajaxLogin.js?n=1"></script>
</body>

</html>