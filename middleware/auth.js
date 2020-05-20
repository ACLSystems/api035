const StatusCodes = require('http-status-codes');
const jwt = require('jsonwebtoken');
const User = require('../src/users');

module.exports = {
	async login(req,res) {
		const server = (global && global.config && global.config.server ) ? global.config.server: null;
		const portalVersion = (global && global.config && global.config.portalVersion) ? global.config.portalVersion : 0;
		if(!server || !server.privateKey || !server.publicKey) {
			console.log('Error 101. No hay variables de configuración: ');
			console.log(server);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'error': 101,
				'message': 'Existe un error interno y debe ser revisado por la mesa de servicio. Favor de reportarlo.'
			});
		}
		var expiresIn = server.expires || '1d';
		const audience = server.portalUri || '';
		const issuer = server.issuer || '';

		var privateKey,publicKey;

		if(server.privateKey !== '' && server.publicKey !== '') {
			var buff = Buffer.from(server.privateKey,'base64');
			privateKey = buff.toString('utf-8');
			buff = Buffer.from(server.publicKey,'base64');
			publicKey = buff.toString('utf-8');
		}
		var username = req.body.username || '';
		var password = req.body.password || '';

		if(username === '' || password == '') {
			res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Por favor, proporcione las credenciales para acceder'
			});
			return;
		}
		// try {
		var user = await User.findOne({identifier: username})
			.select('-history')
			.populate({
				path: 'companies.company',
				select: ('isActive name display identifier')
			}).catch((e) => {
				console.log('Error 102');
				console.log(e);
				res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'error': 102,
					'message': 'Error al intentar la búsqueda del usuario',
					'errorMessage': e.message
				});
			});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				'message': 'El usuario y/o password no son correctos'
			});
		}
		if(!user.isActive || !user.isAccountable) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'El acceso para este usuario está deshabilitado. Favor de comunicarse con su representante'
			});
		}
		if(!user.admin) {
			user.admin = {
				isEmailValidated: false,
				tokens: []
			};
		}
		if(user.roles &&
			(user.roles.isAdmin || user.roles.isOperator || user.roles.isTechAdmin || user.roles.isBillAdmin)) {
			const now = new Date();
			let midnight = new Date();
			midnight.setDate(midnight.getDate() + 1);
			midnight.setHours(0,0,0);
			// console.log(midnight);
			let diffTime = midnight - now;
			// console.log(diffTime);
			// console.log('Usuario con expiración de un día');
			expiresIn = diffTime + 'ms';
		}
		user.validatePassword(password, async function(err,isOk) {
			if(isOk) {
				const payload = {
					userid: user._id,
					person: user.person,
					companies: user.companies,
					freshid: user.freshid
				};
				const signOptions = {
					issuer,
					subject: user.identifier,
					audience,
					expiresIn,
					algorithm: 'RS256'
				};
				// console.log(signOptions);
				const token = await jwt.sign(payload, privateKey, signOptions);
				const tokenDecoded = jwt.decode(token);
				if(!user.admin.tokens || !Array.isArray(user.admin.tokens)) {
					user.admin.tokens = [];
				}

				// Mantenimiento al arreglo de tokens
				var invalidTokens = [];
				// console.log(`# of Tokens: ${user.admin.tokens.length}`);
				user.admin.tokens.forEach(tok => {
					jwt.verify(tok,publicKey, (err) => {
						if(err) {
							invalidTokens.push(tok);
						}
					});
				});
				// console.log(`Invalid tokens: ${invalidTokens.length}`);
				user.admin.tokens = user.admin.tokens.filter(item => {return !invalidTokens.includes(item);});

				// Ya limpio el arreglo de tokens agregamos el token nuevo
				user.admin.tokens.push(token);
				user.lastLogin = new Date();
				await user.save();
				// console.log(`# of Tokens: ${user.admin.tokens.length}`);
				return res.status(StatusCodes.OK).json({
					token,
					iat: tokenDecoded.iat,
					exp: tokenDecoded.exp,
					roles: user.roles,
					portalVersion
				});
			} else {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					'message': 'Error: el usuario o el password no son correctos'
				});
			}
		});
		// } catch (e) {
		// 	console.log(e);
		// 	res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		// 		'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
		// 		error: e.message
		// 	});
		// }
	}, //login
};
