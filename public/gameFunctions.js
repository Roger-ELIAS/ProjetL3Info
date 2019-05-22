/*

*/

var generatePacket = function () {
  var paquet = [];

  for (let k = 1; k <= 13; ++k)
      paquet.push(k + "D");

  for (let k = 1; k <= 13; ++k)
      paquet.push(k + "C");

  for (let k = 1; k <= 13; ++k)
      paquet.push(k + "H");

  for (let k = 1; k <= 13; ++k)
      paquet.push(k + "S");

  return paquet;
}

var generatePacketTest = function () {
    var paquet = [];
    var array = [7,8,11];
    for(var i = 0; i<= array.length -1;i++){
        paquet.push(array[i] + "D");
        paquet.push(array[i] + "C");
        paquet.push(array[i] + "H");
        paquet.push(array[i] + "S");
    }
    paquet.push("1D");
    paquet.push("1H");
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
  var packet = generatePacketTest();
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

var emitToLobby = function(players, eventName, content) {
    if (content == "nothing") {
      for (var playerName in players) {
          players[playerName].playerSocket.emit(eventName);
      }
    }
    else {
      for (var playerName in players) {
          players[playerName].playerSocket.emit(eventName, content);
      }
    }
}


/*

*/

var timerStartGame = function (socket, time, gameObj) {
    emitToLobby(gameObj.players, "infosMsg2", time.toString());

    if (time - 1 > 0) {
        gameObj.timeouts.push(setTimeout(function() {
            timerStartGame(socket, time - 1, gameObj);
        }, 1000));
    }
    else {
      gameObj.timeouts.push(setTimeout(function() {
          emitToLobby(gameObj.players, "infosMsg1", "DISTRIBUTION DES CARTES");
          emitToLobby(gameObj.players, "infosMsg2", "");
      }, 1000));
    }
}


/*

*/

var startGame = function (socket, time, gameObj) {
  emitToLobby(gameObj.players, "infosMsg1", "Début de la partie dans");

  gameObj.timeouts.push(setTimeout(function() {
      timerStartGame(socket, 10, gameObj);
  }, 1000));

};


/*

*/

var timerMemorization = function(socket, time, players) {
  emitToLobby(players, "infosMsg2", time.toString());

  if (time - 1 > 0) {
      setTimeout(function() {
          timerMemorization(socket, time - 1, players);
      }, 1000);
  }
  else {
    setTimeout(function() {
        emitToLobby(players, "infosMsg1", "LANCEMENT DU BLITZ, PUISSE LE SORT VOUS ÊTRE FAVORABLE !");
        emitToLobby(players, "infosMsg2", "");

        setTimeout(function() {
          emitToLobby(players, "hideCards", "nothing");
        }, 1000);
    }, 1000);
  }
}


/*

*/

var startTimerMemorization = function (socket, players) {
    emitToLobby(players, "infosMsg1", "MÉMORISEZ VOS CARTES !");

    setTimeout(function() {
        timerMemorization(socket, 10, players);
    }, 1000);
}


/*

*/

var discardTimer = function (socket, time, players) {
    emitToLobby(players, "infosMsg2", time.toString());

    if (time - 1 > 0) {
        setTimeout(function() {
            discardTimer(socket, time - 1, players);
        }, 1000);
    }
}


/*

*/

var discardTime = function (socket, players) {
    emitToLobby(players, "discardTime", "nothing");

    setTimeout(function() {
        discardTimer(socket, 5, players);
    }, 700);
}


/*

*/

var calculateResults = function (players, isBlitz) {
    var scoresList = [];

    for (var player in players) {
        players[player].playerHand.forEach(function(card) {
          switch (card.substring(0, card.length - 1)) {
              case "10":
              case "11":
              case "12":
                  players[player].points += 10;
                  break;

              case "13":
                  if (card == "13S" || card == "13C") {
                      players[player].points += 15;
                  }
                  break;

              default:
                  players[player].points += parseInt(card.substring(0, card.length - 1), 10);
          }
        });

        var scoreObj = { pseudo: player,
                         points: players[player].points,
                         hasBlitzed: players[player].hasBlitzed,
                         nbCards: players[player].playerHand.length };

        if (scoresList.length == 0) {
            scoresList.push(scoreObj);
        }
        else {
            scoresList.forEach(function (obj, i) {
                if ((obj.points > scoreObj.points) || (obj.points == scoreObj.points && obj.nbCards > scoreObj.nbCards)) {
                    scoresList.splice(i, 0, scoreObj);
                }
            });
        }
    }

    return scoresList;
}


module.exports = {
    getCards: getCards,
    startGame: startGame,
    startTimerMemorization: startTimerMemorization,
    drawCard: drawCard,
    discardTime: discardTime,
    calculateResults: calculateResults
}
