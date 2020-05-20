const StatusCodes = require('http-status-codes');
const User 				= require('../src/users');
const manageError = require('../shared/errorManagement').manageError;

module.exports = {

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
				if(!this.admin) {
					this.admin = {
						initialPassword: this.password
					};
				}
			}
			user.history = [{
				by: keyUser._id,
				what: 'Creación del usuario'
			}];
			await user.save();
			delete user.roles;
			delete user.admin;
			delete user.history;
			return res.status(StatusCodes.CREATED).json(user);
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
			console.log(query.companies);
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
			const user = User.findOne({
				'person.email':req.body.email,
				'admin.validationString':req.body.validationString
			});
			if(!user) {
				return res.status(StatusCodes.OK).json({
					'message': 'Usuario o respuesta no encontrados'
				});
			}
			user.admin.isEmailValidated = true;
			user.admin.validationString = '';
			user.admin.validationDate = null;
			return res.status(StatusCodes.OK).json({
				'message': 'Cuenta confirmada'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //confirmEmail

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
