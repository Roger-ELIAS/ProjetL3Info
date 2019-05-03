const express = require('express');
const ent = require('ent');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
var saltRounds = 10;

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

var transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
    user: 'jeudecartel3@outlook.fr',
    pass: 'projetl3'
  }
});

var createAccount = function(username, email, pwd) {
    var hash = bcrypt.hashSync(pwd,saltRounds);
    rand=Math.floor((Math.random() * 1000000) + (Math.random() * 10000) + (Math.random() * 100));
    var sql = "INSERT INTO User (Username, Mail, Password, Confirmed, PwdConfirmation) VALUES ('"
            + username + "', '" + email + "', '" + hash + "', '" + 0 + "', '" + rand + "')";

    con.query(sql, function (err, result) {
        if (err) throw err;
		var mailOptions = {
			  from: 'jeudecartel3@outlook.fr',
			  to: email,
			  subject: "CARDS, verification email",
			  html : "Bienvenue sur CARDS,<br> Veuillez renseigner le code ci-dessous sur le site lors de votre prochaine connexion pour confirmer votre compte.<br><p><b>" + rand + "</b></p>"
		};
		transporter.sendMail(mailOptions, function(error, info){
		  if (error) {
			console.log(error);
		  } else {
			console.log('Email sent: ' + info.response);
		  }
		});
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


    /*

    */

    socket.on('connexion', function (data) {
        var sqlRequest = "SELECT Mail, Password, Username, Confirmed FROM User WHERE Mail = \"" + data.email_con + "\"";

        con.query(sqlRequest, function (err, result) {
            if (err) throw err;

            var alertMessage;
            if (result.length !== 1) {
                alertMessage = "L'email n'existe pas";
                socket.emit("newAlertMessage", alertMessage);
            }
            else {
                bcrypt.compare(data.pwd_con, result[0].Password , function(err, res) {
                    if (res) {
                        socket.pseudo = result[0].Username;
						socket.confirmed = result[0].Confirmed;
                        socket.emit("connexionOk", { pseudo: socket.pseudo, confirmed: socket.confirmed });
                    }
                    else {
                        alertMessage = "Mot de passe incorrect !";
                        socket.emit("newAlertMessage", alertMessage);
                    }
                });
            }
        });
    });

	socket.on('confirmation', function (data) {
        var sqlRequest = "SELECT PwdConfirmation FROM User WHERE Username = \"" + data.pseudo + "\"";

		var alertMessage;
        con.query(sqlRequest, function (err, result) {
            if (err) throw err;
			if(data.codeConfirmation == result[0].PwdConfirmation){
				var sqlUpdate = "UPDATE User SET Confirmed = " + 1 + " WHERE Username = \"" + data.pseudo + "\" AND PwdConfirmation = " + data.codeConfirmation;
				con.query(sqlUpdate, function(err,result){
					if (err) throw err;

          socket.emit("confirmationOK");
				});
			} else {
				alertMessage = "Code de confirmation ne correspond pas";
				socket.emit("newAlertMessage", alertMessage);
			}
        });
    });
});

server.listen(8080); // 8100,"0.0.0.0" - 8080
