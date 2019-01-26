var express = require('express');
var ent = require('ent');

var app = express();
var server = require('http').createServer(app);

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public/views');

app.use(function(req, res, next){
    res.render('chat.ejs');
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

// Quand un client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {

    socket.on('newMessage', function (message) {
      socket.broadcast.emit('newMessage', "<p><b>" + socket.pseudo + "</b> : " + ent.encode(message) + "</p>");
    })

    socket.on('nouvellePersonne', function(pseudo) {
      socket.pseudo = ent.encode(pseudo);
      socket.broadcast.emit('newMessage', "<p><b>" + socket.pseudo + "</b> vient de se connecter !</p>");
    });
});

server.listen(8100,"0.0.0.0"); // 8100,"0.0.0.0" - 8080
