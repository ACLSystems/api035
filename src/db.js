const mongoose 		= require('mongoose');
const uriFormat 	= require('mongodb-uri');
const init 				= require('./init');
const appGlobal 	= require('../shared/global');
const logger 			= require('../shared/winstonLogger');
mongoose.Promise	= global.Promise;

var message = '';
var dbURI = process.env.MONGO_URI || null;


module.exports = (app) => {
	if(!dbURI) {
		message = `No tengo acceso a la base de datos. MONGO_URI: ${process.env.MONGO_URI}`;
		logger.error(message);
		console.log(message);
		process.exit(0);
	}
	const options = {
		connectTimeoutMS: 10000,
		poolSize: 10,
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
		useFindAndModify: false,
	};

	console.log('Iniciando conexión a la base');

	mongoose.connect(encodeMongoURI(dbURI), options)
		.catch(e => {
			console.log('Error de conexión: ');
			console.log(e.message);
			console.log('Apagando servicio');
			process.exit(1);
		});

	const nodeEnv = process.env.NODE_ENV || 'development';
	const nodeDebug = JSON.parse(process.env.NODE_DEBUG) || false;

	if((nodeEnv === 'development' || nodeEnv === 'test') && nodeDebug) {
		mongoose.set('debug',true);
	}

	var systemInit = true;

	mongoose.connection.on('connected', async () => {
		message = 'Conexión a la base abierta';
		logger.info(message);
		console.log(message);
		await init(app);
		if(systemInit) {
			// Colocar procesos que deben arrancar junto con el servidor
			systemInit = false;
		}
		await appGlobal(app);
	});

	mongoose.connection.on('error', err => {
		message = `Error en la conexión a la base: ${err}`;
		logger.error(message);
		console.log(message);
	});

	mongoose.connection.on('disconnected', () => {
		message = 'Base desconectada';
		logger.error(message);
		console.log(message);
	});

	process.on('SIGINT', () => {
		mongoose.connection.close(() => {
			message = 'Conexión a la base terminada debido a cierre del servidor';
			logger.error(message);
			console.log(message);
			message = 'Proceso de servidor terminado exitósamente';
			logger.error(message);
			console.log(message);
			process.exit(0);
		});
	});
};

function encodeMongoURI (urlString) {
	if (urlString) {
		let parsed = uriFormat.parse(urlString);
		urlString = uriFormat.format(parsed);
	}
	return urlString;
}
