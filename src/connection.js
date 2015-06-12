var consul = require( 'consul' ),
	_ = require( 'lodash' ),
	fs = require( 'fs' ),
	lift = require( 'when/node' ).lift,
	rootCert = fs.readFileSync( __dirname + '/../.consul/root.cer' ),
	cert = fs.readFileSync( __dirname + '/../.consul/consul-agent1.leankit.com/consul-agent1.leankit.com.cer' ),
	key = fs.readFileSync( __dirname + '/../.consul/consul-agent1.leankit.com/consul-agent1.leankit.com.key' ),
	nodeName = 'consul-agent1.leankit.com',
	consulCfg = {
		host: nodeName,
		port: 8501,
		secure: true,
		ca: rootCert,
		cert: cert,
		key: key
	};

var connection;

var toLift = [
	'kv.get', 'kv.keys', 'kv.set', 'kv.del',
	'acl.create', 'acl.update', 'acl.destroy', 'acl.info', 'acl.clone', 'acl.list',
	'agent.check.list', 'agent.check.register', 'agent.check.deregister',
	'agent.check.pass', 'agent.check.warn', 'agent.check.fail',
	'agent.service.list', 'agent.service.register', 'agent.service.deregister', 'agent.service.maintenance',
	'agent.members', 'agent.self', 'agent.maintenance', 'agent.join', 'agent.forceLeave',
	'catalog.datacenters', 'catalog.node.list', 'catalog.node.services',
	'catalog.service.list', 'catalog.service.nodes',
	'health.service', 'health.node', 'health.checks', 'health.state'
];

function _set( obj, k, v ) {
	return _resolve( obj, k, v );
}

function _get( obj, k ) {
	return _resolve( obj, k );
}

function _resolveRecursive( obj, keys, v ) {
	var key = keys.shift();

	if ( key in obj ) {
		if ( keys.length ) {
			return _resolveRecursive( obj[ key ], keys, v );
		} else {
			if ( !_.isUndefined( v ) ) {
				obj[ key ] = v;
			}
			return obj[ key ];
		}
	} else {
		return false;
	}
}

function _resolve( obj, k, v ) {
	var keys = k.split( '.' );
	return _resolveRecursive( obj, keys, v );
}

function getConsulClient( options ) {
	var client = consul( options );
	var lifted;
	_.each( toLift, function( path ) {
		lifted = lift( _get( client, path ) );
		_set( client, path, lifted );
	} );
	return client;
}

module.exports = function() {
	if ( connection ) {
		return connection;
	}

	connection = getConsulClient( consulCfg );
	return connection;
};
