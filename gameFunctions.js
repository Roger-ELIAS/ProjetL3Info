/*

*/

var generatePacket = function () {
  var paquet = [];

  /* for (let k = 1; k <= 13; ++k)
      paquet.push(k + "D");

  for (let k = 1; k <= 13; ++k)
      paquet.push(k + "C");

  for (let k = 1; k <= 13; ++k)
      paquet.push(k + "H"); */

  for (let k = 1; k <= 10; ++k)
      paquet.push(k + "S");

  return paquet;
}


/*

*/

var getRandomIntInclusive = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min +1)) + min;
}


/*

*/

var getCards = function (game) {
  var packet = generatePacket();
  var hands = [];

  for (let i = 0; i < game.nbPlayers; ++i) {
      var hand = [];
      for (let k = 0; k < 4; k++) {
        var rand = getRandomIntInclusive(0, packet.length - 1);
        hand.push(packet[rand]);
        packet.splice(rand, 1);
      }

      hands.push(hand);
  }

  var rand = getRandomIntInclusive(0, packet.length - 1);
  game.tas.push(packet[rand]);
  packet.splice(rand, 1);

  game.packet = packet;
  return hands;
}


/*

*/

var drawCard = function (game){
    var rand = getRandomIntInclusive(0, game.packet.length - 1);
    var card = game.packet[rand];

    game.packet.splice(rand, 1);

    if (game.packet.length == 0) {
        game.isFinished = true;
    }

    return card;
}


/*

*/

var startGame = function (socket, time, gameObj) {
  socket.emit("newMessage", "<p>Début de la partie dans " + "<b>" + time.toString() + " ...</b></p>");
  socket.broadcast.emit("newMessage", "<p>Début de la partie dans " + "<b>" + time.toString() + " ...</b></p>");

  if (time - 1 > 0) {
      gameObj.timeouts.push(setTimeout(function() {
          startGame(socket, time - 1, gameObj);
      }, 1000));
  }
  else {
    gameObj.timeouts.push(setTimeout(function() {
        socket.broadcast.emit("newMessage", "<p><b>DISTRIBUTION DES CARTES</b></p>");
        socket.emit("newMessage", "<p><b>DISTRIBUTION DES CARTES</b></p>");
    }, 1000));
  }
};


/*

*/

var timerMemorization = function(socket, time) {
  socket.emit("newMessage", "<p><b>" + time.toString() + "</b></p>");
  socket.broadcast.emit("newMessage", "<p><b>" + time.toString() + "</b></p>");

  if (time - 1 > 0) {
      setTimeout(function() {
          timerMemorization(socket, time - 1);
      }, 1000);
  }
  else {
    setTimeout(function() {
        socket.broadcast.emit("newMessage", "<p><b>LANCEMENT DU BLITZ, PUISSE LE SORT VOUS ÊTRE FAVORABLE !</b></p>");
        socket.emit("newMessage", "<p><b>LANCEMENT DU BLITZ, PUISSE LE SORT VOUS ÊTRE FAVORABLE !</b></p>");

        setTimeout(function() {
          socket.broadcast.emit("hideCards");
          socket.emit("hideCards");
        }, 1000);
    }, 1000);
  }
}


/*

*/

var startTimerMemorization = function (socket) {
    socket.emit("newMessage", "<p><b>VOUS AVEZ 10 SECONDES POUR MÉMORISER VOS CARTES !</b></p>");
    socket.broadcast.emit("newMessage", "<p><b>VOUS AVEZ 10 SECONDES POUR MÉMORISER VOS CARTES !</b></p>");

    setTimeout(function() {
        timerMemorization(socket, 10);
    }, 1000);
}


/*

*/

var discardTimer = function (socket, time) {
    socket.emit("newMessage", "<p><b>" + time.toString() + "</b></p>");
    socket.broadcast.emit("newMessage", "<p><b>" + time.toString() + "</b></p>");

    if (time - 1 > 0) {
        setTimeout(function() {
            discardTimer(socket, time - 1);
        }, 1000);
    }
}


/*

*/

var discardTime = function (socket) {
    socket.broadcast.emit("discardTime");

    setTimeout(function() {
        discardTimer(socket, 5);
    }, 700);
}


/*

*/

var calculateResults = function (players, isBlitz) {
    var scoresList = [];

    for (var player in players) {
        for(var card in players[player].playerHand) {
            if (card.length == 3) {
                switch (parseInt(card.substring(0, 2), 10)) {
                    case 10:
                    case 11:
                    case 12:
                        players[player].points += 10;
                        break;

                    case 13:
                        if (card == "13S" || card == "13C") {
                            players[player].points += 15;
                        }
                        break;
                }
            }
            else {
                players[player].points += parseInt(card.substring(0, 1), 10);
            }
        }

        var scoreObj = { pseudo: player,
                         points: players[player].points,
                         hasBlitzed: players[player].hasBlitzed,
                         nbCards: players[player].playerHand.length };
        console.log(scoreObj);
        console.log("taille: " + scoresList.length.toString());
        if (scoresList.length == 0) {
            scoresList.push(scoreObj);
            console.log("1");
        }
        else {
            scoresList.forEach(function (obj, i) {
                if ((obj.points > scoreObj.points) || (obj.points == scoreObj.points && obj.nbCards > scoreObj.nbCards)) {
                    scoresList.splice(i, 0, scoreObj);
                    console.log("2");
                }
            });
        }
    }
    //console.log(scoresList);
    if (isBlitz) {
        players[Object.keys(players)[0]].playerSocket.emit("endGameWithBlitz", scoresList);
        players[Object.keys(players)[0]].playerSocket.broadcast.emit("endGameWithBlitz", scoresList);
    }
    else {
        players[Object.keys(players)[0]].playerSocket.emit("endGameWithoutBlitz", scoresList);
        players[Object.keys(players)[0]].playerSocket.broadcast.emit("endGameWithoutBlitz", scoresList);
    }
}


module.exports = {
    getCards: getCards,
    startGame: startGame,
    startTimerMemorization: startTimerMemorization,
    drawCard: drawCard,
    discardTime: discardTime,
    calculateResults: calculateResults
}
