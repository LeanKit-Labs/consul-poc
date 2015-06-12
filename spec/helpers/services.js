var when = require( "when" );
var _ = require( "lodash" );
var services = require( "./services.json" );

function create( consul, token ) {
	var tasks = [];
	var options;
	_.forEach( services, function( service ) {
		service.token = token;
		tasks.push( consul.agent.service.register( service ) );
	} );

	return when.all( tasks );
}

function remove( consul, token ) {
	var tasks = [];
	var options;
	_.forEach( services, function( service ) {
		options = {
			id: service.id,
			token: token
		};
		tasks.push( consul.agent.service.deregister( options ) );
	} );

	return when.all( tasks );
}

module.exports = {
	create: create,
	remove: remove
};
