const StatusCodes = require('http-status-codes');
const Config 			= require('../src/config');

module.exports = {

	async get(req,res) {
		try {
			if(!global.config) {
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'No existe configuración. Favor de validar'
				});
			}
			const config = JSON.parse(JSON.stringify(global.config));
			if(config.server && config.server.privateKey) {
				delete config.server.privateKey;
			}
			// console.log(global.config);
			return res.status(StatusCodes.OK).json(config);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //get

	async setConfig(req,res) {
		const keyUser = res.locals.user;
		var updates = Object.keys(req.body);
		if(updates.length === 0) {
			return res.status(StatusCodes.OK).json({
				'message': 'No hay nada que modificar'
			});
		}
		updates = updates.filter(item => item !== '_id');
		updates = updates.filter(item => item !== 'history');
		const allowedUpdates = [
			'server',
			'routes',
			'fresh',
			'mail',
			'cache',
			'fileRepo',
			'apiVersion'
		];
		const isValidOperation = updates.every(update => allowedUpdates.includes(update));
		if(!isValidOperation) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Existen datos inválidos o no permitidos en el JSON proporcionado'
			});
		}
		try {
			var config = await Config.findOne({});
			var history = {
				by: keyUser._id,
				what: 'Modificación de configuración'
			};
			if(!config) {
				const keypair 	= require('keypair');
				config = new Config(req.body);
				const pair = await keypair();
				var buff = Buffer.from(pair.private);
				const privateKey = buff.toString('base64');
				buff = Buffer.from(pair.public);
				const publicKey = buff.toString('base64');
				if(!config.server) {
					config.server = {
						privateKey: privateKey,
						publicKey: publicKey
					};
				} else {
					config.server.privateKey = privateKey;
					config.server.publicKey = publicKey;
				}
				history.what = 'Creación de configuración';
				config.history = [history];
			} else {
				if(req.body.server) {
					config.server = Object.assign(
						config.server,
						req.body.server);
				}
				if(req.body.mail) {
					config.mail = Object.assign(
						config.mail,
						req.body.mail);
				}
				if(req.body.routes) {
					config.routes = Object.assign(
						config.routes,
						req.body.routes);
				}
				if(req.body.fresh) {
					config.fresh = Object.assign(
						config.fresh,
						req.body.fresh);
				}
				if(req.body.fileRepo) {
					config.fileRepo = Object.assign(
						config.fileRepo,
						req.body.fileRepo);
				}
				if(req.body.cache) {
					config.cache = Object.assign(
						config.cache,
						req.body.cache);
				}
				config.history.unshift(history);
			}
			await config.save();
			global.config = config.toObject();
			if(updates.includes('server')) {
				const User = require('../src/users');
				const user = await User.findById(keyUser._id);
				user.admin.tokens = [];
				await user.save();
				res.status(StatusCodes.OK).json({
					'message': 'Modificación de configuración realizada.Es necesario realizar login nuevamente.'
				});
			} else {
				res.status(StatusCodes.OK).json({
					'message': 'Modificación de configuración realizada'
				});
			}
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //set

	async getFreshConfig(req,res) {
		const result = await getConfigFromFresh();
		if(result.error) {
			return res.status(result.status).json(result);
		}
		res.status(StatusCodes.OK).json(result);
	}, //getFreshConfig

};


async function getConfigFromFresh(){
	const fresh = ( global && global.config && global.config.fresh ) ? global.config.fresh : null;
	// console.log(fresh);
	if(!fresh) {
		console.log('No... no hay configuración para conectarnos con fresh');
		// return res.status(StatusCodes.NOT_IMPLEMENTED).json({
		// 	'message': 'El servidor no tiene la configuración para cargar artículos de conocimiento'
		// });
		return {
			message: 'El servidor no tiene la configuración para extraer carpetas',
			error: 'Error de configuración',
			status: StatusCodes.NOT_IMPLEMENTED
		};
	}
	if(!fresh.serverUrl) {
		console.log('No... no hay configuración para conectarnos con fresh');
		// return res.status(StatusCodes.NOT_IMPLEMENTED).json({
		// 	'message': 'El servidor no tiene la configuración para cargar artículos de conocimiento públicos'
		// });
		return {
			message: 'El servidor no tiene la configuración para extraer carpetas',
			error: 'Error de configuración',
			status: StatusCodes.NOT_IMPLEMENTED
		};
	}
	const auth = new Buffer.from(fresh.apiKey + ':X');
	var options = {
		method: 'get',
		url: fresh.serverUrl + '/solution/categories.json',
		headers: {
			'Authorization': 'Basic ' + auth.toString('base64')
		}
	};
	const axios = require('axios');
	const response = await axios(options).catch(error => {
		console.log(error);
		return {
			message: 'Hubo un error en la comunicación con Fresh',
			error: error.response.data,
			status: StatusCodes.INTERNAL_SERVER_ERROR
		};
		// res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		// 	message: 'Hubo un error en la comunicación con Fresh',
		// 	error: error.response.data
		// });
	});
	if(response && response.data) {
		return response.data;
	}
}
