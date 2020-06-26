const redis 			= require('redis');
const {promisify} = require('util');
const logger 			= require('../shared/winstonLogger');
const version 		= require('../version/version');

const cache = (global && global.config && global.config.cache) ? global.config.cache : null;
// console.log(global.config);

if(!cache) {
	logger.error('No hay configuración de caché');
	console.log('No hay configuración de caché');
	module.exports = null;
} else {
	const options = {
		url: cache.url
	};
	const timeToLiveSessions = cache.timeToLiveSessions || 900;
	const timeToLive = cache.timeToLive || 900;
	const redisClient = redis.createClient(options);
	redisClient.hget 			= promisify(redisClient.hget);
	redisClient.hgetall 	= promisify(redisClient.hgetall);
	redisClient.hmset 		= promisify(redisClient.hmset);
	redisClient.hset			= promisify(redisClient.hset);
	redisClient.set 			= promisify(redisClient.set);
	redisClient.get 			= promisify(redisClient.get);
	redisClient.lpush			= promisify(redisClient.lpush);
	redisClient.lrange		= promisify(redisClient.lrange);
	redisClient.flushall	= promisify(redisClient.flushall);
	redisClient.expire		= promisify(redisClient.expire);
	redisClient.keys			= promisify(redisClient.keys);

	var message = '';

	redisClient.on('connect', () => {
		message = 'Canal caché abierto exitosamente';
		logger.info(message);
		console.log(message);
	});

	redisClient.on('ready', () => {
		message = 'Canal caché listo';
		redisClient.set(version.app,version.version);
		logger.info(message);
		console.log(message);

	});

	redisClient.on('error', (error) => {
		message = `Error en la conexión con el sistema caché - Errno: ${error.errno} syscall: ${error.syscall} host ${error.address} port: ${error.port}`;
		logger.info(message);
		console.log(message);
	});

	process.on('SIGINT', () => {
		redisClient.end(() => {
			message = 'Canal de caché terminado';
			logger.info(message);
			console.log(message);
		});
	});

	redisClient.ttlSessions = timeToLiveSessions;
	redisClient.ttl = timeToLive;
	module.exports = redisClient;
}
