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
			const config = global.config;
			if(config.server && config.server.privateKey) {
				delete config.server.privateKey;
			}
			return res.status(StatusCodes.OK).json(config);
		} catch (e) {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
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
			'routes'
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
				if(req.body.routes) {
					config.routes = Object.assign(
						config.routes,
						req.body.routes);
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
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //set

};
