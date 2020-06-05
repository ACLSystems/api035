const jwt = require('jsonwebtoken');
const User = require('../src/users');
const StatusCodes = require('http-status-codes');

module.exports = async function(req,res,next){
	if(!global.config || !global.config.server) {
		console.log('Error: No existe configuración');
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			'message': 'Error interno. No existe configuración. Comunicarse con la mesa de servicio.'
		});
	}

	const config = global.config.server;
	// console.log(config);
	if(!config.publicKey) {
		console.log('Error: No existe llave pública');
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			'message': 'Error interno. No existe llave pública. Comunicarse con la mesa de servicio.'
		});
	}
	var publicKey = config.publicKey;
	var buff = Buffer.from(publicKey,'base64');
	publicKey = buff.toString('utf-8');
	const audience = config.portalUri;
	const issuer = config.issuer;
	const verifyOptions = {
		issuer, audience, algorithm: ['RS256']
	};
	var token = req.headers['Authorization'] || req.headers['authorization'] || (req.body && req.body.access_token) || null;
	if(!token) {
		return res.status(StatusCodes.UNAUTHORIZED).json({
			'message': 'No autorizado. Requiere token'
		});
	}
	try {
		// quitarle el "Bearer " si existe
		var user;
		if(token.includes('Basic')) {
			token = token.replace('Basic ','');
			const buff = Buffer.from(token,'base64');
			const decoded = buff.toString('utf-8');
			const [ apiKey ] = decoded.split(':');
			user = await User.findOne({
				apiKey: apiKey,
			}).populate({
				path: 'companies.company',
				select: '-history'
			}).select('-password -__v -oneTimePassword -apiKey');
			if(!user) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					'message': 'Token no válido. Favor de iniciar sesión'
				});
			}
			res.locals.user = user.toObject();
			user.lastAccess = new Date();
			await user.save();
			return next();
		}
		token = token.replace('Bearer ','');
		// validar el token
		var decoded = await jwt.verify(token,publicKey,verifyOptions);
		var expired = new Date(0);
		expired.setUTCSeconds(decoded.exp);
		req.headers.key = decoded.sub;
		user = await User.findOne({
			_id: decoded.userid,
			'admin.tokens': token
		}).populate({
			path: 'companies.company',
			select: '-history'
		}).select('-password -__v -oneTimePassword -apiKey');
		if(!user) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Token no válido. Favor de iniciar sesión'
			});
		}
		if(!user.isActive || !user.isAccountable) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Tu acceso ha sido revocado'
			});
		}
		var dbUserObj = {
			identifier: user.identifier,
			roles: user.roles,
			person: user.person
		};
		var url = req.url;
		const indexurl = url.indexOf('?');
		if(indexurl !== -1) {
			url = url.substring(0,indexurl);
		}
		if(
			(url.indexOf('admin') !== -1 && dbUserObj.roles.isAdmin) ||
			(url.indexOf('supervisor') !== -1 && dbUserObj.roles.isSupervisor) ||
			(url.indexOf('requester') !== -1 && dbUserObj.roles.isRequester) ||
			(url.indexOf('operator') !== -1 && dbUserObj.roles.isOperator) ||
			(url.indexOf('techadmin') !== -1 && dbUserObj.roles.isTechAdmin) ||
			(url.indexOf('billadmin') !== -1 && dbUserObj.roles.isBillAdmin) ||
			(url.indexOf('admin') === -1 &&
			url.indexOf('supervisor') === -1 &&
			url.indexOf('requester') === -1 &&
			url.indexOf('operator') === -1 &&
			url.indexOf('techadmin') === -1 &&
			url.indexOf('billadmin') === -1 &&
			url.indexOf('/api/v1/') !== -1
			)
		) {
			res.locals.user = user.toObject();
			res.locals.token = token;
			res.locals.url = url;
			user.lastAccess = new Date();
			await user.save();
			next();
		} else {
			return res.status(StatusCodes.FORBIDDEN).json({
				'message': 'Usuario no autorizado'
			});
		}
	} catch (e) {
		if(e.name === 'TokenExpiredError') {
			var tokenDecoded = await jwt.decode(token);
			var userExpired = await User.findById(tokenDecoded.userid);
			if(!userExpired) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'Token expirado y error en el usuario'
				});
			}
			if(!userExpired.admin) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'Token expirado y error en el registro del usuario'
				});
			}
			if(!userExpired.admin.tokens) {
				userExpired.admin.tokens = [];
			}
			userExpired.admin.tokens = userExpired.admin.tokens.filter(tok => {
				return tok !== token;
			});
			await userExpired.save();
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Token expirado. Favor de iniciar sesión',
				'errMessage': e.message,
				'expiredAt': e.expiredAt
			});
		}
		if(e.name === 'JsonWebTokenError') {
			var message;
			switch (e.message) {
			case 'jwt signature is required':
				message = 'El token es inválido';
				break;
			case 'invalid signature':
				message = 'Firma de token inválida';
				break;
			case 'jwt audience invalid':
				message = 'Token no pertenece a este sitio';
				break;
			case 'jwt issuer invalid':
				message = 'Firma no pertenece a este sitio';
				break;
			case 'jwt id invalid':
				message = 'Token ID no válido';
				break;
			case 'jwt subject invalid':
				message = 'Usuario del token inválido';
				break;
			default:
				message = 'Hay un error en el token.';
			}
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': `${message}. Favor de iniciar sesión`,
				'errMessage': e.message
			});
		}
		return res.status(StatusCodes.UNAUTHORIZED).json({
			message: e.message
		});
	}
};
