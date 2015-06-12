/*
	1. Create 2 different tokens
	2. Create keys relevant to token policies
	3. Create services relevant to token policies
	4. Test token access to keys and services
	5. Clean up created tokens
*/

var should = require( "chai" ).should();
var when = require( "when" );
var _ = require( "lodash" );
var consul = require( "../src/connection.js" )();
var serverCfg = require( "../.consul/server.json" );

var tokens = require( "./helpers/tokens.js" );
var keys = require( "./helpers/keys.js" );
var services = require( "./helpers/services.js" );

var MASTER_TOKEN = serverCfg.acl_master_token;
var WEB_TOKEN;
var DB_TOKEN;

describe( "ACL Interactions", function() {

	before( function( done ) {

		when.all( [
			tokens.create( consul, MASTER_TOKEN ),
			keys.create( consul, MASTER_TOKEN ),
			services.create( consul, MASTER_TOKEN )
		] ).then( function( results ) {
			var tokenResults = results[ 0 ];
			WEB_TOKEN = tokenResults[ 0 ][ 0 ].ID;
			DB_TOKEN = tokenResults[ 1 ][ 0 ].ID;

			done();
		} );

	} );

	after( function( done ) {

		when.all( [
			tokens.remove( consul, MASTER_TOKEN, [ WEB_TOKEN, DB_TOKEN ] ),
			keys.remove( consul, MASTER_TOKEN ),
			services.remove( consul, MASTER_TOKEN )
		] ).then( function() {
			done();
		} );

	} );

	describe( "Key-Value Access", function() {

		describe( "read permissions", function() {
			describe( "when getting", function() {
				var result;
				before( function( done ) {
					consul.kv.get( {
						key: "db/key1",
						token: WEB_TOKEN
					} ).then( function( res ) {
						result = res[ 0 ].Value;
						done();
					} );
				} );

				it( "should get the key successfully", function() {
					result.should.equal( "db-value1" );
				} );
			} );

			describe( "when setting", function() {
				var error;
				before( function( done ) {
					consul.kv.set( {
						key: "db/notgonnawork",
						value: "nope",
						token: WEB_TOKEN
					} ).then( function( res ) {
						done();
					}, function( err ) {
						error = err;
						done();
					} );
				} );

				it( "should reject with permission denied", function() {
					error.message.should.contain( "Permission denied" );
				} );
			} );
		} );


		describe( "when getting a key with write permissions", function() {
			describe( "when getting", function() {
				var result;
				before( function( done ) {
					consul.kv.get( {
						key: "web/key1",
						token: WEB_TOKEN
					} ).then( function( res ) {
						result = res[ 0 ].Value;
						done();
					} );
				} );

				it( "should get the key successfully", function() {
					result.should.equal( "web-value1" );
				} );
			} );

			describe( "when setting", function() {
				var result;
				before( function( done ) {
					consul.kv.set( {
						key: "web/yep",
						value: "hey",
						token: WEB_TOKEN
					} ).then( function( res ) {
						result = res[ 0 ];
						done();
					} );
				} );

				after( function( done ) {
					consul.kv.del( {
						key: "web/yep",
						token: WEB_TOKEN
					} ).then( function() {
						done();
					} );
				} );

				it( "should set successfully", function() {
					result.should.be.ok;
				} );
			} );
		} );

		describe( "when getting a key with default deny policy", function() {
			describe( "when getting", function() {
				var result;
				before( function( done ) {
					consul.kv.get( {
						key: "service/key1",
						token: WEB_TOKEN
					} ).then( function( res ) {
						result = res[ 0 ];
						done();
					} );
				} );

				it( "should return undefined", function() {
					should.not.exist( result );
				} );
			} );

			describe( "when setting", function() {
				var error;
				before( function( done ) {
					consul.kv.set( {
						key: "other1",
						value: "nope",
						token: WEB_TOKEN
					} ).then( function( res ) {
						done();
					}, function( err ) {
						error = err;
						done();
					} );
				} );

				it( "should reject with permission denied", function() {
					error.message.should.contain( "Permission denied" );
				} );
			} );
		} );

	} );

	describe( "Service Access", function() {
		describe( "when the default policy is read", function() {

			/*
				This results of this test seems to indicate that the client token
				can register a service with the local agent, but the ACL prevents
				the service registration from syncing to server.
			*/

			describe( "when registering a new service", function() {
				var result;
				before( function( done ) {
					consul.agent.service.register( {
						id: "myservice",
						name: "myservice",
						token: WEB_TOKEN
					} ).then( function() {
						// Getting service list from server catalog because
						// the service shows up in the local agent
						consul.catalog.service.list( {
							token: MASTER_TOKEN
						} ).then( function( res ) {
							result = res[ 0 ];
							done();
						} );

					} );
				} );

				after( function( done ) {
					consul.agent.service.deregister( {
						id: "myservice",
						token: MASTER_TOKEN
					} ).then( function() {
						done();
					} );
				} );

				it( "should not sync service to server", function() {
					result.should.not.haveOwnProperty( "myservice" );
				} );

			} );

		} );

		describe( "when prefix policy is write", function() {

			describe( "when registering a new service", function() {

				var result;
				before( function( done ) {
					consul.agent.service.register( {
						id: "web-myservice",
						name: "web-myservice",
						token: WEB_TOKEN
					} ).then( function() {
						consul.catalog.service.list( {
							token: MASTER_TOKEN
						} ).then( function( res ) {
							result = res[ 0 ];
							done();
						} );

					} );
				} );

				after( function( done ) {
					consul.agent.service.deregister( {
						id: "web-myservice",
						token: MASTER_TOKEN
					} ).then( function() {
						done();
					} );
				} );

				it( "should allow registration", function() {
					result.should.haveOwnProperty( "web-myservice" );
				} );
			} );

		} );

		describe( "when prefix policy is read", function() {
			describe( "when registering a new service", function() {

				var result;
				before( function( done ) {
					consul.agent.service.register( {
						id: "secure-myservice",
						name: "secure-myservice",
						token: WEB_TOKEN
					} ).then( function() {
						// Getting service list from server catalog because
						// the service shows up in the local agent
						consul.catalog.service.list( {
							token: MASTER_TOKEN
						} ).then( function( res ) {
							result = res[ 0 ];
							done();
						} );

					} );
				} );

				after( function( done ) {
					consul.agent.service.deregister( {
						id: "secure-myservice",
						token: MASTER_TOKEN
					} ).then( function() {
						done();
					} );
				} );

				it( "should not sync service to server", function() {
					result.should.not.haveOwnProperty( "secure-myservice" );
				} );

			} );

		} );

		describe( "when prefix policy is deny", function() {

			describe( "when registering a new service", function() {
				var result;
				before( function( done ) {
					consul.agent.service.register( {
						id: "notsosecure-myservice",
						name: "notsosecure-myservice",
						token: WEB_TOKEN
					} ).then( function() {
						// Getting service list from server catalog because
						// the service shows up in the local agent
						consul.catalog.service.list( {
							token: MASTER_TOKEN
						} ).then( function( res ) {
							result = res[ 0 ];
							done();
						} );

					} );
				} );

				after( function( done ) {
					consul.agent.service.deregister( {
						id: "notsosecure-myservice",
						token: MASTER_TOKEN
					} ).then( function() {
						done();
					} );
				} );

				it( "should not sync service to server", function() {
					result.should.not.haveOwnProperty( "notsosecure-myservice" );
				} );
			} );

			// Deny does not actually prevent any reading of service information

			describe( "when getting an existing service", function() {
				before( function( done ) {
					consul.catalog.service.list( {
						token: WEB_TOKEN
					} ).then( function( res ) {
						result = res[ 0 ];
						done();
					} );
				} );
				it( "should allow access anyway", function() {
					result.should.haveOwnProperty( "notsosecure-webstuff" );
				} );
			} );

		} );

	} );

} );
