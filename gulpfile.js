var gulp = require('gulp');
var changed = require('gulp-changed');
var jscs = require('gulp-jscs');
var uglify = require('gulp-uglify');
var merge = require('merge-stream');

var SERVER_DEST = '/Users/peter.jones/git/visualisation/spotifyapi/'
var PUB_DEST = '/Users/peter.jones/git/visualisation/spotifyapi/public'
var PUB_DEST_JS = '/Users/peter.jones/git/visualisation/spotifyapi/public/js/'

gulp.task('public', function() {
	var pub_html = gulp.src('public/*.html')
			.pipe(changed(PUB_DEST))			
			.pipe(gulp.dest(PUB_DEST));	

	var pub_css = gulp.src('public/*.css')
			.pipe(changed(PUB_DEST))
			.pipe(gulp.dest(PUB_DEST));

	return merge(pub_html, pub_css);	
});

gulp.task('public/js', function() {
	var pub_js = gulp.src('public/js/*.js')
		.pipe(changed(PUB_DEST_JS))
		.pipe(gulp.dest(PUB_DEST_JS));

	return pub_js;
});

gulp.task('server', function() {
	var server = gulp.src('*.js')
		.pipe(changed(SERVER_DEST))
		.pipe(gulp.dest(SERVER_DEST));

	return server;
});

gulp.task('default', ['server', 'public', 'public/js'], function() {

});