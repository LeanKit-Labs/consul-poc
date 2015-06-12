var when = require( "when" );
var _ = require( "lodash" );
var keys = require( "./keys.json" );

function create( consul, token ) {
	var tasks = [];
	_.forEach( keys, function( value, key ) {
		tasks.push( consul.kv.set( {
			key: key,
			value: value,
			token: token
		} ) );
	} );

	return when.all( tasks );
}

function remove( consul, token ) {
	var tasks = [];
	_.forEach( keys, function( value, key ) {
		tasks.push( consul.kv.del( {
			key: key,
			token: token
		} ) );
	} );

	return when.all( tasks );
}

module.exports = {
	create: create,
	remove: remove
};
