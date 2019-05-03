var express = require('express');
var ent = require('ent');

// var nodemailer = require("nodemailer"); // necessaire pour la confirmation de mail

var app = express();
var server = require('http').createServer(app);

var mysql = require('mysql');

var connection = mysql.createConnection({
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

// Chargement de socket.io
var io = require('socket.io').listen(server);

// Quand un client se connecte, on le note dans la console


connection.connect(function(err){
    if(!err) {
        console.log("Database is connected ... nn");
    } else {
        console.log("Error connecting database ... nn");
    }
});

io.sockets.on('connection', function (socket) {

    socket.on('newMessage', function (message) {
        socket.broadcast.emit('newMessage', "<p><b>" + socket.pseudo + "</b> : " + ent.encode(message) + "</p>");
    });

    socket.on('createAccount', function (data) {
        console.log("Connected!");
        var sql = "INSERT INTO User (Username, Mail, Password, Confirmed) VALUES ('" + data.username + "', '" + data.email + "', '" + data.password + "', '" + 0 + "')";
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("1 user add");
        });

    });

    socket.on('nouvellePersonne', function(pseudo) {
        //socket.pseudo = ent.encode(pseudo);
        socket.broadcast.emit('newMessage', "<p><b>" + socket.pseudo + "</b> vient de se connecter !</p>");
    });

    console.login = function (data,res) {
        var email = data.email;
        var password = data.email;
        connection.query('SELECT * FROM User WHERE Mail = ?',[email], function (error, results, fields) {
            if (error) {
                // console.log("error ocurred",error);
                res.send({
                    "code":400,
                    "failed":"error ocurred"
                })
            }else{
                // console.log('The solution is: ', results);
                if(results.length >0){
                    if(results[0].password == password){
                        res.send({
                            "code":200,
                            "success":"login sucessfull"
                        });
                    }
                    else{
                        res.send({
                            "code":204,
                            "success":"Email and password does not match"
                        });
                    }
                }
                else{
                    res.send({
                        "code":204,
                        "success":"Email does not exits"
                    });
                }
            }
        });
    }

    }
});

server.listen(8080,"0.0.0.0"); // 8100,"0.0.0.0" - 8080