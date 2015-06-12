var gulp = require( "gulp" );
var fs = require( "fs" );
var consul = require( "./src/connection.js" )();
var serverCfg = require( "./.consul/server.json" );
var bg = require( 'biggulp' )( gulp );

gulp.task( 'default', [ 'continuous-test', 'watch' ] );

gulp.task( 'test', function() {
	return bg.testOnce();
} );

gulp.task( 'coverage', bg.showCoverage() );

gulp.task( 'continuous-test', bg.withCoverage() );

gulp.task( 'watch', function() {
	return bg.watch( [ 'continuous-test' ] );
} );

gulp.task( "web-ui", function() {
	consul.acl.create( {
		name: "web-ui",
		type: "management",
		token: serverCfg.acl_master_token
	} ).then( function( result ) {
		console.log( result[ 0 ] );
	}, function( err ) {
		console.error( err );
	} );
} );
