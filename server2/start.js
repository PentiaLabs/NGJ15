var express = require('express');
var _ = require('underscore');
var uuid = require('node-uuid');
var path = require('path');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var chalk = require('chalk');

// Own odules
var User = require('./user.js');
var Room = require('./room.js');

var config = {
	port: process.env.PORT || 3000,
	clientPath: '/../client'
};

var users = {};
var rooms = {};

var gameServer = {
	createRoom: function(socket, name) {
		var roomName = name || 'Nameless Room';
		room = new Room(socket, roomName);
		rooms[room.id] = room;
		return room;
	},
	getRoom: function(id) {
      return rooms[id] || false;
    },
    getRooms: function() {
        return _.values(rooms);
    },
    userCount: function() {
    	return _(users).size();
    }
};

var users = io.of('/users').on('connection', function(socket){
	
	var user = new User(socket);
	users[user.id] = user;

	console.log(chalk.green('User connected with ID:', user.id));

	socket.emit('playerData', user.getUserData());

	if(gameServer.getRooms()[0]) {
		user.joinRoom(gameServer.getRooms()[0]);
		console.log(gameServer.getRooms()[0]);
	} else {
		console.log('No rooms avaiable');
	}

	socket.on('action', function(msg){
		console.log(msg);
	    board.emit('commands', msg, user);
	});

	socket.on('startGame', function(msg){
		console.log('StartGame', msg, user.room.data.gamesStarted);
		// TODO: 
		// emit that a single user has startet the game, so we can update other controllers
		users.emit('gameStarted', true, user);
		board.emit('startGame', msg, user);
	});

	socket.on('disconnect', function(){
		board.emit('removePlayer', user);
		console.log(chalk.blue(user.name + ' (' + user.id + ') ' + 'disconnects'));
	});
});

var board = io
	.of('/board')
	.on('connection', function (socket) {
    	var currentBoard = gameServer.createRoom(socket);
    	console.log(chalk.green('Board connected with ID:', currentBoard.id, currentBoard._socketId));
    	
    	users.emit('roomCreated', currentBoard);

    	socket.on('gameover', function(){
    		users.emit('gameover', true);
		});

		socket.on('disconnect', function(){
			console.log(chalk.red('The board ' + socket.id + ' disconnects'));
		});
	});


app.get('/', function(req, res){
	res.sendFile(path.join(__dirname + '/../client/controller.html'));
});

app.get('/board', function(req, res){
	res.sendFile(path.join(__dirname + '/../client/board.html'));
});

app.use(express.static(path.join(__dirname, config.clientPath)));

http.listen(config.port, function(){
	console.log('listening on *:' + config.port);
});