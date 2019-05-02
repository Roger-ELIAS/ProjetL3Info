/*
    Fonction appelée lorsque le bouton "rejoindre" est sollicité. Émet par conséquent au serveur
    un event "joinGame" signifiant qu'une personne a rejoint une partie, et lui envoyant les informations
    de cette partie contenues dans les attributs du bouton que sont "gameName", "nbPlayers" et "nbPlayersMax".
*/

function joinGame () {
    $("#menu").fadeOut(function() {
        $("#chat").fadeIn();
    });

    $(this).attr("nbPlayers", parseInt($(this).attr("nbPlayers"), 10) + 1);
};


/*
    Fonction appelée lorsqu'un message doit être affiché dans le chat, dans le cas d'un event "newMessage".
    Ce-dernier est simplement append dans le chat qui a ici pour id "messages".
*/

function appendMessage (pseudo, message) {
    $('#messages').append("<p><b>" + pseudo + "</b> : " + message + "</p>");
};


/*
    Fonction permettant de modifier les informations sur une game lorsque par exemple un nouveau joueur a rejoint
    la partie, ou que cette-dernière est pleine et qu'il est nécessaire de al rendre inacessible a plus de joueurs.

    L'idée est que seules les deux dernières colonnes sont à modifier. En effet, le nom de la partie qui est la première
    colonne ne changera pas. Cependant, la deuxième colonne, qui est le nombre de joueurs, doit être modifié à chaque connexion
    de joueurs. Enfin, la dernière colonne, qui est celle du bouton, doit être également modifiée. En effet, le bouton contient
    dans ses attributs les informations de la partie, et il est donc nécessaire de modifier le nombre de joueurs.
*/

function updateGameDatas (gameName, nbPlayers, nbPlayersMax) {
  tr = "#" + gameName;
  index = 0;

  $(tr).find('td').each(function() {
        if (index == 1) {
            $(this).fadeOut(function() {
                $(this).html(nbPlayers.toString() + "/" + nbPlayersMax.toString());
                $(this).fadeIn();
            })
        }
        else if (index == 2) {
            $(this).attr("nbPlayers", nbPlayers);
            // rendre la partie inacessible si cette-dernière est pleine.
        }

        index += 1;
    });
};
