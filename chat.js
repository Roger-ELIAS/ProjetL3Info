var express = require('express');
var ent = require('ent');

var app = express();
var server = require('http').createServer(app);

var mysql = require('mysql');

var con = mysql.createConnection({
    host: "mysql-projetl3.alwaysdata.net",
    user: "176620",
    password: "projetjeudecarte",
    database: "jeudecarte_bd"
});

con.connect(function(err) {
    if (err) throw err;
    con.query("SELECT Mail, Password FROM User", function (err, result, fields) {
        if (err) throw err;
        console.log(result);
    });
}); // connexion


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
    });

    socket.on('createAccount', function (username,email,password) {
        con.connect(function(err) {
            if (err) throw err;
            console.log("Connected!");
            var sql = "INSERT INTO User (Username, Mail, Password, Confirmed) VALUES(" +  username + "," + email +  "," + password + ")";
            con.query(sql, function (err, result) {
                if (err) throw err;
                console.log("1 user add");
            });
        }); // inscription

        socket.broadcast.emit('createAccount', username,email,password);
    });

    socket.on('nouvellePersonne', function(pseudo) {
      socket.pseudo = ent.encode(pseudo);
      socket.broadcast.emit('newMessage', "<p><b>" + socket.pseudo + "</b> vient de se connecter !</p>");
    });
});

server.listen(8080,"0.0.0.0"); // 8100,"0.0.0.0" - 8080
