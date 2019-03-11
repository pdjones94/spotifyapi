const express = require('express');
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const client_id = '05cde070c8c3420c9d807de08de16b63';
const client_secret = '1c5da778d14b49b4bfa400f0d72931c7';

// console.log(redirect_uri);

var song_analysis;
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

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
	.use(cookieParser())
	.use(express.json({limit: '50mb'}));

app.get('/login', (req, res, next) => {

	var state = generateRandomString(16);
	res.cookie(stateKey, state);

	var scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state';

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
				'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
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
		headers: {'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
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
	var error = false;
	console.log(req.body);
	req.on('data', (data) => {
		// song_analysis = JSON.parse(data.analysis);
		// console.log('Data: '+data.analysis);
		try {
			analysis = data;
		} catch(e) {
			console.log(e);
			error = true;
		}
	});

	if (!error){
		res.send({
			'code': 10001,
			'message': 'Data received'
		});
	}
	else {
		res.send({
			'message': e
		});
	}
});


app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});