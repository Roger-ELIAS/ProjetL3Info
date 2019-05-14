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

  for (let k = 0; k <= 1; k++) {
      var rand = getRandomIntInclusive(0, packet.length - 1);
      game.tas.push(packet[rand]);
      packet.splice(rand, 1);
  }

  game.packet = packet;
  return hands;
}


/*

*/

var startGame = function (socket, time, gameObj) {
  socket.emit("newAlertMessage", "<p>Début de la partie dans " + "<b>" + time.toString() + " ...</b></p>");
  socket.broadcast.emit("newAlertMessage", "<p>Début de la partie dans " + "<b>" + time.toString() + " ...</b></p>");

  if (time - 1 > 0) {
      gameObj.timeouts.push(setTimeout(function() {
          startGame(socket, time - 1, gameObj);
      }, 1000));
  }
  else {
    gameObj.timeouts.push(setTimeout(function() {
        socket.broadcast.emit("newAlertMessage", "<p><b>DISTRIBUTION DES CARTES</b></p>");
        socket.emit("newAlertMessage", "<p><b>DISTRIBUTION DES CARTES</b></p>");
    }, 1000));
  }
};


/*

*/

var timerMemorization = function(socket, time) {
  socket.emit("newAlertMessage", "<p><b>" + time.toString() + "</b></p>");
  socket.broadcast.emit("newAlertMessage", "<p><b>" + time.toString() + "</b></p>");

  if (time - 1 > 0) {
      setTimeout(function() {
          timerMemorization(socket, time - 1);
      }, 1000);
  }
  else {
    setTimeout(function() {
        socket.broadcast.emit("newAlertMessage", "<p><b>LANCEMENT DU BLITZ, PUISSE LE SORT VOUS ÊTRE FAVORABLE !</b></p>");
        socket.emit("newAlertMessage", "<p><b>LANCEMENT DU BLITZ, PUISSE LE SORT VOUS ÊTRE FAVORABLE !</b></p>");

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
    socket.emit("newAlertMessage", "<p><b>VOUS AVEZ 10 SECONDES POUR MÉMORISER VOS CARTES !</b></p>");
    socket.broadcast.emit("newAlertMessage", "<p><b>VOUS AVEZ 10 SECONDES POUR MÉMORISER VOS CARTES !</b></p>");

    setTimeout(function() {
        timerMemorization(socket, 10);
    }, 1000);
}


/*

*/

var play = function (players, index) {

}

/*

 */
var drawCard = function (packet){
    var rand = getRandomIntInclusive(0, packet.length - 1);
    return rand;
}

module.exports = {
    getCards: getCards,
    startGame: startGame,
    startTimerMemorization: startTimerMemorization,
    drawCard : drawCard,
    play: play
}
