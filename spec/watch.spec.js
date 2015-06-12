/*
	1. Define a service
	2. Define a watch on that service
	3. Update service
	4. See if changes are detected properly
*/

var should = require( "chai" ).should();
var when = require( "when" );
var sequence = require( "when/sequence" );
var _ = require( "lodash" );
var consul = require( "../src/connection.js" )();
var serverCfg = require( "../.consul/server.json" );

var MASTER_TOKEN = serverCfg.acl_master_token;

describe( "Watch Proof of Concept", function() {
	this.timeout( 10000 );

	var watch;
	var updates = [];

	before( function( done ) {
		consul.agent.service.register( {
			id: "cache",
			name: "cache",
			tags: [ "master" ],
			address: "127.0.0.1",
			port: 8000,
			token: MASTER_TOKEN,
			check: {
				ttl: "60s",
				notes: "Yo dawg, you gotta check in"
			}
		} ).then( function( result ) {

			watch = consul.watch( {
				method: consul.health.service,
				options: {
					service: "cache",
					token: MASTER_TOKEN
				}
			} );

			watch.on( "change", function( data, res ) {
				updates.push( data );
			} );

			watch.on( "error", function( err ) {
				console.log( "ERROR: ", err );
				watch.end();
				done();
			} );

			setTimeout( function() {

				sequence( [ function() {
					return consul.agent.check.pass( {
						id: "service:cache",
						note: "passing",
						token: MASTER_TOKEN
					} );
				}, function() {
					return consul.agent.check.warn( {
						id: "service:cache",
						note: "i'm warning ya",
						token: MASTER_TOKEN
					} );
				}, function() {
					return consul.agent.check.fail( {
						id: "service:cache",
						note: "oh noes",
						token: MASTER_TOKEN
					} );
				}
				] ).then( function( res ) {
					watch.end();
					done();
				} );
			}, 1000 );

		} );
	} );

	after( function( done ) {
		consul.agent.service.deregister( {
			id: "cache"
		} ).then( function() {
			done();
		} );
	} );

	it( "should capture service updates", function() {
		updates[ 0 ][ 0 ].Checks[ 0 ].Status.should.equal( "critical" );
		updates[ 1 ][ 0 ].Checks[ 0 ].Status.should.equal( "passing" );
		updates[ 2 ][ 0 ].Checks[ 0 ].Status.should.equal( "warning" );
		updates[ 3 ][ 0 ].Checks[ 0 ].Status.should.equal( "critical" );
	} );

} );
