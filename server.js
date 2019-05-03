var express = require('express');
var ent = require('ent');

var app = express();

var server = require('http').createServer(app);

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public/views');

app.use(function(req, res, next){
    res.render('index.ejs');
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

var gamesList = {};

// Quand un client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {
    socket.on('newMessage', function (data) {
      message = ent.encode(data.message);
      newMessage = { pseudo: socket.pseudo, message: message };

      gamesList[data.gameName].players.forEach(function(playerSocket) {
          if (playerSocket.pseudo != socket.pseudo) {
              playerSocket.emit('newMessage', newMessage);
          }
      });
    });


    socket.on('newGame', function(data) {
        socket.pseudo = data.pseudo; // temporaire, penser à le modifier

        gamesList[data.gameName] = { nbPlayers: 1, nbPlayersMax: data.nbPlayersMax, players: [socket] };

        newGame = { gameName: data.gameName, nbPlayersMax: data.nbPlayersMax };
        socket.broadcast.emit('newGame', newGame)
    });


    socket.on('joinGame', function(data) {
        socket.pseudo = data.pseudo; // temporaire, penser à le modifier

        gamesList[data.gameName].nbPlayers += 1;
        gamesList[data.gameName].players.push(socket);

        gamesList[data.gameName].players.forEach(function(playerSocket) {
            if (playerSocket.pseudo != socket.pseudo) {
                playerSocket.emit('newPlayer', socket.pseudo);
            }
        });

        gameUpdated = { gameName: data.gameName,
                        nbPlayers: gamesList[data.gameName].nbPlayers,
                        nbPlayersMax: gamesList[data.gameName].nbPlayersMax };

        socket.broadcast.emit('updateGame', gameUpdated);
    });


    socket.on('askGames', function() {
        var games = [];
        for (var gameName in gamesList) {
            var game = [];
            game.push(gameName);
            game.push(gamesList[gameName].nbPlayers);
            game.push(gamesList[gameName].nbPlayersMax);

            games.push(game);
        }

        socket.emit('gamesAsked', games);
    })
});

server.listen(8080); // 8100,"0.0.0.0" - 8080
