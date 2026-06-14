<!--Start Header-->
<!--Navbar -->
<nav class="mb-1 navbar navbar-expand-lg navbar-dark bg-info">
    <input id="userNameHeader" class="d-none" value = "<?php // echo isset($_SESSION["username"]) ? $_SESSION['username'] : ''  ?>"/>
    <div class="container">
        <a class="navbar-brand" href="#">PACKAGING SOFTWARE</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent-333"
                aria-controls="navbarSupportedContent-333" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent-333">
            <ul class="navbar-nav mr-auto">
                <li class="nav-item dropdown adminOptions active d-none">
                    <a class="nav-link dropdown-toggle" href="" id="dropdown06" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Gestion de contenu</a>
                    <div class="dropdown-menu" aria-labelledby="dropdown06">
                        <a class="dropdown-item" href="adminPanel.php">Tableau de bord</a>
                    </div>
                </li>
                <li class="nav-item "><a href="../mycms/logout.php" class="nav-link ">Logout</a></li>

            </ul>
            <ul class="navbar-nav ml-auto nav-flex-icons">                
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="" id="navbarDropdownMenuLink-333" data-toggle="dropdown"
                       aria-haspopup="true" aria-expanded="false">
                        <i class="fas fa-user"></i>
                    </a>
                    <div class="dropdown-menu dropdown-menu-right dropdown-default"
                         aria-labelledby="navbarDropdownMenuLink-333">
                        <a class="dropdown-item" href="#">Profile</a>
                        <a class="dropdown-item" href="#">Utilisateurs</a>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</nav>
<!--/.Navbar -->

<div id="divLoadingcms" class="d-none">

    <img src="images/misc/loading.svg">

</div>

<!--End Header-->