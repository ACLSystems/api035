const express = require('express');
// const multer = require('multer');
const bodyParser = require('body-parser');
const bodyParserJsonError = require('./shared/validateJSON');
const helmet = require('helmet');
const StatusCodes = require('http-status-codes');

const db = require('./src/db'); // eslint-disable-line
const app = express();

db(app);

app.on('ready',() => {
	const jsonBodyLimit	= global.config.routes.jsonBodyLimit || '50mb';
	const publicRoutes = require('./routes/publicRoutes');
	const userRoutes = require('./routes/userRoutes');
	const companyRoutes = require('./routes/companyRoutes');
	const configRoutes = require('./routes/configRoutes');
	const publicityRoutes = require('./routes/publicityRoutes');
	const serviceRoutes = require('./routes/servicesRoutes');

	app.disable('x-powered-by');
	/** Encabezados CORS */
	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,Authorization');
		if (req.method == 'OPTIONS') {
			res.status(StatusCodes.OK).end();
		} else {
			next();
		}
	});

	app.use(helmet());

	// Todas las rutas debajo de /api/v1/ deben venir con token
	app.all ('/api/v1/*', [require('./middleware/validateRequest')]);

	app.use(bodyParser.json({limit: jsonBodyLimit}));
	app.use(bodyParserJsonError());

	// rutas
	publicRoutes(app);
	userRoutes(app);
	companyRoutes(app);
	configRoutes(app);
	publicityRoutes(app);
	serviceRoutes(app);

	app.use(function(req, res) {
		res.status(StatusCodes.NOT_FOUND).json({
			'message': `Error: API solicitada no existe: ${req.method} ${req.url}`
		});
	});

	app.emit('initComplete');

	console.log('Rutas disponibles: ');
	app._router.stack.forEach(r => {
		if(r.route && r.route.path){
			console.log(`	path: ${r.route.path} methods: ${JSON.stringify(r.route.methods)}`);
		}
	});
});

module.exports = app;
