const express = require('express');
const ent = require('ent');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const gameFunctions = require('./gameFunctions.js');
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
var gamesList = {}; // { gameName : { hasStarted: false, timeouts: [], packet: [], tas: [], nbPlayers: nb, nbPlayersMax: nb, players: { playerName: { playerSocket: socket, playerHand: hand[], hisTurn: bool }, playerName2 ... },  }, gameName2 ..... }


var transporter = nodemailer.createTransport({
    service: 'outlook',
    auth: {
        user: 'jeudecartel3@outlook.fr',
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
            from: 'jeudecartel3@outlook.fr',
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
                from: 'jeudecartel3@outlook.fr',
                to: mail,
                subject: "CARDS, verification email",
                html : "Bienvenue sur CARDS,<br> Votre nouveau mdp est <br><p><b>" + rand + "</b></p> veuillez le saisir site lors de votre prochaine connexion pour confirmer votre compte."
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


io.sockets.on('connection', function (socket) {


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
        gamesList[data.gameName].players[socket.pseudo] = { hasBlitzed: false, playerSocket: socket, playerHand: [], hisTurn: false, points: 0 }

        newGame = { gameName: data.gameName, nbPlayersMax: data.nbPlayersMax };
        socket.broadcast.emit('newGame', newGame)
    });


    /*

    */

    socket.on('joinGame', function(data) {
        socket.pseudo = data.pseudo; // temporaire, penser à le modifier

        gamesList[data.gameName].nbPlayers += 1;
        gamesList[data.gameName].players[socket.pseudo] = { hasBlitzed: false, playerSocket: socket, playerHand: [], hisTurn: false, points: 0 }

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

              setTimeout(function() {
                gameFunctions.startTimerMemorization(socket);

                setTimeout(function() {
                    gameFunctions.discardTime(socket);

                    setTimeout(function() {
                        socket.emit("endDiscardTime");
                        socket.broadcast.emit("endDiscardTime");

                        gamesList[data.gameName].players[Object.keys(gamesList[data.gameName].players)[0]].hisTurn = true;
                        gamesList[data.gameName].players[Object.keys(gamesList[data.gameName].players)[0]].playerSocket.emit("yourTurn");
                        gamesList[data.gameName].players[Object.keys(gamesList[data.gameName].players)[0]].playerSocket.broadcast.emit("infosMsg1", "Tour de " + Object.keys(gamesList[data.gameName].players)[0]);
                    }, 6500);
                }, 14000);
              }, 5050);
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
      console.log('Got disconnect!');

      if (socket.pseudo !== undefined) {
          for (var game in gamesList) {
              for (var player in gamesList[game].players) {
                  if (player == socket.pseudo) {
                      if (gamesList[game].nbPlayers < gamesList[game].nbPlayersMax) {
                          gamesList[game].nbPlayers -= 1;
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

                        for (var player in gamesList[game].players) {
                            if (player != socket.pseudo) {
                                gamesList[game].players[player].playerSocket.emit("newMessage", message);
                                gamesList[game].players[player].playerSocket.emit('updateGame', gameUpdated);
                            }
                        }
                      }
                      else {
                          // gérer la déconnexion en cours de partie
                      }
                  }
              }
          }
      }
      /* var i = allClients.indexOf(socket);
      allClients.splice(i, 1); */
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
                    socket.emit("newAlertMessage", alertMessage);
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

        if (data.pseudo == socket.pseudo) {
            socket.broadcast.emit("infosMsg2", "A regardé la " + data.index + "ème carte de sa main");
        }
        else {
            socket.broadcast.emit("infosMsg2", "A regardé la " + data.index + "ème carte de " + data.pseudo); 
        }

    });


    /*

    */

    socket.on('drawCard', function (gameName) {
        var card = gameFunctions.drawCard(gamesList[gameName]);

        if (gamesList[gameName].packet.length == 0) {
            gamesList[gameName].isFinished = true;
        }

        socket.emit("cardDrawn", card);
        socket.broadcast.emit("infosMsg2", "A pioché une carte du paquet");
    });


    /*

    */

    socket.on('drawTas',function (gameName) {
        gamesList[gameName].tas.pop();
        socket.broadcast.emit('updateTas', gamesList[gameName].tas);
        socket.broadcast.emit("infosMsg2", "A pioché une carte de la défausse");
    });


    /*

    */

    socket.on('endGame', function (data){
        socket.broadcast.emit("finalResult", resultGame);
        socket.emit("finalResult", resultGame);
    });


    /* var getCardName = function(card) {
        var cardName;

        if (card.length == 3) {
            cardName = card.substring(0, 2);
        }
        else {
            cardName = card.substring(0, 1);
        }

        return cardName;
    } */


    /*

    */

    socket.on('depositeOnTas', function (data) {
        gamesList[data.gameName].tas.push(data.cardToPut);

        socket.broadcast.emit("updateTas", gamesList[data.gameName].tas);
        socket.broadcast.emit("infosMsg2", "A défaussé la carte piochée");

        if (gamesList[data.gameName].packet.length == 0) {
            socket.emit("deckEmpty");
            socket.broadcast.emit("deckEmpty");
        }
    });


    /*

    */

    socket.on("valet", function (data) {
        var card = gamesList[data.gameName].players[data.pseudo1].playerHand[data.index1];
        gamesList[data.gameName].players[data.pseudo1].playerHand[data.index1] = gamesList[data.gameName].players[data.pseudo2].playerHand[data.index2];
        gamesList[data.gameName].players[data.pseudo2].playerHand[data.index2] = card;

        socket.broadcast.emit("infosMsg2", "Carte " + (data.index1 + 1).toString() + " de " + data.pseudo1 +
                              "changée avec carte " + (data.index2 + 1).toString() + " de " + data.pseudo2);

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
      gameFunctions.discardTime(socket);

      setTimeout(function() {
        socket.emit("endDiscardTime");
        socket.broadcast.emit("endDiscardTime");

        if (gamesList[gameName].isFinished) {
            gameFunctions.calculateResults(gamesList[gameName].players, false);
        }
        else {
          var players = Object.keys(gamesList[gameName].players);
          var indexPlayer = players.indexOf(socket.pseudo);

          if (indexPlayer == players.length - 1) {
              gamesList[gameName].turnNumber += 1;
              gamesList[gameName].players[players[0]].playerSocket.emit("yourTurn");
              gamesList[gameName].players[players[0]].playerSocket.broadcast.emit("infosMsg1", "Tour de " + players[0]);
          }
          else {
              gamesList[gameName].players[players[indexPlayer + 1]].playerSocket.emit("yourTurn");
              gamesList[gameName].players[players[indexPlayer + 1]].playerSocket.broadcast.emit("infosMsg1", "Tour de " + players[indexPlayer + 1]);
          }
        }
      }, 5800);
    });


    /*

    */

    socket.on("handModified", function(data) {
        gamesList[data.gameName].players[socket.pseudo].playerHand[data.cardIndex] = data.cardToPut;
        socket.broadcast.emit("infosMsg2", "A pris la carte piochée à la place de sa " + data.cardIndex.toString() + "ème carte");
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

    socket.on("infosMsg2", function(msg) {
      socket.broadcast.emit("infosMsg2", msg);
    });
});

server.listen(8080); // 8100,"0.0.0.0" - 8080
