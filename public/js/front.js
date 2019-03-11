/**        
 * Obtains paramaters from hash of url
 * @return Object
 */
function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
  while ( e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

/**        
 * Converts milliseconds to minute format
 * @param {number} time
 * @return String
 */
function convertTime(time) {
  var minutes = Math.floor((time / 1000) / 60);
  var seconds = Math.round((time / 1000) % 60);
  seconds === 60 ? (
    seconds = 0,
    minutes += 1
  ) : seconds;

  seconds = seconds < 10 ? '0'+seconds : seconds;
  seconds = seconds === 0 ? '00' : seconds;
  return `${minutes}:${seconds}`;
}

/**        
 * Get currently playing info every 500 milliseconds
 * This is a way of getting live info about what is playing
 * Not very elegant - would be better if events sent from spotify itself (not implemented yet)
 */
function getCurrentlyPlaying() {
  $.ajax({
    url: "https://api.spotify.com/v1/me/player",
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    data: {
      market: 'GB'
    },
    success: function(response, textStatus, xhr) {
      
      if (response.item !== null && xhr.status !== 202) {
        playing = response.is_playing;
        duration = response.item.duration_ms;
        progress = response.progress_ms;
        
        if (track_id !== response.item.id || track_id === '') {
          getTrackAnalysis(response.item.id);
          getAudioFeatures(response.item.id);
          track_name = response.item.name;
          currentlyPlayingPlaceholder.innerHTML = currentlyPlayingTemplate({
            title: response.item.name,
            album: response.item.album.name,
            artist: response.item.artists[0].name, //Needs to loop through all artists
            duration: convertTime(duration),
            track_id: response.item.id
          });

          track_id = response.item.id;
          updateProgressBar(duration, track_id);
        }
      } else {
        clearInterval(timer);
        console.error('Unexpected response from Spotify API: ', xhr.status);
        $('#obtain-new-token').click();
        timeout = true;
        playing = false;
      }
    },
    error: function(response, textStatus, xhr) {
      
      if (response.status === 401) {
        $('#obtain-new-token').css('background-color', 'red');
        clearInterval(timer);
        console.log('Access token expired');
        timeout = true;
        playing = false;
      }
      else {
        clearInterval(timer);
        console.error('Error communicating with Spotify API')
        timeout = true;
        playing = false;
      }
    }
  });
}


//TODO Update so that progress bar resets on a song change + seeks to right time
//TODO Move JS to separate file

/**
 * Initiates visual tracking of track through css
 * Contains function frame(), called every 1000 ms to update width
 * @params {number, string} track_duration, current_track_id
 */
function updateProgressBar(track_duration, current_track_id) {
  console.log('Starting bar with id: '+ current_track_id);

  var bar = document.getElementById('bar');
  var bar_progress = progress+1000;
  var interval = 1000;
  var bar_timer = setInterval(frame, interval);

  function frame() {
    var new_track = (current_track_id === track_id) ? false : true;

    if (bar_progress >= (track_duration-1000) || new_track) {
      bar.style.width = '0%';
      clearInterval(bar_timer);
    } else if (!playing) {
      bar.style.backgroundColor = '#a0a0a0';
      pauseBeatTimer();
    } else {
      //For synchronisation
      if (Math.abs(progress - bar_progress) < 1000) {
        bar_progress += 1000;
      } else {
        bar_progress = progress;
      }
      if (beat_interval === 0) {
        startBeatTimer();
      }
      bar.style.width = ((bar_progress / track_duration) * 100) + '%';
      bar.style.backgroundColor = '#1db954';
    }
  }
}

/**
* Initiate timer to call getCurrentlyPlaying 
*/
function initPlayerListener() {
  timer = setInterval(getCurrentlyPlaying, 500);
}

/**
* Start beat timer animation
*/
function startBeatTimer() {  
  beat_interval = 60000/bpm;
  $('#beat-circle').css('animation','pulse '+ beat_interval +'ms infinite');
}

/**
* Stop beat timer animation
*/
function pauseBeatTimer() {
  beat_interval = 0;
  $('#beat-circle').css('animation', 'pulse '+ beat_interval +'ms infinite');
}

/**
* AJAX request for detailed analysis for track
* @params {string} id
*/
function getTrackAnalysis(id) {
  $.ajax({
    url: `https://api.spotify.com/v1/audio-analysis/${id}`,
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    success: function (response) {
      postTrackAnalysis(response, id);
    },
    error: function (response) {
      console.error('Error in fetching analysis');
    }
  });
}

/**
* Send POST request to 
*/
function postTrackAnalysis(response, id) {
  console.log(response);
  $.ajax({
    method: 'POST',
    url: '/rec-analysis',
    dataType: 'json',
    // data: {
    //   analysis: JSON.stringify(response),
    //   id: encodeURIComponent(id)
    // },
    // processData: false,
    data: JSON.stringify(response),
    contentType: 'application/json',
    success: function(response) {
      console.log(response);
    },
    error: function(response) {
      console.error('Error sending analysis data to server');
    }
  });
}

function getAudioFeatures(id) {
  $.ajax({
    url: `https://api.spotify.com/v1/audio-features/${id}`,
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    success: function(response) {
      bpm = response.tempo;
      startBeatTimer();
      audio_features = Object.values(response);
      feature_categories = Object.keys(response);
      // chart.unload();
      updateChart();
      // displayChart();
    },
    error: function(response) {
      console.error('Error in fetching audio features');
    }
  });
}

//Needs d3 to be v3
function updateChart() {
  var feature_chart = audio_features.slice(0,10);
  feature_chart.splice(2,3);
  feature_chart.unshift(track_name);
  console.log(feature_chart);
  

  chart.load({
    columns: [
      feature_chart
    ]
  });

  if (!first_track) {    
    chart.unload({
      ids: chart.data()[0].id
    });    
  }
  else {
    first_track = false;
  }  
}

function seekToPoint(e) {

}


var userProfileSource = document.getElementById('user-profile-template').innerHTML,
    userProfileTemplate = Handlebars.compile(userProfileSource),
    userProfilePlaceholder = document.getElementById('user-profile');

var oauthSource = document.getElementById('oauth-template').innerHTML,
    oauthTemplate = Handlebars.compile(oauthSource),
    oauthPlaceholder = document.getElementById('oauth');

var currentlyPlayingSource = document.getElementById('currently-playing').innerHTML,
    currentlyPlayingTemplate = Handlebars.compile(currentlyPlayingSource),
    currentlyPlayingPlaceholder = document.getElementById('playing');

var params = getHashParams();

var access_token = params.access_token,
    refresh_token = params.refresh_token,
    error = params.error;

var audio_features, feature_categories;
var artist, album, track_name, playing, duration, bpm;
var track_id = '';
var timer;
var beat_interval;
var chart;
var feature_categories = ['danceability', 'energy', 'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence'];
var feature_placeholder = ['0','0','0','0','0','0','0'];
var first_track = true;

chart = c3.generate({
    bindto: '#chart',
    data: {
      columns: feature_placeholder,
      type: 'bar'
    },
    bar: {
      width: {
        ratio: 0.9
      }
    },
    axis: {
      x: {
        type: 'category',
        categories: feature_categories
      },
      y: {
        max: 1,
        min: 0,
        padding: {top:0, bottom:0}
      }
    }
  });



var timeout = false;


if (error) {
  alert('There was an error during the authentication');
  console.error(error);
} else {
  if (access_token) {
    oauthPlaceholder.innerHTML = oauthTemplate({
      access_token: access_token,
      refresh_token: refresh_token
    });

    $.ajax({
      url: 'https://api.spotify.com/v1/me',
      headers: {
        'Authorization': 'Bearer ' + access_token
      },
      success: function(response) {
        userProfilePlaceholder.innerHTML = userProfileTemplate(response);

        $('#login').hide();
        $('#loggedin').show();
        initPlayerListener();

      },
      error: function(statusText, response, xhr) {
        console.error('Error Authenticating using token in url: '+ access_token);
      }
    });

  } else {
    $('#login').show();
    $('#loggedin').hide();
  }

  document.getElementById('obtain-new-token').addEventListener('click', function() {
    $.ajax({
      url: '/refresh_token',
      data: {
        'refresh_token': refresh_token
      }
    }).done(function(data) {
      access_token = data.access_token;
      window.location.hash = '#access_token='+access_token;
      oauthPlaceholder.innerHTML = oauthTemplate({
        access_token: access_token,
        refresh_token: refresh_token
      });
      timeout ? (
        $('#obtain-new-token').css('background-color', '#fff'),
        initPlayerListener(),
        timeout = false
      ) : console.log('Obtained new token');
    });
  }, false);
}