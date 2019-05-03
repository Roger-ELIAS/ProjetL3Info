var mysql = require('mysql');

/*

*/

var con = mysql.createConnection({
    host: "mysql-projetl3.alwaysdata.net",
    user: "176620",
    password: "projetjeudecarte",
    database: "jeudecarte_bd"
});


/*

*/

var emailIsTaken = async function(email) {
    var sql = "SELECT Mail FROM User WHERE Mail = \"" + email + "\"";
    var isTaken;

    con.query(sql, function (err, result) {
        if (err) throw err;
        // console.log(result.length == 1)
        isTaken = result.length == 1;
        return isTaken;
    });
}


/*

*/

var pseudoIsTaken = async function(pseudo) {
    var sql = "SELECT Username FROM User WHERE Username = \"" + pseudo + "\"";
    var isTaken;

    con.query(sql, function (err, result) {
        if (err) throw err;
        // console.log(result.length == 1)
        isTaken = result.length == 1;
        return isTaken;
    });
}


/*

*/

var createAccount = async function(username, email, pwd) {
    var sql = "INSERT INTO User (Username, Mail, Password, Confirmed) VALUES ('"
            + username + "', '" + email + "', '" + pwd + "', '" + 0 + "')";

    con.query(sql, function (err, result) {
        if (err) throw err;
        return true;
    });
};


module.exports = {
    createAccount: createAccount,
    emailIsTaken: emailIsTaken,
    pseudoIsTaken: pseudoIsTaken
};
