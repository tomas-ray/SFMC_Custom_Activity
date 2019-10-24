'use strict';
// Module Dependencies
// -------------------
var express     = require('express');
//var bodyParser  = require('body-parser');
var errorhandler = require('errorhandler');
var http        = require('http');
var path        = require('path');
var request     = require('request');
var routes      = require('./routes/index');
var activity    = require('./routes/activity');
var JWT         = require('./lib/jwtDecoder');
// EXPRESS CONFIGURATION
var app = express();

function tokenFromJWT( req, res, next ) {
  // Setup the signature for decoding the JWT
  // var jwt = new JWT({appSignature: APIKeys.appSignature});
  
  // Object representing the data in the JWT
  // var jwtData = jwt.decode( req );

  // Bolt the data we need to make this call onto the session.
  // Since the UI for this app is only used as a management console,
  // we can get away with this. Otherwise, you should use a
  // persistent storage system and manage tokens properly with
  // node-fuel
  // req.session.token = jwtData.token;
  // next();
    console.log('tokenFromJWT ->');

    JWT(req.body, process.env.JWT_KEY, (err, decoded) => {
      if (err) {
          console.error(err);
          return res.status(401).end();
      }
      else{
        console.log('DECODED - > ' + decoded);
        next();
      }

  });
}

console.log('IN APP.JS - >');

// Configure Express
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.raw({type: 'application/jwt'}));
app.use(express.static(path.join(__dirname, 'nba')));
//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json());

// Express in Development Mode
if ('development' == app.get('env')) {
  console.log('express development');
  app.use(errorhandler());
}

app.get('/nba/', routes.init);
app.post('/nba/login',tokenFromJWT, routes.login);
app.post('/nba/logout', routes.logout);


app.get('/nba/index.html', routes.init);
app.get('/nba/js/require.js', routes.require);
app.get('/nba/config.json', routes.config);
app.get('/nba/js/postmonger.js', routes.postmonger);
app.get('/nba/js/jquery-3.4.1.min.js', routes.jquery);
app.get('/nba/images/icon.PNG', routes.image);

// Custom Routes for MC
app.post('/nba/journeybuilder/save/', activity.save);
app.post('/nba/journeybuilder/validate/', activity.validate );
app.post('/nba/journeybuilder/publish/', activity.publish );
app.post('/nba/journeybuilder/execute/', activity.execute );
app.post('/nba/journeybuilder/stop/', activity.stop );


http.createServer(app).listen(
  app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  }
);
  