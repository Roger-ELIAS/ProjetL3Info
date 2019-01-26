var socket = io.connect('localhost:8080'); // http://projetl3.alwaysdata.net/
var chat = document.getElementById('messages');

var pseudo = prompt('Quel est votre pseudo ?');
socket.emit('nouvellePersonne', pseudo);

socket.on('newMessage', function(message, pseudo) {
    $('#messages').append("<p><b>" + pseudo + "</b> : " + message + "</p>");
    chat.scrollIntoView(false);
})

socket.on('nouvelArrivant', function(message) {
    alert(message);
})

$('#envoyerMessage').click(function () {
    socket.emit('newMessage', $('#message').val());
    $('#messages').append("<p><b>" + pseudo + "</b> : " + $('#message').val() + "</p>");
    chat.scrollIntoView(false);
    $('#message').val('');
})

$('#formSendMessage').submit(function () {
  return false;
});
