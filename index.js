const version = require('./version/version');
const app = require('./app');
const server = require('http').Server(app);
const logger = require('./shared/winstonLogger');
const errorManagement = require('./shared/errorManagement');


const port = process.env.NODE_PORT || 3050;

app.set('port',port);

app.on('initComplete', () => {
	server.listen(app.get('port'),() => {
		console.log(`${version.app}@${version.version} ${version.vendor} ©${version.year}`);
		console.log(`Puerto ${server.address().port} abierto. Servidor listo`);
		logger.info(`Puerto ${server.address().port} abierto. Servidor listo`);
	});
});


process.on('unhandledRejection', (reason, p) => { // eslint-disable-line
	// I just caught an unhandled promise rejection,
	// since we already have fallback handler for unhandled errors (see below),
	// let throw and let him handle that
	console.log(p);
	throw reason;
});

process.on('uncaughtException', (error) => {
	// I just received an error that was never handled, time to handle it and then decide whether a restart is needed
	errorManagement.handler.handleError(error);
	// if (!errorManagement.handler.isTrustedError(error))
	// 	process.exit(1);
});
