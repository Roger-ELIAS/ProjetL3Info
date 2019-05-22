const express = require('express');
const ent = require('ent');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const gameFunctions = require('./gameFunctions.js');
const nodemailer = require('nodemailer');
var saltRounds = 10;

var app = express();
var server = require('http').createServer(app);


/* var con = mysql.createConnection({
    host: "mysql-projetl3.alwaysdata.net",
    user: "176620",
    password: "projetjeudecarte",
    database: "jeudecarte_bd"
}); */

var db_config = {
    host: "mysql-projetl3.alwaysdata.net",
    user: "176620",
    password: "projetjeudecarte",
    database: "jeudecarte_bd"
};

var con;

function handleDisconnect() {
  con = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  con.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  con.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();


app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public/views');

app.use(function(req, res, next){
    res.render('index.ejs');
});


var io = require('socket.io').listen(server);
var gamesList = {}; // { gameName : { hasStarted: false, timeouts: [], packet: [], tas: [], nbPlayers: nb, nbPlayersMax: nb, players: { playerName: { playerSocket: socket, playerHand: hand[], hisTurn: bool }, playerName2 ... },  }, gameName2 ..... }


var transporter = nodemailer.createTransport({
    service: 'outlook',
    auth: {
        user: 'cardsl3@outlook.fr',
        pass: 'projetl3'
    }
});


var createAccount = function(username, email, pwd,send) {
    var hash = bcrypt.hashSync(pwd,saltRounds);
    rand=Math.floor((Math.random() * 1000000) + (Math.random() * 10000) + (Math.random() * 100));
    var sql = "INSERT INTO User (Username, Mail, Password, Confirmed, PwdConfirmation) VALUES ('"
        + username + "', '" + email + "', '" + hash + "', '" + 0 + "', '" + rand + "')";

    con.query(sql, function (err, result) {
        if (err) throw err;
        var mailOptions = {
            from: 'cardsl3@outlook.fr',
            to: email,
            subject: "CARDS, verification email",
            html: "Bienvenue sur CARDS,<br> Veuillez renseigner le code ci-dessous sur le site lors de votre prochaine connexion pour confirmer votre compte.<br><p><b>" + rand + "</b></p>"
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        return true;
    });
};


var updatePwd = function(username,mail,rand,send){
    var hash = bcrypt.hashSync(rand.toString(),saltRounds);
    var sqlUpdate = "UPDATE User SET Password = \"" + hash + "\" WHERE Username = \"" + username + "\" AND Mail = \"" + mail+ "\"";
    con.query(sqlUpdate, function (err, result) {
        if (err) throw err;
        if(send) {
            var mailOptions = {
                from: 'cardsl3@outlook.fr',
                to: mail,
                subject: "CARDS, mot de passe oublié",
                html : "Bonjour,<br> Votre nouveau mot de passe est <br><p><b>" + rand + "</b></p> veuillez le saisir sur le site lors de votre prochaine connexion. <br> Une fois connecté, vous pourrez le modifier en allant dans \"Modifier mot de passe\"."
            };
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }
    });
    return true;
};


/*

*/

var emitToLobby = function(players, eventName, content, socket) {
      if (content == "nothing") {
          for (var playerName in players) {
              if (playerName !== socket.pseudo) {
                  players[playerName].playerSocket.emit(eventName);
              }
          }
      }
      else {
        for (var playerName in players) {
            if (playerName !== socket.pseudo) {
                players[playerName].playerSocket.emit(eventName, content);
            }
        }
      }
}


/*

*/

var updatePoints = function(points,pseudo,win){
   var sql = "SELECT Points,GamesPlayed,GamesWon FROM Score Where Username = \"" + pseudo + "\"";
   con.query(sql, function (err, result) {
       if (err) throw err;
       console.log(result);

       var newpoints = result[0].Points + points;
       var newwin = result[0].GamesWon + win;
       var newplayed = result[0].GamesPlayed + 1;

       var updatePoints = "UPDATE Score SET Points  = " + newpoints + ", GamesWon = " + newwin + ", GamesPlayed = "+ newplayed + " Where Username = \"" + pseudo + "\"";
       con.query(updatePoints, function (err, result) {
           if (err) throw err;
       });
   });
};


/*

*/

var score = function (socket) {
    var sql = "SELECT Username, GamesPlayed, GamesWon, Points FROM Score ORDER BY Points DESC LIMIT 5";

    con.query(sql, function (err, result) {
        if (err) throw err;
        socket.emit("scoreResult",result);
    });
};


/*

*/

var initScore = function(pseudo) {
   var sql = "INSERT INTO Score (Username, GamesPlayed, GamesWon, Points) VALUES ('"
        + pseudo + "', '" + 0 + "', '" + 0 + "', '" + 0 + "')";
   con.query(sql, function (err, result) {
       if (err) throw err;
   });
}

io.sockets.on('connection', function (socket) {

    score(socket);

    /*

    */

    socket.on('newMessage', function (data) {
        message = "<p><b>" + socket.pseudo + "</b> : " + ent.encode(data.message) + "</p>";

        for (var playerName in gamesList[data.gameName].players) {
            if (playerName != socket.pseudo) {
                gamesList[data.gameName].players[playerName].playerSocket.emit('newMessage', message);
            }
        }
    });


    /*

    */

    socket.on('newGame', function(data) {
        socket.pseudo = data.pseudo; // temporaire, penser à le modifier

        gamesList[data.gameName] = { isFinished: false, hasStarted: false, turnNumber: 1, timeouts: [], packet: [], tas: [], nbPlayers: 1, nbPlayersMax: data.nbPlayersMax, players: {} };
        gamesList[data.gameName].players[socket.pseudo] = { isGuest : data.isGuest, playerSocket: socket, playerHand: [], hisTurn: false, points: 0 }

        newGame = { gameName: data.gameName, nbPlayersMax: data.nbPlayersMax };
        socket.broadcast.emit('newGame', newGame)
    });


    /*

    */

    socket.on('joinGame', function(data) {
        socket.pseudo = data.pseudo; // temporaire, penser à le modifier

        gamesList[data.gameName].nbPlayers += 1;
        gamesList[data.gameName].players[socket.pseudo] = { isGuest : data.isGuest, playerSocket: socket, playerHand: [], hisTurn: false, points: 0 }

        var message = "<p>Le joueur <b>" +
            data.pseudo +
            "</b> vient de se connecter !  <b>" +
            gamesList[data.gameName].nbPlayers +
            "/" + gamesList[data.gameName].nbPlayersMax + "</b></p>"

        for (var playerName in gamesList[data.gameName].players) {
            if (playerName != socket.pseudo) {
                gamesList[data.gameName].players[playerName].playerSocket.emit('newMessage', message);
            }
        }

        gameUpdated = { gameName: data.gameName,
            nbPlayers: gamesList[data.gameName].nbPlayers,
            nbPlayersMax: gamesList[data.gameName].nbPlayersMax };

        socket.broadcast.emit('updateGame', gameUpdated);

        if (gamesList[data.gameName].nbPlayers == gamesList[data.gameName].nbPlayersMax) {
            gameFunctions.startGame(socket, 10, gamesList[data.gameName]);

            gamesList[data.gameName].timeouts.push(setTimeout(function() {
              gamesList[data.gameName].hasStarted = true;
              var hands = gameFunctions.getCards(gamesList[data.gameName]);

              var index = 0;
              for (var playerName in gamesList[data.gameName].players) {
                  gamesList[data.gameName].players[playerName].playerHand = hands[index];
                  gamesList[data.gameName].players[playerName].playerSocket.emit("dealingCards", { hand: hands[index],
                                                                                                   nbPlayers: gamesList[data.gameName].nbPlayersMax,
                                                                                                   pseudos: Object.keys(gamesList[data.gameName].players),
                                                                                                   cardsTas: gamesList[data.gameName].tas });
                  index += 1;
              }

              gamesList[data.gameName].timeouts.push(setTimeout(function() {
                gameFunctions.startTimerMemorization(socket, gamesList[data.gameName]);

                gamesList[data.gameName].timeouts.push(setTimeout(function() {
                    gameFunctions.discardTime(socket, gamesList[data.gameName]);

                    gamesList[data.gameName].timeouts.push(setTimeout(function() {
                        emitToLobby(gamesList[data.gameName].players, "endDiscardTime", "nothing", socket);
                        socket.emit("endDiscardTime");

                        gamesList[data.gameName].players[Object.keys(gamesList[data.gameName].players)[0]].hisTurn = true;
                        gamesList[data.gameName].players[Object.keys(gamesList[data.gameName].players)[0]].playerSocket.emit("yourTurn");

                        for (var playerName in gamesList[data.gameName].players) {
                            if (playerName !== Object.keys(gamesList[data.gameName].players)[0]) {
                                gamesList[data.gameName].players[playerName].playerSocket.emit("infosMsg1", "Tour de " + Object.keys(gamesList[data.gameName].players)[0]);
                            }
                        }
                    }, 6500));
                }, 14000));
              }, 5050));
            }, 11050));
        }
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


    /*

    */

    socket.on('confirmation', function (data) {
        var sqlRequest = "SELECT PwdConfirmation FROM User WHERE Username = \"" + data.pseudo + "\"";

        var alertMessage;
        con.query(sqlRequest, function (err, result) {
            if (err) throw err;
            if(data.codeConfirmation == result[0].PwdConfirmation){
                var sqlUpdate = "UPDATE User SET Confirmed = " + 1 + " WHERE Username = \"" + data.pseudo + "\" AND PwdConfirmation = " + data.codeConfirmation;
                con.query(sqlUpdate, function(err,result){
                    if (err) throw err;
                    initScore(data.pseudo);
                    socket.emit("confirmationOK");
                });
            } else {
                alertMessage = "Code de confirmation ne correspond pas";
                socket.emit("newAlertMessage", alertMessage);
            }
        });
    });


    /*

    */

    socket.on('disconnect', function() {
      if (socket.pseudo !== undefined) {
          for (var game in gamesList) {
              for (var player in gamesList[game].players) {
                  if (player == socket.pseudo) {
                      if (gamesList[game].nbPlayers < gamesList[game].nbPlayersMax) {
                          gamesList[game].nbPlayers -= 1;
                          delete gamesList[game].players[player];

                          if (gamesList[game].nbPlayers == 0) {
                              delete gamesList[game];
                              socket.broadcast.emit("deleteGame", game);
                          }
                          else {
                            var message = "<p>Le joueur <b>" +
                                          socket.pseudo +
                                          "</b> vient de se déconnecter !  <b>" +
                                          gamesList[game].nbPlayers +
                                          "/" + gamesList[game].nbPlayersMax + "</b></p>";

                            gameUpdated = { gameName: game,
                                            nbPlayers: gamesList[game].nbPlayers,
                                            nbPlayersMax: gamesList[game].nbPlayersMax };

                            for (var player in gamesList[game].players) {
                                if (player != socket.pseudo) {
                                    gamesList[game].players[player].playerSocket.emit("newMessage", message);
                                    gamesList[game].players[player].playerSocket.emit('updateGame', gameUpdated);
                                }
                            }
                          }
                      }
                      else if (!gamesList[game].hasStarted) {
                        for (var i = 0; i < gamesList[game].timeouts.length; i++) {
                            clearTimeout(gamesList[game].timeouts[i]);
                        }
                          gamesList[game].timeouts = [];

                          gamesList[game].nbPlayers -= 1;
                          var message = "<p>Le joueur <b>" +
                              socket.pseudo +
                              "</b> vient de se déconnecter !  <b>" +
                              gamesList[game].nbPlayers +
                              "/" + gamesList[game].nbPlayersMax + "</b></p>";

                          gameUpdated = { gameName: game,
                                          nbPlayers: gamesList[game].nbPlayers,
                                          nbPlayersMax: gamesList[game].nbPlayersMax };

                        socket.broadcast.emit('updateGame', gameUpdated);

                        for (var player in gamesList[game].players) {
                            if (player != socket.pseudo) {
                                gamesList[game].players[player].playerSocket.emit("newMessage", message);
                                gamesList[game].players[player].playerSocket.emit('infosMsg2', "");
                                gamesList[game].players[player].playerSocket.emit('infosMsg1', "EN ATTENTE DE JOUEURS");
                            }
                        }
                      }
                      else {
                          gamesList[game].packet.concat(gamesList[game].players[socket.pseudo].playerHand);
                          delete gamesList[game].players[socket.pseudo];

                          if (Object.keys(gamesList[game].players).length == 0) {
                              socket.broadcast.emit("deleteGame", game);

                              for (var i = 0; i < gamesList[game].timeouts.length; i++) {
                                  clearTimeout(gamesList[game].timeouts[i]);
                              }


                              delete gamesList[game];
                          }
                          else if (Object.keys(gamesList[game].players).length == 1) {
                              gamesList[game].players[Object.keys(gamesList[game].players)[0]].playerSocket.emit("playerLeft", { pseudo: socket.pseudo,
                                                                                                                                 isEndGame: true });

                              socket.broadcast.emit("deleteGame", game);

                              for (var i = 0; i < gamesList[game].timeouts.length; i++) {
                                  clearTimeout(gamesList[game].timeouts[i]);
                              }

                              delete gamesList[game];
                          }
                          else {
                              for (var p of Object.keys(gamesList[game].players)) {
                                  gamesList[game].players[p].playerSocket.emit("playerLeft", { pseudo: socket.pseudo,
                                                                                               isEndGame: false });
                              }
                          }
                      }
                  }
              }
          }
      }
   });


    /*

    */

    socket.on('updatePwd',function (data) {
        var sqlEmail = "SELECT Mail FROM User WHERE Mail = \"" + data.email + "\"";
        var emailIsTaken;

        var sqlUsername = "SELECT Username FROM User WHERE Username = \"" + data.username + "\"";
        var usernameIsTaken;

        con.query(sqlEmail, function (err, result) {
            if (err) throw err;
            emailIsTaken = (result.length == 0);

            con.query(sqlUsername, function (err, result) {
                if (err) throw err;
                usernameIsTaken = (result.length == 0);

                if(!usernameIsTaken && !emailIsTaken) {
                    rand=Math.floor((Math.random() * 1000000) + (Math.random() * 10000) + (Math.random() * 100));
                    updatePwd(data.username, data.email,rand,1);
                    socket.emit("mdpChange");
                }
                else {
                    var alertMessage;

                    if (emailIsTaken && usernameIsTaken) {
                        alertMessage = "Pseudo et email inexistant";
                    }
                    else if (emailIsTaken) {
                        alertMessage = "Email incorrecte";
                    }
                    else {
                        alertMessage = "Pseudo incorrecte";
                    }

                    socket.emit("newAlertMessage", alertMessage);
                }
            });
        });
    });


    /*

    */

    socket.on('newPwd',function (data) {
        var sql = "SELECT Mail,Password FROM User WHERE Username = \"" + data.username + "\"";

        con.query(sql, function (err, result) {
            if (err) throw err;

            bcrypt.compare(data.password, result[0].Password , function(err, res) {
                if (res) {
                    updatePwd(data.username, result[0].Mail,data.newpwd,0);
                }
                else {
                    alertMessage = "Mot de passe incorrect !";
                    socket.emit("newMdpIncorrect", alertMessage);
                }
            });
        });
    });


    /*

    */
    // { gameName : { turnNumber: 1, hasStarted: false, timeouts: [], packet: [], tas: [], nbPlayers: nb, nbPlayersMax: nb, players: { playerName: { playerSocket: socket, playerHand: hand[], hisTurn: bool }, playerName2 ... },  }, gameName2 ..... }
    socket.on('askCardValue', function (data) {
        var card = gamesList[data.gameName].players[data.pseudo].playerHand[data.index];

        socket.emit("cardValueAsked", { cardName: card,
                                        cardIndex: data.index,
                                        pseudo: data.pseudo });

        var infosMsg;

        if (data.pseudo == socket.pseudo) {
            if (gamesList[data.gameName].players[data.pseudo].playerHand.length == 1) {
                infosMsg = "A regardé sa carte";
            }
            else if (data.index == 0) {
                infosMsg = "A regardé la première carte de sa main";
            }
            else {
                infosMsg = "A regardé la " + (data.index + 1).toString() + "ème carte de sa main";
            }
        }
        else {
            if (gamesList[data.gameName].players[data.pseudo].playerHand.length == 1) {
                infosMsg = "A regardé la carte de " + data.pseudo;
            }
            else if (data.index == 0) {
                infosMsg = "A regardé la première carte de " + data.pseudo;
            }
            else {
                infosMsg = "A regardé la " + (data.index + 1).toString() + "ème carte de " + data.pseudo;
            }
        }

        emitToLobby(gamesList[data.gameName].players, "infosMsg2", infosMsg, socket);
    });


    /*

    */

    socket.on('drawCard', function (gameName) {
        var card = gameFunctions.drawCard(gamesList[gameName]);

        if (gamesList[gameName].packet.length == 0) {
            gamesList[gameName].isFinished = true;
        }

        socket.emit("cardDrawn", card);
        emitToLobby(gamesList[gameName].players, "infosMsg2", "A pioché une carte du paquet", socket);
    });


    /*

    */

    socket.on('drawTas',function (gameName) {
        gamesList[gameName].tas.pop();
        emitToLobby(gamesList[gameName].players, "updateTas", gamesList[gameName].tas, socket);
        emitToLobby(gamesList[gameName].players, "infosMsg2", "A pioché une carte de la défausse", socket);
    });


    /*

    */

    socket.on('endGame', function (data){
        socket.broadcast.emit("finalResult", resultGame);
        socket.emit("finalResult", resultGame);
    });


    /*

    */

    socket.on('depositeOnTas', function (data) {
        gamesList[data.gameName].tas.push(data.cardToPut);

        emitToLobby(gamesList[data.gameName].players, "updateTas", gamesList[data.gameName].tas, socket);

        if (gamesList[data.gameName].packet.length == 0) {
            socket.emit("deckEmpty");
            emitToLobby(gamesList[data.gameName].players, "deckEmpty", "nothing", socket);
        }
    });


    /*

    */

    socket.on("valet", function (data) {
        var card = gamesList[data.gameName].players[data.pseudo1].playerHand[data.index1];

        gamesList[data.gameName].players[data.pseudo1].playerHand[data.index1] = gamesList[data.gameName].players[data.pseudo2].playerHand[data.index2];
        gamesList[data.gameName].players[data.pseudo2].playerHand[data.index2] = card;

        emitToLobby(gamesList[data.gameName].players, "infosMsg2", "Carte " + (data.index1 + 1).toString() + " de " + data.pseudo1 +
                                                                                 " changée avec carte " + (data.index2 + 1).toString() + " de " + data.pseudo2, socket);

        gamesList[data.gameName].players[data.pseudo1].playerSocket.emit("modifyCard", { cardIndex: data.index1,
                                                                                         cardName: gamesList[data.gameName].players[data.pseudo1].playerHand[data.index1] });

        gamesList[data.gameName].players[data.pseudo2].playerSocket.emit("modifyCard", { cardIndex: data.index2,
                                                                                         cardName: gamesList[data.gameName].players[data.pseudo2].playerHand[data.index2] });
    });


    /*

    */

    socket.on("playerFail", function(gameName) {
        gamesList[gameName].players[socket.pseudo].points += 5;

        socket.broadcast.emit('newMessage', "<p> Le joueur <b>" + socket.pseudo + "</b> s'est trompé ! <b>Malus de 5 points </b> héhé !</p>");
    });


    /*

    */
    // { gameName : { isFinished: false, turnNumber: 1, hasStarted: false, timeouts: [], packet: [], tas: [], nbPlayers: nb, nbPlayersMax: nb, players: { playerName: { playerSocket: socket, playerHand: hand[], hisTurn: bool }, playerName2 ... },  }, gameName2 ..... }
    socket.on("nextPlayer", function(gameName) {
      gameFunctions.discardTime(socket, gamesList[gameName]);

      gamesList[gameName].timeouts.push(setTimeout(function() {
        socket.emit("endDiscardTime");
        socket.broadcast.emit("endDiscardTime");

        if (gamesList[gameName].isFinished) {
            var arrayPlayers = gameFunctions.calculateResults(gamesList[gameName].players, false);
            var pointsToAdd = 1;
            var points = 0;
            var win = 0;
			socket.emit("tableauScore", arrayPlayers);
			socket.broadcast.emit("tableauScore", arrayPlayers);
            for (i = arrayPlayers.length -1 ; i >= 0; i--) {
				if(!gamesList[gameName].players[arrayPlayers[i].pseudo].isGuest){
					if(i == 0)
						win = 1;
					updatePoints(points + pointsToAdd, arrayPlayers[i].pseudo,win);
				}
				points = points + pointsToAdd;
				pointsToAdd += 1;
            }
        }
        else {
          var players = Object.keys(gamesList[gameName].players);
          var indexPlayer = players.indexOf(socket.pseudo);

          if (indexPlayer == players.length - 1) {
              gamesList[gameName].turnNumber += 1;
              gamesList[gameName].players[players[0]].playerSocket.emit("yourTurn");
              emitToLobby(gamesList[gameName].players, "infosMsg1", "Tour de " + players[0], gamesList[gameName].players[players[0]].playerSocket);
          }
          else {
              gamesList[gameName].players[players[indexPlayer + 1]].playerSocket.emit("yourTurn");
              emitToLobby(gamesList[gameName].players, "infosMsg1", "Tour de " + players[indexPlayer + 1], gamesList[gameName].players[players[indexPlayer + 1]].playerSocket);
          }
        }
      }, 5800));
    });


    /*

    */

    socket.on("handModified", function(data) {
        gamesList[data.gameName].players[socket.pseudo].playerHand[data.cardIndex] = data.cardToPut;

        var infosMsg;

        if (gamesList[data.gameName].players[socket.pseudo].playerHand.length == 1) {
            infosMsg = "A pris la carte piochée à la place de sa carte";
        }
        else if (data.cardIndex == 0) {
            infosMsg = "A pris la carte piochée à la place de sa première carte";
        }
        else {
            infosMsg = "A pris la carte piochée à la place de sa " + (data.cardIndex + 1).toString() + "ème carte";
        }

        emitToLobby(gamesList[data.gameName].players, "infosMsg2", infosMsg, socket);
    });


    /*

    */

    socket.on("cardRemoved", function(data) {
        gamesList[data.gameName].players[socket.pseudo].playerHand.splice(data.cardIndex, 1);

        if (gamesList[data.gameName].players[socket.pseudo].playerHand.length == 0) {
            gamesList[data.gameName].isFinished = true;
        }

        socket.broadcast.emit("cardRemoved", { pseudo: socket.pseudo,
                                               indexToRemove: data.cardIndex });
    });


    /*

    */

    socket.on("infosMsg2", function(data) {
      emitToLobby(gamesList[data.gameName].players, "infosMsg2", data.msg, socket);
    });


    /*

     */
    socket.on("cardBack", function(data) {
        socket.broadcast.emit("changeCardBack", {pseudo: data.pseudo,
            cardBack: data.cardBack});

        socket.emit("changeCardBack", {pseudo: data.pseudo,
            cardBack: data.cardBack});
    });


    /*

     */

    socket.on("cardDiscarded", function(data) {
          var infosMsg;

          if (gamesList[data.gameName].players[socket.pseudo].playerHand.length == 1) {
              infosMsg = "<p>Le joueur <b>" + socket.pseudo + "</b> a défaussé sa dernière carte !</p>";
          }
          else if (data.cardIndex == 0) {
              infosMsg = "<p>Le joueur <b>" + socket.pseudo + "</b> a défaussé sa première carte</p>";;
          }
          else {
              infosMsg = "<p>Le joueur <b>" + socket.pseudo + "</b> a défaussé sa "  + (data.cardIndex + 1).toString() + "ème carte</p>";
          }

          emitToLobby(gamesList[data.gameName].players, "newMessage", infosMsg, socket);
    });
});

server.listen(8100,"0.0.0.0"); // 8100,"0.0.0.0" - 8080
