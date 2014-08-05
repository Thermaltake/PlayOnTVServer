// var MemoryStore = require('connect/middleware/session/memory');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var MemoryStore  = new session.MemoryStore();
var pmongo = require('promised-mongo'),
    _ = require('lodash'),
    config = require('./config'),
    db = pmongo(config.dbURL, ['users']);
var passport = require('passport')
  , GoogleStrategy = require('passport-google').Strategy;

app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms

app.use(session({ secret: 'ilovescotchscotchyscotchscotch'})); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

passport.use(new GoogleStrategy({
    returnURL: 'http://'+config.host+':5000/auth/google/return',
    realm: 'http://'+config.host+':5000/'
  },
  function(identifier, profile, done) {
    profile.openId = identifier;
    db.users.findOne({
        openId: identifier
    }).then(function(user) {
        console.log('founded user', user)
        if (!user){
          console.log('user not found')
          user = profile;
          db.users.save(profile);
        }
        else {
          _.extend(user, profile);
          console.log('user found and updated', user)
          db.users.save(user); 
        }
        done(null, profile);
        console.log('firinf done');
    });
    // User.findOrCreate({ openId: identifier }, function(err, user) {
    //   done(err, user);
    // });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


io = io.listen(server);

io.on('connection', function (socket) {
  // console.log('client connected', socket);
  var parsed_cookies = cookieParser.JSONCookie(socket.handshake.headers.cookie);
  // cookieParser(socket.handshake.headers.cookie, null, function(err) {
  //     var sessionID = socket.upgradeReq.cookies['express.sid'];
  //     console.log('express.sid', sessionID);
  //     MemoryStore.get(sessionID, function(err, session) {
  //         console.log('session',session);
  //     });
  // }); 
  console.log(socket.handshake.headers.cookie, parsed_cookies);

  // var cookie_string = socket.request.headers.cookie;
  // var parsed_cookies = connect.utils.parseCookie(cookie_string);
  // var connect_sid = parsed_cookies['connect.sid'];

  socket.on('private message', function (from, msg) {
    console.log('I received a private message by ', from, ' saying ', msg);
  });

  socket.on('disconnect', function () {
    io.sockets.emit('user disconnected');
  });
});

app.get('/', function (req, res) {
  if (!req.user)
    return res.redirect('/login');
  res.sendfile(__dirname + '/index.html');
});

app.get('/login', function (req, res) {
  res.sendfile(__dirname + '/login.html');
});

// Redirect the user to Google for authentication.  When complete, Google
// will redirect the user back to the application at
//     /auth/google/return
app.get('/auth/google', passport.authenticate('google'));

// Google will redirect the user to this URL after authentication.  Finish
// the process by verifying the assertion.  If valid, the user will be
// logged in.  Otherwise, authentication has failed.
app.get('/auth/google/return', 
  passport.authenticate('google', { successRedirect: '/',
                                    failureRedirect: '/login' }));

server.listen(process.env.PORT || 5000);