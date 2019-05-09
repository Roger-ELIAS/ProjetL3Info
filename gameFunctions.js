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

var getCards = function (nbPlayers) {
  var packet = generatePacket();
  var cards = { hands: [] };

  for (let i = 0; i < nbPlayers; ++i) {
      var hand = [];
      for (let k = 0; k < 4; k++) {
        var rand = getRandomIntInclusive(0, packet.length - 1);
        hand.push(packet[rand]);
        packet.splice(rand, 1);
      }

      cards.hands.push(hand);
  }

  cards["packet"] = packet;
  return cards;
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

var play = function (players, index) {

}


module.exports = {
    getCards: getCards,
    startGame: startGame,
    startTimerMemorization: startTimerMemorization,
    play: play
}
