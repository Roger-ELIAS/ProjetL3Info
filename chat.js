var express = require('express');

var app = express();
var server = require('http').createServer(app);

app.use(function(req, res, next){
    res.render('chat.ejs');
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

// Quand un client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {

    socket.on('newMessage', function (message) {
      socket.broadcast.emit('newMessage', message, socket.pseudo);
    })

    socket.on('nouvellePersonne', function(pseudo) {
      socket.pseudo = pseudo;
      socket.broadcast.emit('nouvelArrivant', socket.pseudo + ' vient de se connecter !');
    });
});

server.listen(8080);
