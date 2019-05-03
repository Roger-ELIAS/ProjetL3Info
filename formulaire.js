
var express = require('express');
var bodyParser = require("body-parser");

var mysql = require('mysql');

var con = mysql.createConnection({
    host: "mysql-projetl3.alwaysdata.net",
    user: "176620",
    password: "projetjeudecarte",
    database: "jeudecarte_bd"
});

/*
var server= express();
server.use(bodyParser.urlencoded({ extended: true }));
server.listen(21);



server.post('public/views/formulaire.ejs', function(request, response) {
    var p1 = request.body.p1;
    console.log("p1=" + p1);
});
*/
