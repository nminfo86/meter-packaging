<!--Start Header-->
<!--Navbar -->
<nav class="mb-1 navbar navbar-expand-lg navbar-dark bg-info">
    <input id="userNameHeader" class="d-none" value = "<?php // echo isset($_SESSION["username"]) ? $_SESSION['username'] : ''  ?>"/>
    <div class="container">
        <a class="navbar-brand" href="index.php"><img src="images/misc/SaiegLogo.png" alt="Saieg Logo" style="height:36px; margin-right:8px; vertical-align:middle;">METER PACKAGING</a>
        <a class="navbar-brand" href="palette.php">BOX PACKAGING</a>
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


            </ul>

        </div>
    </div>
</nav>
<!--/.Navbar -->

<div id="divLoadingcms" class="d-none">

    <img src="images/misc/loading.svg">

</div>

<!--End Header-->