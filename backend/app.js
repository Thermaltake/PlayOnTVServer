// var MemoryStore = require('connect/middleware/session/memory');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var cookieParser = require('cookie-parser');
var cookie       = require('cookie');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var sessionStore  = new session.MemoryStore();
var pmongo = require('promised-mongo');
var _ = require('lodash');
var config = require('./config');
var db = pmongo(config.dbURL, ['users']);
var passport = require('passport');
var GoogleStrategy = require('passport-google').Strategy;

app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms

app.use(session({ store: sessionStore, secret: config.sessionSecret, key:config.sidKey})); // session secret
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
        if (!user){
          user = profile;
          db.users.save(profile);
        }
        else {
          _.extend(user, profile);
          db.users.save(user); 
        }
        done(null, profile);
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

io.use(function(socket, next) {
  var cookieObj = cookie.parse(socket.request.headers.cookie);
  if (!cookieObj[config.sidKey])
    return next(new Error('not authorized'));
  var sid = cookieObj[config.sidKey];
  sid = cookieParser.signedCookie(sid, config.sessionSecret);
  sessionStore.get(sid, function (err, session) {
      if (err) 
      {
          next(err.message, false); //Turn down the connection
      } 
      else
      {
        if (!session)
          return next(new Error('not authorized'));

        socket.request.user = session.passport.user; //Accept the session
        next();
      }
    });
});

io.on('connection', function (socket) {
  socket.emit("user:info", {name: socket.request.user.displayName});

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






  // // console.log('client connected', socket);
  // var parsed_cookies = cookieParser.JSONCookie(socket.handshake.headers.cookie);
  // // cookieParser(socket.handshake.headers.cookie, null, function(err) {
  // //     var sessionID = socket.upgradeReq.cookies['express.sid'];
  // //     console.log('express.sid', sessionID);
  // //     MemoryStore.get(sessionID, function(err, session) {
  // //         console.log('session',session);
  // //     });
  // // }); 
  // console.log(socket.handshake.headers.cookie, parsed_cookies);

  // // var cookie_string = socket.request.headers.cookie;
  // // var parsed_cookies = connect.utils.parseCookie(cookie_string);
