var express = require('express');
var ent = require('ent');

 // var nodemailer = require("nodemailer"); // necessaire pour la confirmation de mail

var app = express();
var server = require('http').createServer(app);

var mysql = require('mysql');

var con = mysql.createConnection({
    host: "mysql-projetl3.alwaysdata.net",
    user: "176620",
    password: "projetjeudecarte",
    database: "jeudecarte_bd"
});
/*
con.connect(function(err) {
    if (err) throw err;
    con.query("SELECT Mail, Password FROM User", function (err, result, fields) {
        if (err) throw err;
        console.log(result);
    });
}); */  // connexion



/*

var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "Your Gmail ID",
        pass: "Gmail Password"
    }
}); // creation d'un server smtp

var rand,mailOptions,host,link;

app.get('/',function(req,res){
    res.sendfile('index.html');
});
app.get('/send',function(req,res){
    rand=Math.floor((Math.random() * 100) + 54);
    host=req.get('host');
    link="http://"+req.get('host')+"/verify?id="+rand;
    mailOptions={
        to : req.query.to,
        subject : "Please confirm your Email account",
        html : "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>"
    }
    console.log(mailOptions);
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
            res.end("error");
        }else{
            console.log("Message sent: " + response.message);
            res.end("sent");
        }
    });
});

app.get('/verify',function(req,res){
    console.log(req.protocol+":/"+req.get('host'));
    if((req.protocol+"://"+req.get('host'))==("http://"+host))
    {
        console.log("Domain is matched. Information is from Authentic email");
        if(req.query.id==rand)
        {
            console.log("email is verified");
            res.end("<h1>Email "+mailOptions.to+" is been Successfully verified");
        }
        else
        {
            console.log("email is not verified");
            res.end("<h1>Bad Request</h1>");
        }
    }
    else
    {
        res.end("<h1>Request is from unknown source");
    }
});

*/ //Confirmation de creation de compte

/*

var hash = bcrypt.hashSync("mdp");

bcrypt.compareSync("mdp", hash); // true
bcrypt.compareSync("mdp", hash); // false

*/ // Encodage de mot de passe




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

    socket.on('createAccount', function (data) {
        console.log(data.username);
        con.connect(function(err) {

            if (err) throw err;
            console.log("Connected!");
            var sql = "INSERT INTO User (Username, Mail, Password, Confirmed) VALUES ('" + data.username + "', '" + data.email + "', '" + data.password + "', '" + 0 + "')";
            con.query(sql, function (err, result) {
                if (err) throw err;
                console.log("1 user add");
            });
        }); // inscription


    });

    socket.on('nouvellePersonne', function(pseudo) {
      //socket.pseudo = ent.encode(pseudo);
      socket.broadcast.emit('newMessage', "<p><b>" + socket.pseudo + "</b> vient de se connecter !</p>");
    });
});

server.listen(8080,"0.0.0.0"); // 8100,"0.0.0.0" - 8080
