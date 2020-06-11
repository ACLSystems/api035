const StatusCodes = require('http-status-codes');
const User 				= require('../src/users');
const manageError = require('../shared/errorManagement').manageError;

module.exports = {

	async test(req,res) {
		res.status(StatusCodes.OK).json({
			message: 'Hello'
		});
	}, // test

	async logout(req,res) {
		const keyUser = res.locals.user;
		const token = res.locals.token;
		try {
			var user = await User.findOne({identifier: keyUser.identifier, 'admin.tokens': token});
			if(!user) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'El usuario o la sesión no existen'
				});
			}
			if(!user.admin || !user.admin.tokens) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'El usuario o la sesión no existen'
				});
			}
			user.admin.tokens = user.admin.tokens.filter(tok => {
				return tok !== token;
			});
			await user.save();
			res.status(StatusCodes.OK).json({
				'message': 'Se ha cerrado la sesión'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //logout

	async tokenRefresh(req,res) {
		const jwt = require('jsonwebtoken');
		const keyUser = res.locals.user;
		try {
			const user = await User.findById(keyUser._id);
			if(!user) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					'message': 'Usuario no localizado'
				});
			}
			if(!user.isActive || !user.isAccountable) {
				return res.status(StatusCodes.UNAUTHORIZED).json({
					'message': 'El acceso para este usuario está deshabilitado. Favor de comunicarse con su representante'
				});
			}
			const server = global.config.server;
			if(!server || !server.privateKey || !server.publicKey) {
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Existe un error interno y debe ser revisado por la mesa de servicio. Favor de reportarlo.'
				});
			}
			const expiresIn = server.expires || '1d';
			const audience = server.portalUri || '';
			const issuer = server.issuer || '';

			var privateKey,publicKey;

			if(server.privateKey !== '' && server.publicKey !== '') {
				var buff = Buffer.from(server.privateKey,'base64');
				privateKey = buff.toString('utf-8');
				buff = Buffer.from(server.publicKey,'base64');
				publicKey = buff.toString('utf-8');
			}
			const payload = {
				userid: user._id,
				person: user.person,
				companies: user.companies,
				freshid: user.freshid
			};
			const signOptions = {
				issuer,
				subject: keyUser.identifier,
				audience,
				expiresIn,
				algorithm: 'RS256'
			};
			const token = await jwt.sign(payload, privateKey, signOptions);
			const tokenDecoded = jwt.decode(token);
			if(!keyUser.admin.tokens || !Array.isArray(user.admin.tokens)) {
				user.admin.tokens = [];
			}

			// quitamos el token anterior
			user.admin.tokens.filter(tok => tok !== token);
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
			return res.status(StatusCodes.OK).json({
				token,
				iat: tokenDecoded.iat,
				exp: tokenDecoded.exp,
				roles: user.roles
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}

	}, //tokenRefresh

	async logoutAllButMe(req,res) {
		const keyUser = res.locals.user;
		const token = res.locals.token;
		try {
			var user = await User.findOne({identifier: keyUser.identifier, 'admin.tokens': token});
			if(!user) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'El usuario o la sesión no existen'
				});
			}
			if(!user.admin || !user.admin.tokens) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'El usuario o la sesión no existen'
				});
			}
			user.admin.tokens = [token];
			await user.save();
			res.status(StatusCodes.OK).json({
				'message': 'Se han cerrado las demás sesiones'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //logoutAllButMe

	async logoutAll(req,res) {
		const keyUser = res.locals.user;
		const token = res.locals.token;
		try {
			var user = await User.findOne({identifier: keyUser.identifier, 'admin.tokens': token});
			if(!user) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'El usuario o la sesión no existen'
				});
			}
			if(!user.admin || !user.admin.tokens) {
				return res.status(StatusCodes.NOT_FOUND).json({
					'message': 'El usuario o la sesión no existen'
				});
			}
			user.admin.tokens = [];
			await user.save();
			res.status(StatusCodes.OK).json({
				'message': 'Se han cerrado todas las sesiones'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //logoutAll

	async create(req,res) {
		const keyUser = res.locals.user;
		try {
			const userFound = await User.findOne({identifier: req.body.identifier})
				.select('-password -admin -admin')
				.populate({
					path: 'companies.company',
					select: ('isActive name display identifier')
				});
			if(userFound) {
				return res.status(StatusCodes.OK).json({
					'message': 'Usuario con el identificador ya existe',
					'user': userFound
				});
			}
			const securePass = require('secure-random-password');
			const user = new User(req.body);
			const keys = Object.keys(req.body);
			if(!keys.includes('password')) {
				user.password = securePass.randomPassword({
					length: 12,
					characters: [{
						characters: securePass.upper,
						exactly: 4
					},{
						characters: securePass.symbols,
						exactly: 2
					},{
						characters: securePass.digits,
						exactly: 2
					},
					securePass.lower
					]
				});
				if(!user.admin) {
					user.admin = {
						initialPassword: this.password
					};
				}
			}
			user.history = [{
				by: keyUser._id,
				what: 'Creación del usuario'
			}];
			// console.log(user);

			const server = (global.config && global.config.server) ? global.config.server : null;
			if(server && server.portalUri && user.person && user.person.email) {
				const nanoid = require('nanoid');
				const generate = nanoid.customAlphabet('1234567890abcdefghijklmnopqrstwxyz', 35);
				user.admin.validationString = generate();
				const mail = require('../shared/mail');
				const toName = user.person.name || 'Nombre de usuario no definido';
				const link = `${server.portalUri}/#/landing/confirm/${user.admin.validationString}/${user.person.email}`;
				await mail.sendMail(
					user.person.email,
					toName,
					user._id,
					'Activar cuenta para Kiosco',
					`Se ha creado tu cuenta para el kiosco de servicios. Debes activarla siguiendo la liga: ${link}`
				);
			}
			await user.save();
			const userReturned = {
				identifier: user.identifier,
				person: user.person || undefined,
				companies: user.companies || undefined,
				roles: user.roles || undefined,
				initialPassword: (user.admin && user.admin.initialPassword) ? user.admin.initialPassword : undefined
			};
			return res.status(StatusCodes.CREATED).json(userReturned);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, // create

	async getMyDetails(req,res) {
		// const jm = require('js-meter');
		// const m = new jm({
		// 	isPrint: true,
		// 	isKb: true
		// });
		const keyUser = res.locals.user;
		delete keyUser.isAccountable;
		delete keyUser.created;
		delete keyUser.updated;
		delete keyUser.history;
		delete keyUser.admin;
		if(!keyUser.isOperator) {
			delete keyUser.assignedCompanies;
		}
		res.status(StatusCodes.OK).json(keyUser);
	}, //getMyDetails

	async read(req,res) {
		const keyUser = res.locals.user;
		const isOperator = keyUser.roles.isOperator;
		const isSupervisor = keyUser.roles.isSupervisor;
		try {
			var select;
			if(isOperator) {
				select = '-roles -admin -history -password';
			}
			if(isSupervisor && !isOperator) {
				select = '-roles -admin -history -password -freshid -isAccountable -char1 -char2 -flag1 -flag2';
			}
			const user = await User.findById(req.params.userid)
				.select(select)
				.populate({
					path: 'companies.company',
					select: '-history'
				})
				.lean();
			if(user) {
				if(isSupervisor) {
					if(checkCompanies(keyUser.companies,user.companies)) {
						return res.status(StatusCodes.OK).json(user);
					}
					return res.status(StatusCodes.OK).json({
						'message': 'Usuario no pertenece a la empresa'
					});
				}
				if(isOperator) {
					return res.status(StatusCodes.OK).json(user);
				}
			}
			res.status(StatusCodes.OK).json({
				'message': 'No se encontró usuario'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //read

	async search(req,res) {
		const keyUser = res.locals.user;
		const isOperator = keyUser.roles.isOperator;
		const isSupervisor = keyUser.roles.isSupervisor;
		var query = req.query;
		var select = '-history -password';
		const page = query.page ? +query.page : 0;
		const perPage = query.perPage ? +query.perPage: 10;
		const keys = Object.keys(query);
		// console.log(keys);
		if(keys.includes('person.name')) {
			query['person.name'] = {
				'$regex': query['person.name'],
				'$options': 'i'
			};
			// query.person = !query.person ? {} : query.person;
			// query.person.name = query['person.name'];
			// delete query['person.name'];
		}
		if(keys.includes('person.fatherName')) {
			// query.person = !query.person ? {} : query.person;
			// query.person.fatherName = query['person.fatherName'];
			// delete query['person.fatherName'];
			query['person.fatherName'] = {
				'$regex': query['person.fatherName'],
				'$options': 'i'
			};
		}
		if(keys.includes('person.motherName')) {
			// query.person = !query.person ? {} : query.person;
			// query.person.motherName = query['person.motherName'];
			// delete query['person.motherName'];
			query['person.motherName'] = {
				'$regex': query['person.motherName'],
				'$options': 'i'
			};
		}
		if(keys.includes('companies')) {
			// console.log(query.companies);
			query.companies = JSON.parse(query.companies);
			// console.log(query);
			if(Array.isArray(query.companies)) {
				query['companies.company'] = {
					$in: query.companies
				};
				delete query['companies'];
			} else {
				return res.status(StatusCodes.NOT_ACCEPTABLE).json({
					'message': 'El campo de búsqueda "Companies" debe ser un arreglo'
				});
			}
		}
		if(keys.includes('general')) {
			query = {
				$or: [{
					'person.name': {
						'$regex': query.general,
						'$options': 'i'
					}
				},{
					'person.fatherName': {
						'$regex': query.general,
						'$options': 'i'
					}
				},{
					'person.motherName': {
						'$regex': query.general,
						'$options': 'i'
					}
				},{
					identifier: {
						'$regex': query.general,
						'$options': 'i'
					}
				}]
			};
		}
		// var sendInitialPass = false;
		// if(keys.includes('inipass')) {
		// 	sendInitialPass = true;
		// }
		// res.status(200).json(query);
		// return;
		// if(isOperator) {
		// 	select = '-roles -admin -history -password';
		// }
		if(isSupervisor && !isOperator) {
			select = select.concat(' ', '-roles -freshid -isAccountable -char1 -char2 -flag1 -flag2' );
			query.companies.company = keyUser.company._id;
			query.companies.isActive = true;
		}
		try {
			// console.log(query);
			const users = await User.find(query)
				.select(select)
				.limit(perPage)
				.skip(perPage * page)
				.sort({ identifier: 'asc'})
				.populate({
					path: 'companies.company',
					select: ('isActive name display identifier')
				})
				.lean();
			if(Array.isArray(users) && users.length > 0) {
				return res.status(StatusCodes.OK).json(users);
			}
			return res.status(StatusCodes.OK).json({
				'message': 'La búsqueda no arrojó usuarios'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //search

	async addEmail(req,res) {
		const keyUser = res.locals.user;
		const email = req.body.email;
		var id = keyUser._id;
		const nanoid = require('nanoid');
		const generate = nanoid.customAlphabet('1234567890abcdefghijklmnopqrstwxyz', 35);
		// return console.log(generate());
		const server = (global.config && global.config.server) ? global.config.server : null;
		if(!server) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'No hay configuración del servidor. Favor de contactar a la mesa de servicio'
			});
		}
		if(server && !server.portalUri) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'No hay configuración de portal. Favor de contactar a la mesa de servicio'
			});
		}
		if((keyUser.roles && (
			keyUser.roles.isAdmin ||
			keyUser.roles.isSupervisor ||
			keyUser.roles.isTechAdmin ||
			keyUser.roles.isOperator ||
			keyUser.roles.isBillAdmin
		)) &&
			req.body.identifier &&
			req.body.identifier + '' !== id + ''
		) {
			id = req.body.identifier;
		}
		try {
			var user = await User.findById(id);
			if(!user) {
				return res.status(StatusCodes.OK).json({
					'message': 'Usuario no encontrado'
				});
			}
			var userEmail = await User.findOne({
				'person.email': email
			});
			// console.log(user._id);
			// console.log(userEmail._id);
			if(userEmail && user._id + '' !== userEmail._id + '') {
				return res.status(StatusCodes.NOT_ACCEPTABLE).json({
					'message': 'La cuenta de correo proporcionada está siendo usada por otro usuario'
				});
			}
			const what = (user.person && user.person.email) ? 'Correo agregado' : 'Correo modificado';
			if(user.person) {
				user.person.email = email;
			} else {
				user.person = {
					email
				};
			}
			if(user.admin) {
				user.admin.validationString = generate();
				user.admin.validationDate = new Date();
			} else {
				user.admin = {
					validationString: generate(),
					validationDate: new Date()
				};
			}
			user.history.unshift({
				by: keyUser._id,
				what
			});
			await user.save();
			const mail = require('../shared/mail');
			const toName = user.person.name || 'No definido';
			const link = `${server.portalUri}/#/landing/confirm/${user.admin.validationString}/${user.person.email}`;
			await mail.sendMail(
				user.person.email,
				toName,
				user._id,
				'Validar Correo',
				`Se ha agregado un correo a tu cuenta. Debes validarla siguiendo la liga: ${link}`
			);
			return res.status(StatusCodes.OK).json({
				'message': what,
				'link': link
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //addEmail

	async confirmEmail(req,res) {
		try {
			const user = await User.findOne({
				'person.email':req.body.email,
				'admin.validationString':req.body.validationString
			});
			if(!user) {
				return res.status(StatusCodes.OK).json({
					'message': 'Usuario o respuesta no encontrados'
				});
			}
			// console.log(user);
			user.admin.isEmailValidated = true;
			user.admin.validationString = '';
			user.admin.validationDate = null;
			user.history.unshift({
				by: user._id,
				what: 'Validación de cuenta de correo'
			});
			await user.save();
			return res.status(StatusCodes.OK).json({
				'message': 'Cuenta confirmada'
			});
		} catch (e) {
			console.log(e);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //confirmEmail

	async reqPassRecovery(req,res) {
		const user = await User
			.findOne({identifier:req.params.identifier})
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					message: 'Hubo un error al intentar localizar al usuario. Favor de intentar más tarde'
				});
			});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'No se encontró un usuario con los datos proporcionados'
			});
		}
		if(!user.person || (user.person && !user.person.email)) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'Este mecanismo no puede utilizarse ya que el usuario encontrado no cuenta con correo electrónico. Solicita al operador que te registren una cuenta de correo.'
			});
		}
		if(!user.isAccountable) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'Tu cuenta no está activada'
			});
		}
		if(!user.isActive) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'Tu cuenta no está activada'
			});
		}
		const server = (global.config && global.config.server) ? global.config.server : null;
		if(!server || (server && !server.portalUri)) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar la solicitud de recuperación de contraseña. Favor de intentar más tarde'
			});
		}
		const nanoid = require('nanoid');
		const mail = require('../shared/mail');
		user.admin.validationString = nanoid.customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 35)();
		user.admin.validationDate = new Date();
		await user.save().catch(e => {
			console.log(e);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar la solicitud de recuperación de contraseña. Favor de intentar más tarde'
			});
		});
		const link = `${server.portalUri}/#/landing/recovery/${user.admin.validationString}`;
		// console.log(link);
		await mail.sendMail(
			user.person.email,
			user.person.name,
			user._id,
			'Solicitud de recuperación de contraseña',
			`<p>Has solicitado recuperar tu contraseña</p> <p>La siguiente liga solo puede usarse una vez y durante las próximas 24 horas.</p><p>Si expira, tendrías que repetir el proceso</p><a href="${link}"><h3>Ingresa ahora</h3></a><p>Si la liga anterior no funciona, copia la siguiente liga y pégala en tu navegador:</p><p>${link}</p>`
		);
		return res.status(StatusCodes.OK).json({
			message: 'Se ha enviado correo con la solicitud de recuperación de contraseña'
		});
	},// reqPassRecovery

	async validatePassRecovery(req,res) {
		const user = await  User.findOne({identifier:req.body.identifier,'admin.validationString': req.body.validationString}).catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error interno al tratar de localizar al usuario. Favor de intentar más tarde'
			});
		});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'RFC o clave no son correctos'
			});
		}
		user.password = req.body.password;
		user.admin.validationString = '';
		await user.save();
		const mail = require('../shared/mail');
		await mail.sendMail(
			user.person.email,
			user.person.name,
			user._id,
			'Contraseña recuperada y modificada',
			'<p>Se ha realizado una recuperación de contraseña exitosa.</p> <p>Si no fuiste tú quien la solicitó te sugerimos ponerte en contacto con la mesa de ayuda.</p>'
		);
		return res.status(StatusCodes.OK).json({
			message: 'Contraseña recuperada'
		});
	}, //validatePassRecovery

	async resetPass(req,res) {
		const keyUser = res.locals.user;
		const {
			isAdmin,
			isSupervisor,
			isOperator,
			isTechAdmin,
			isBillAdmin
		} = keyUser.roles;
		if(!isAdmin && !isSupervisor && !isOperator && !isTechAdmin && !isBillAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes privilegios'
			});
		}
		const user = await User.findById(req.body.userid).catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error interno al tratar de localizar al usuario. Favor de intentar más tarde'
			});
		});
		if(user.roles.isAdmin && !isAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes suficientes privilegios - 100'
			});
		}
		if(user.roles.isTechAdmin && (!isAdmin && !isBillAdmin)) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes suficientes privilegios - 101'
			});
		}
		if(user.roles.isBillAdmin && (!isAdmin && !isTechAdmin)) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes suficientes privilegios - 102'
			});
		}
		if(user.roles.isOperator && (!isAdmin && !isTechAdmin && !isBillAdmin)) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes suficientes privilegios - 103'
			});
		}
		if(user.roles.isSupervisor && (!isAdmin && !isTechAdmin && !isBillAdmin && !isOperator)) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes suficientes privilegios - 104'
			});
		}
		if(user.roles.isRequester && (!isAdmin && !isTechAdmin && !isBillAdmin && !isOperator && !isSupervisor)) {
			// Falta poner que el supervisor tenga la misma compañía que el usuario
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes suficientes privilegios - 104'
			});
		}
		if(user.validatePassword(req.body.newPass)) {
			return res.status(StatusCodes.OK).json({
				message: `Nueva contraseña: ${req.body.newPass}`
			});
		}
		const Secure = require('../shared/secure');
		const pass = req.body.newPass || Secure.createSecurePass();
		user.password = pass;
		if(!user.admin) {
			user.admin = {
				initialPassword: pass
			};
		}
		if(user.admin && !user.admin.password) {
			user.admin.initialPassword = pass;
		}
		await user.save().catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error interno al crear password del usuario. Favor de intentar más tarde'
			});
		});
		if(user.person && user.person.email) {
			const mail = require('../shared/mail');
			await mail.sendMail(
				user.person.email,
				user.person.name,
				user._id,
				'Contraseña modificada',
				`<p>Se ha modificado la contraseña de tu cuenta para el Kiosco. Puedes modificarla una vez que hayas ingresado. La contraseña nueva es:</p><h4>${pass}</h4><p>Si tú no solicitaste una nueva contraseña ponte en contacto con la mesa de servicio.</p>`
			);
		}
		return res.status(StatusCodes.OK).json({
			message: `Nueva contraseña: ${pass}`
		});
	}, // resetPass

	async newPass(req,res) {
		const keyUser = res.locals.user;
		const user = await User.findById(keyUser._id).catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error interno al tratar de localizar al usuario. Favor de intentar más tarde'
			});
		});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'No se localizó al usuario'
			});
		}
		const isOk = await user.validatePassword(req.body.password);
		if(!isOk) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: 'Contraseña no coincide'
			});
		}
		user.password = req.body.newpass;
		await user.save();
		const mail = require('../shared/mail');
		await mail.sendMail(
			user.person.email,
			user.person.name,
			user._id,
			'Contraseña modificada',
			'<p>Se ha realizado una modificación de contraseña exitosa.</p> <p>Si no fuiste tú quien la solicitó te sugerimos ponerte en contacto con la mesa de ayuda.</p>'
		);
		return res.status(StatusCodes.OK).json({
			message: 'Contraseña modificada'
		});
	}, //newPass

	async update(req,res) {
		const keyUser = res.locals.user;
		var updates = Object.keys(req.body);
		const addToArray = req.body.add || false;
		if(updates.length === 0) {
			return res.status(StatusCodes.OK).json({
				'message': 'No hay nada que modificar'
			});
		}
		updates = updates.filter(item => item !== '_id');
		updates = updates.filter(item => item !== 'history');
		updates = updates.filter(item => item !== 'add');
		const allowedUpdates = [
			'identifier',
			'password',
			'isActive',
			'companies',
			'char1','char2',
			'flag1','flag2',
			'person',
			'addresses',
			'phone',
			'isCandidate'
		];
		const allowedArrayAdditions = [
			'addresses','phone'
		];
		const isValidOperation = updates.every(update => allowedUpdates.includes(update));
		const isValidAdditionOperation = updates.every(update => allowedArrayAdditions.includes(update));
		if(!isValidOperation) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Existen datos inválidos o no permitidos en el JSON proporcionado'
			});
		}
		var user = await User.findById(req.params.userid)
			.catch(error => manageError(res,error,'Buscando usuario'));
		if(!user) {
			return res.status(StatusCodes.OK).json({
				'message': 'No se existe el usuario con el id proporcionado'
			});
		}
		if(addToArray && isValidAdditionOperation) {
			const addUpdates = updates.filter(f => allowedArrayAdditions.includes(f));
			addUpdates.forEach(allowedArray => {
				user[allowedArray].push(req.body[allowedArray]);
				user.history.unshift({
					by: keyUser._id,
					what: `Adición: ${addUpdates.join()}`
				});
				delete req.body[allowedArray];
			});
		}
		user = Object.assign(user,req.body);
		user.history.unshift({
			by: keyUser._id,
			what: `Modificaciones: ${updates.join()}`
		});
		if(user.person && user.person.email) {
			delete user.person.email;
		}
		// console.log(user);
		await user.save()
			.catch(error => manageError(res,error,'Guardando usuario'));
		var userToSend = user.toObject();
		delete userToSend.password;
		delete userToSend.history;
		delete userToSend.admin;
		delete userToSend.isAccountable;
		delete userToSend.roles;
		delete userToSend.__v;
		if(userToSend.companies && Array.isArray(userToSend.companies) && userToSend.companies.length > 0) {
			const Company = require('../src/companies');
			var companiesToFind = userToSend.companies.map(com => com.company);
			var companies = await Company.find({
				_id:{
					$in: companiesToFind
				}
			}).select('isActive name display identifier')
				.catch(error => manageError(res,error,'Buscando empresa'));
			companies = companies.map(comp => {
				return {
					isActive: true,
					company: comp
				};
			});
			if(companies.length > 0) {
				userToSend.companies = companies;
			}
		}
		return res.status(StatusCodes.OK).json(userToSend);
	}, // update

	async generateOneTimePassword(req,res) {
		const identifier = req.params.identifier;
		const user = await User.findOne({identifier}).catch(e => {
			console.log(e);
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Error en la búsqueda del usuario'
			});
		});
		if(!user.person || (user.person && !user.person.email)) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Se requiere tener configurada cuenta de correo previamente'
			});
		}
		if(!user.isAccountable) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Tu cuenta debe estar activa'
			});
		}
		const nanoid = require('nanoid');
		const mail = require('../shared/mail');
		const generate = nanoid.customAlphabet('1234567890', 16);
		var value = generate();
		while(value.charAt(0) === '0') {
			value = generate();
		}
		user.oneTimePassword = value;
		user.oneTimePasswordDate = new Date();
		await user.save().catch(e => {
			console.log(e);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar contraseña de un solo uso. Favor de intentar más tarde'
			});
		});
		await mail.sendMail(
			user.person.email,
			user.person.name,
			user._id,
			'Ingresa al sistema',
			`<p>Has solicitado una contraseña de un sólo uso.</p> <p>Esta contraseña tiene una vigencia de <span style="color:red">60 minutos</span>. Por favor ingresa al kiosco con la siguiente contraseña:</p> <h1 style="text-align:center">${value}</h1>`
		);
		return res.status(StatusCodes.OK).json({
			message: 'Se ha enviado correo con password de un solo uso'
		});
	}, //generateOneTimePassword

	async generateApiKey(req,res) {
		const keyUser = res.locals.user;
		const {
			isAdmin,
			isTechAdmin
		} = keyUser.roles;
		if(!isAdmin && !isTechAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes permisos para generar apiKey'
			});
		}
		const user = await User.findById(keyUser._id).catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar el api key. Favor de intentar más tarde'
			});
		});
		if(!user) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Tu usuario no se encuentra en la base!!'
			});
		}
		if(user.apiKey) {
			return res.status(StatusCodes.OK).json({
				apiKey: user.apiKey
			});
		}
		const nanoid = require('nanoid');
		const generate = nanoid.customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 35);
		user.apiKey = generate();
		await user.save().catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar el api key. Favor de intentar más tarde'
			});
		});
		return res.status(StatusCodes.OK).json({
			apiKey: user.apiKey
		});
	}, //generateApiKey

	async renewApiKey(req,res) {
		const keyUser = res.locals.user;
		const {
			isAdmin,
			isTechAdmin
		} = keyUser.roles;
		if(!isAdmin && !isTechAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes permisos para generar apiKey'
			});
		}
		const user = await User.findById(keyUser._id).catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar el api key. Favor de intentar más tarde'
			});
		});
		if(!user) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Tu usuario no se encuentra en la base!!'
			});
		}
		const nanoid = require('nanoid');
		const generate = nanoid.customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 35);
		user.apiKey = generate();
		await user.save().catch(error => {
			console.log(error);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar el api key. Favor de intentar más tarde'
			});
		});
		return res.status(StatusCodes.OK).json({
			apiKey: user.apiKey
		});
	}, //generateApiKey

	async initiateCV(req, res) {
		if(!req.body.identifier) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: 'Se requiere RFC'
			});
		}
		const keyUser = res.locals.user;
		const roles = keyUser.roles;
		if(!roles.isOperator &&
			!roles.isAdmin &&
			!roles.isBillAdmin &&
			!roles.isTechAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No estás autorizado para crear hojas de vida'
			});
		}
		const server = (global.config && global.config.server) ? global.config.server : null;
		if(!server || (server && !server.portalUri)) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Error al generar la solicitud de recuperación de contraseña. Favor de intentar más tarde'
			});
		}
		const CV = require('../src/cv');
		var user = await User
			.findOne({identifier:req.body.identifier})
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al intentar localizar al usuario'
				});
			});
		var cv;
		// console.log(req.body);
		if(!user) {
			if(!req.body.name && !req.body.fatherName && !req.body.motherName && !req.body.email && !req.body.company) {
				return res.status(StatusCodes.BAD_REQUEST).json({
					'message': 'Se requieren los campos de Nombre, Apellidos y Correo ya que el identificador solicitado no existe y es necesario para la creación del usuario'
				});
			}
			user = new User({
				identifier: req.body.identifier,
				person: {
					name: req.body.name,
					fatherName: req.body.fatherName,
					motherName: req.body.motherName,
					email: req.body.email
				},
				isActive: true,
				isAccountable: false,
				isCandidate: true
			});
			if(req.body.companies) {
				user.companies = [...req.body.companies];
			}
			user.history.unshift({
				by: keyUser._id,
				what: 'Creación de usuario'
			});
			await user.save();
			cv = new CV({
				user:user._id,
				job: [{
					name: req.body.jobName,
					place: req.body.jobPlace
				}],
				request: req.body.request
			});
			cv.history.unshift({
				by: keyUser._id,
				what: 'Creación de hoja de vida'
			});
		} else {
			cv = await CV.findOne({user:user._id})
				.catch(e => {
					console.log(e);
					return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						'message': 'Error al intentar localizar al usuario'
					});
				});
			if(!cv) {
				cv = new CV({
					user:user._id,
					job: [{
						name: req.body.jobName,
						place: req.body.jobPlace
					}],
					request: req.body.request
				});
				cv.history.unshift({
					by: keyUser._id,
					what: 'Creación de hoja de vida'
				});
			} else {
				if(!cv.request) {
					cv.request = req.body.request;
				}
				if(cv.job) {
					let findJob = cv.job.find(job => job.name.toLowerCase() === req.body.jobName.toLowerCase() && job.place.toLowerCase() === req.body.jobPlace.toLowerCase());
					if(!findJob) {
						cv.job.push({
							name: req.body.jobName,
							place: req.body.jobPlace
						});
					}
				}
			}
		}
		const nanoid = require('nanoid');
		cv.cvToken = nanoid.customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 35)();
		cv.cvTokenDate = new Date();
		cv.history.unshift({
			by: keyUser._id,
			what: 'Creación de token'
		});
		await cv.save();
		const mail = require('../shared/mail');
		const link = `${server.portalUri}/#/landing/job/${cv.cvToken}`;
		await mail.sendMail(
			user.person.email,
			user.person.name,
			user._id,
			'Completa tu solicitud de empleo',
			`<p>Te han generado una liga para que puedas completar tu solicitud de empleo</p> <p>El formulario de solicitud tiene una vigencia de 14 días, por lo que te recomendamos llenarla cuanto antes.</p><p>Para acceder al formulario de la solicitud da clic en la siguiente liga:<p><a href="${link}"><h1>Da click aquí</h1></a><p>Si la liga anterior no funciona, copia y pega la siguiente liga en tu navegador:</p><p>${link}</p>`
		);
		res.status(StatusCodes.OK).json({
			message: `Se ha enviado correo a ${user.identifier} (${user.person.email})`
		});
	}, // initiateCV

	async listCVs(req,res) {
		const keyUser = res.locals.user;
		const {
			isAdmin,
			isOperator,
			isTechAdmin,
			isBillAdmin,
			isSupervisor,
			isRequester
		} = keyUser.roles;
		if(!isAdmin &&
			!isOperator &&
			!isTechAdmin &&
			!isBillAdmin &&
			!isSupervisor &&
			!isRequester
		) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No estás autorizado a realizar esta operación'
			});
		}
		var users, cvs;
		const CV = require('../src/cv');
		if(req.query.ticket) {
			cvs = await CV.find({
				request: +req.query.ticket
			})
				.select('-cvToken -cvTokenDate -__v')
				.lean()
				.catch(e => {
					console.log(e);
					return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						'message': 'Error al realizar la búsqueda de hojas de vida'
					});
				});
			if(cvs && cvs.length < 1) {
				// console.log('No cvs');
				return res.status(StatusCodes.OK).json([]);
			}
			// console.log('cvs');
			// console.log(cvs);
			const searchUsers = cvs.map(u => u.user);
			// console.log(searchUsers);
			query = {
				_id: {$in:searchUsers}
			};
			users = await User.find(query)
				.select('identifier isActive isCandidate companies person phone addresses created updated')
				.populate('companies.company', 'identifier name display')
				.populate('filledBy', 'person')
				.lean()
				.catch(e => {
					console.log(e);
					return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						'message': 'Error al realizar la búsqueda de usuarios'
					});
				});
			if(users && users.length < 1) {
				// console.log('No users');
				return res.status(StatusCodes.OK).json([]);
			}
			// console.log('users');
			// console.log(users);
		} else {
			var query = {isCandidate: true, isActive: true};
			if((isRequester || isSupervisor) && (!isAdmin && !isTechAdmin && !isOperator && !isBillAdmin)) {
				query['companies.company'] = {$in: keyUser.companies.map(comp => comp.company._id)};
			}
			// console.log(query);
			users = await User.find(query)
				.select('identifier isActive isCandidate companies person phone addresses created updated')
				.populate('companies.company', 'identifier name display')
				.populate('filledBy', 'person')
				.lean()
				.catch(e => {
					console.log(e);
					return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						'message': 'Error al realizar la búsqueda de usuarios'
					});
				});
			if(users && users.length < 1) {
				// console.log('No users');
				return res.status(StatusCodes.OK).json([]);
			}
			// console.log('users');
			// console.log(users);
			const searchUsers = users.map(u => u._id);
			// console.log(searchUsers);
			query = {
				user: {$in:searchUsers}
			};
			cvs = await CV.find(query)
				.select('-cvToken -cvTokenDate -__v')
				.lean()
				.catch(e => {
					console.log(e);
					return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						'message': 'Error al realizar la búsqueda de hojas de vida'
					});
				});
			if(cvs && cvs.length < 1) {
				// console.log('No cvs');
				return res.status(StatusCodes.OK).json([]);
			}
			// console.log('cvs');
			// console.log(cvs);
		}
		const results = mergeArrays(users,cvs);
		return res.status(StatusCodes.OK).json(results);
	}, // listCVs

	async getCVbyToken(req,res) {
		const CV = require('../src/cv');
		const cv = await CV.findOne({cvToken: req.query.token})
			.select('-cvToken -cvTokenDate -__v -history')
			.lean()
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al realizar la búsqueda de hoja de vida'
				});
			});
		if(!cv) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message:'Hoja de vida no localizada'
			});
		}
		const user = await User.findById(cv.user)
			.select('identifier person')
			.lean()
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al realizar la búsqueda de hoja de vida'
				});
			});
		if(!user) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message:'Hoja de vida no localizada'
			});
		}
		res.status(StatusCodes.OK).json(Object.assign({},user,cv));
	}, //getCVbyToken

	async updateCV(req,res) {
		const CV = require('../src/cv');
		var cv = await CV.findOne({cvToken: req.body.token})
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al realizar la búsqueda de hoja de vida'
				});
			});
		if(!cv) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message:'Hoja de vida no localizada'
			});
		}
		cv = Object.assign(cv,req.body);
		if(!cv.filledWhen) {
			cv.filledWhen = new Date();
		}
		cv.modified = new Date();
		await cv.save()
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al guardar la hoja de vida'
				});
			});
		res.status(StatusCodes.OK).json({
			message: 'Hoja de vida actualizada'
		});
	}
};

function checkCompanies(A,B) {
	if(!Array.isArray(A)) {
		return false;
	}
	if(!Array.isArray(B)) {
		return false;
	}
	return A.some(itemA => {
		if(!itemA.isActive) {
			return false;
		}
		if(itemA.company && itemA.company._id){
			const find = B.find(itemB => itemB.company._id + '' === itemA.company._id + '' && itemB.isActive);
			if(find) {
				return true;
			}
			return false;
		}
		return false;
	});
}

function mergeArrays(A,B) {
	if(!Array.isArray(A) || !Array.isArray(B)) {
		return null;
	}
	return A.map((item,i) => {
		if(item._id + '' === B[i].user + '') {
			return Object.assign({},item, B[i]);
		}
	});

}
