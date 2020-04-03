'use strict';

const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

var users = [];
var userDict = {};
var allcolors = ['C0392B','9B59B6','3498DB','1ABC9C','27AE60','F1C40F','F39C12'];
var currentAsker;
var currentAnswerer;
var gameState = 0;
var currentRound = -1;
var currentAsker = 0;
var currentAnswerer = 0;
var answerTime = 6;
var timerId = -1;
var questions = ['THINGS YOU DO IN THE PARK', 'THINGS HOT SAUCE IS GOOD ON', 'THINGS YOU MISS'];
var votes = [];
var readyToPlayTotal = 0;

var coloursinuse = [];
app.get('/', function(req, res){
  console.log(__dirname);
  res.sendFile(__dirname+'/index.html');
});

io.on('connection', function(socket){

  console.log('User '+socket.id+' connected');
  io.to(socket.id).emit('game_state', gameState);
  io.to(socket.id).emit('user_list_updated', JSON.stringify(users));
  // All players ready to play!
  socket.on('ready_to_play', function(){
    readyToPlayTotal++;
    userDict[socket.id].readyToPlay = true;
    console.log(userDict[socket.id].name+' is ready to play.');
    io.emit('user_list_updated', JSON.stringify(users));
    if (readyToPlayTotal == users.length && users.length > 1)
    {
      goToStart();
    }
  });
  function goToStart()
  {
    gameState = 1;
    io.emit('game_state', gameState);

    currentRound = 0;
    goToRound(0);
  }
  function goToRound(round)
  {
    currentAsker = ((round == 0) ? 0 : round%users.length);
    currentAnswerer = (round+1)%users.length;
    var round = {asker:users[currentAsker], answerer:users[currentAnswerer], round:currentRound, question:questions[currentRound]};
    io.emit('go_to_round', JSON.stringify(round));
  }
  // Ready for the next round
  // Timer functions
  function startTimer(socketID)
  {
    var start = new Date;
    currTimer = answerTime;
    stopTimer();
    io.emit('timer_started');
    io.emit('timer_update', currTimer);
    timerId = setInterval(function() {
        currTimer -= 1;
        io.emit('timer_update', currTimer);
        if (currTimer == 0) {
          for (var i = 0; i < users.length; i++)
          {
            console.log(socketID+' '+users[i].id);
            if (socketID != users[i].id)
            {
              io.to(users[i].id).emit('show_vote');
            }
          }
          io.emit('timer_ended');
          votes = [];
          stopTimer();
        }
    }, 1000);
    console.log("TIMER STARTED "+timerId);
    return false;
  }

  function stopTimer()
  {
    console.log("TIMER STOPPED "+timerId);
    if (timerId != -1) {
      clearInterval(timerId);
      timerId = -1;
    }
    return false;
  }
  //
  socket.on('start_timer', function(){
    startTimer(socket.id);
  });

  //
  socket.on('user_joined', function(msg){
    userJoined(socket.id, msg);
  });
  function userJoined(id, name)
  {
    console.log('User '+id+' is now called '+name)
    var user = {id:id, name:name, color:allcolors.pop(), points:0, readyToPlay:false};
    users.push(user);
    userDict[id] = user;
    io.emit('user_list_updated', JSON.stringify(users));
  }
  socket.on('disconnect', function(){
    playerLeft(socket.id);
  });
  function playerLeft(id)
  {
    if (userDict[id]) {
      console.log('User '+userDict[id].name+' disconnected');
      for (var i = 0; i < users.length; i++)
      {
        if (users[i].id == id)
        {
          allcolors.shift(users[i].color);
          users.splice(i, 1);
          delete userDict[id];
          readyToPlayTotal--;
          break;
        }
      }
    } else {
      console.log('User '+id+' disconnected');
    }
    io.emit('user_list_updated', JSON.stringify(users));
  }
  socket.on('vote_submitted', function(msg){
    console.log(socket.id+' submitted '+msg);
    votes += msg.toString();
    if (votes.length == users.length - 1)
    {
      var yes = votes.split("1").length - 1;
      var no = votes.split("0").length - 1;
      console.log('All votes cast. Yes:'+yes+' No:'+no);
      io.emit('show_vote_result', yes, no);

    }

  });
})