const express = require('express');
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const client_id = '05cde070c8c3420c9d807de08de16b63';
const client_secret = '1c5da778d14b49b4bfa400f0d72931c7';

// console.log(redirect_uri);

var song_analysis;
var song_features = [];
const PORT = process.env.PORT || 8888;

const redirect_uri = PORT<=9999 ? 'http://localhost:'+PORT+'/callback' : 'https://wicked-moonlight-95928.herokuapp.com/callback';


/**
 * Generates a random string containing numbers and letters
 * @param {number} length
 * @return {srting} The generated string
 */
generateRandomString = (length) => {
 	var text = '';
 	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

 	for (var i = 0; i < length; i++) {
 		text+=possible.charAt(Math.floor(Math.random() * possible.length));
 	}
 	return text;
}

arrayContainsKeyValue = (key, value, myArray) => {
  for (let i=0;i < myArray.length; i++) {
    if (myArray[i][key] == value) {
      console.log('Found duplicate');
      return true;
    }
  }
  return false;
}


var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
	.use(cookieParser())
	.use(express.json({limit: '50mb'}));

app.get('/login', (req, res, next) => {

	var state = generateRandomString(16);
	res.cookie(stateKey, state);

	var scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-modify-playback-state';

	res.redirect('https://accounts.spotify.com/authorize?' + 
		querystring.stringify({
			response_type: 'code',
			client_id: client_id,
			scope: scope,
			redirect_uri: redirect_uri,
			state: state
		}));
});

app.get('/callback', (req, res, next) => {

	var code = req.query.code || null;
	var state = req.query.state || null;
	var storedState = req.cookies ? req.cookies[stateKey] : null;


	if (state === null || state !== storedState) {
		res.redirect('/#' +
			querystring.stringify({
				error: 'state_mismatch'
			}));
		console.error(state, storedState);
	} else {
		res.clearCookie(stateKey);
		var authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			form: {
				code: code,
				redirect_uri: redirect_uri,
				grant_type: 'authorization_code'
			},
			headers: {
				'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
			},
			json: true
		};

		request.post(authOptions, (error, response, body) => {
			if (!error && response.statusCode === 200) {

				var access_token = body.access_token,
						refresh_token = body.refresh_token;

				var options = {
					url: 'https://api.spotify.com/v1/me',
					headers: { 'Authorization': 'Bearer ' + access_token },
					json: true
				};

				request.get(options, (error, response, body) => {
					console.log(body);
				});

				res.redirect('/#' +
					querystring.stringify({
						access_token: access_token,
						refresh_token: refresh_token
					}));
	
			} else {
				res.redirect('/#' +
					querystring.stringify({
						error: 'invalid_token'
					}));
			}
		});
	}
});


app.get('/refresh_token', (req, res, next) => {

	var refresh_token = req.query.refresh_token;
	var authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		headers: {'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')) },
		form: {
			grant_type: 'refresh_token',
			refresh_token: refresh_token
		},
		json: true
	};

	request.post(authOptions, (error, response, body) => {
		if (!error && response.statusCode == 200) {
			var access_token = body.access_token;
			res.send({
				'access_token': access_token
			});
		}

	});



});

app.post('/rec-analysis', (req, res, next) => {
	
	let error = false;
	var track_info = req.body.track;
	
	error = track_info === undefined ? true : false;
	
	if (!error){
		res.send({
			'status': 'Accepted',
			'code': 10001,
			'message': 'Analysis received'
		});
	} else {
		
		console.error(req.body);

		res.send({
			'status': 'Rejected',
			'code': 10002,
			'message': 'Invalid format'
		});
	}
});

app.post('/rec-features', (req, res, next) => {
	let error = {'value': false, 'reason': ''};
	let features = req.body;

  if (features.id === undefined) {
    error.value = true;
    error.reason = 'Invalid format';
  }	
  
  let alreadyStored = arrayContainsKeyValue('id', features.id, song_features);

  console.log(alreadyStored);

  //check if already stored
  if (alreadyStored) {
    error.value = true;
    error.reason = 'Data already stored';
  }
  
  console.log(error);
  
	if (!error.value) {
		song_features.push(features);
		
		console.info(song_features);
		
		res.send({
			'status': 'Accepted',
			'code': 10003,
			'message': 'Features received'
		});
	} else {
		res.send({
      'status': 'Rejected',
      'code': 10004,
      'message': error.reason
    });
	}
});

app.listen(PORT, () => {
	console.info(`Server is listening on port ${PORT}`);
});