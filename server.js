var express = require('express');
var ent = require('ent');
// var bd = require('./bd.js');
var mysql = require('mysql');

var app = express();
var server = require('http').createServer(app);

var con = mysql.createConnection({
    host: "mysql-projetl3.alwaysdata.net",
    user: "176620",
    password: "projetjeudecarte",
    database: "jeudecarte_bd"
});

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public/views');

app.use(function(req, res, next){
    res.render('index.ejs');
});

var io = require('socket.io').listen(server);
var gamesList = {};

var createAccount = function(username, email, pwd) {
    var sql = "INSERT INTO User (Username, Mail, Password, Confirmed) VALUES ('"
            + username + "', '" + email + "', '" + pwd + "', '" + 0 + "')";

    con.query(sql, function (err, result) {
        if (err) throw err;
        return true;
    });
};

io.sockets.on('connection', function (socket) {


    /*

    */

    socket.on('newMessage', function (data) {
      message = ent.encode(data.message);
      newMessage = { pseudo: socket.pseudo, message: message };

      gamesList[data.gameName].players.forEach(function(playerSocket) {
          if (playerSocket.pseudo != socket.pseudo) {
              playerSocket.emit('newMessage', newMessage);
          }
      });
    });


    /*

    */

    socket.on('newGame', function(data) {
        socket.pseudo = data.pseudo; // temporaire, penser à le modifier

        gamesList[data.gameName] = { nbPlayers: 1, nbPlayersMax: data.nbPlayersMax, players: [socket] };

        newGame = { gameName: data.gameName, nbPlayersMax: data.nbPlayersMax };
        socket.broadcast.emit('newGame', newGame)
    });


    /*

    */

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


    /*

    */

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
    });


    /*

    */

    socket.on('createAccount', function (data) {
        var sqlEmail = "SELECT Mail FROM User WHERE Mail = \"" + data.email + "\"";
        var emailIsTaken;

        var sqlUsername = "SELECT Username FROM User WHERE Username = \"" + data.username + "\"";
        var usernameIsTaken;

        con.query(sqlEmail, function (err, result) {
            if (err) throw err;
            emailIsTaken = (result.length == 1);

            con.query(sqlUsername, function (err, result) {
                if (err) throw err;
                usernameIsTaken = (result.length == 1);

                if(!usernameIsTaken && !emailIsTaken) {
                    createAccount(data.username, data.email, data.password)
                    socket.pseudo = data.username;
                }
                else {
                    var alertMessage;

                    if (emailIsTaken && usernameIsTaken) {
                        message = "Pseudo et email déjà pris, veuillez en choisir d'autres !";
                    }
                    else if (emailIsTaken) {
                        message = "Email déjà pris, veuillez en choisir un autre !";
                    }
                    else {
                        message = "Pseudo déjà pris, veuillez en choisir un autre !";
                    }

                    socket.emit("newAlertMessage", alertMessage);
                }
            });
        });
    });
});

server.listen(8080); // 8100,"0.0.0.0" - 8080
