var when = require( "when" );
var fs = require( "fs" );

function create( consul, token ) {
	var dbRules = fs.readFileSync( __dirname + "/../../src/db-policies.json", "utf-8" );
	var webRules = fs.readFileSync( __dirname + "/../../src/web-policies.json", "utf-8" );

	return when.all( [
		consul.acl.create( { name: "web-service", type: "client", rules: webRules, token: token } ),
		consul.acl.create( { name: "db-service", type: "client", rules: dbRules, token: token } )
	] );
}

function remove( consul, token, ids ) {
	var tasks = ids.map( function( id ) {
		return consul.acl.destroy( {
			id: id,
			token: token
		} );
	} );

	return when.all( tasks );
}

module.exports = {
	create: create,
	remove: remove
};
