const mongoose	= require('mongoose');
const bcrypt 		= require('bcryptjs');
const keypair 	= require('keypair');
const version		= require('../version/version');
const logger		= require('../shared/winstonLogger');
const newpass 	= require('../config/init');
const Control 	= require('./control');
const Config		= require('./config');
const Company 	= require('./companies');
const User 			= require('./users');

module.exports = async () => {
	var message = 'Detectando base de datos no inicializada. Comenzando inicialización... Por favor espere';
	try {
		var control = await Control.findOne({});
		if(!control) {
			logger.info(message);
			console.log(message);
			const idUser = mongoose.Types.ObjectId();
			const idCompany = mongoose.Types.ObjectId();
			// poner aquí las organizaciones y los usuarios iniciales
			var ACLMainUser = new User({
				_id: idUser,
				identifier: 'XEXX010101000',
				password: encryptPass(newpass.admin()),
				isAccountable: false,
				roles: {
					isAdmin: true,
					isSupervisor: false,
					isOperator: true
				},
				companies: [{
					isActive: true,
					company: idCompany
				}],
				history: [{
					by: idUser,
					when: new Date(),
					what: 'Creación del usuario'
				}]
			});
			message = 'Generando usuario default';
			logger.info(message);
			console.log(message);
			await ACLMainUser.save();
			var ACLCompany = new Company({
				_id: idCompany,
				name: 'ACL Systems S.A. de C.V.',
				display: 'ACL Systems',
				identifier: 'ASY121219JA9',
				type: 'interna',
				history: [{
					by: idUser,
					when: new Date(),
					what: 'Creación de la compañía'
				}]
			});
			message = 'Generando compañía default';
			logger.info(message);
			console.log(message);
			await ACLCompany.save();
			message = 'Generando llaves y configuración default';
			logger.info(message);
			console.log(message);
			const pair = await keypair();
			var buff = Buffer.from(pair.private);
			const privateKey = buff.toString('base64');
			buff = Buffer.from(pair.public);
			const publicKey = buff.toString('base64');
			const config = new Config({
				server: {
					issuer: 'ACL Systems',
					expires: '1h',
					urlLogin: '/login',
					privateKey: privateKey,
					publicKey: publicKey,
					portalUri: 'http://localhost:4200'
				},
				routes: {
					jsonBodyLimit: '50mb'
				},
				history: [{
					by: idUser,
					when: new Date(),
					what: 'Creación de configuración por defecto'
				}]
			});
			await config.save();
			const control = new Control({
				version: version.version,
				name: version.app,
				schemas: mongoose.modelNames()
			});
			var mongooseAdmin = new mongoose.mongo.Admin(mongoose.connection.db);
			const mongooseInfo = await mongooseAdmin.buildInfo();
			if(mongooseInfo) {
				control.mongo = mongooseInfo.version;
				control.host = mongoose.connection.host;
				control.mongoose = mongoose.version;
				await control.save();
				message = 'Base de datos inicializada';
				logger.info(message);
				console.log(message);
			} else {
				message = 'No se encontró información de mongodb/mongoose';
				logger.info(message);
				console.log(message);
			}
			return;
		} else {
			control.version = version.version;
			control.name = version.app;
			control.schemas = mongoose.modelNames();
			var admin = new mongoose.mongo.Admin(mongoose.connection.db);
			var info = await admin.buildInfo();
			if(info) {
				control.mongo = info.version;
				control.host = mongoose.connection.host;
				control.mongoose = mongoose.version;
				await control.save();
				message = 'Registro de base actualizado. Base lista';
				logger.info(message);
				console.log(message);
			} else {
				message = 'No se encontró información de mongodb/mongoose';
				logger.error(message);
				console.log(message);
			}
			return;
		}
	} catch (e) {
		message = 'Error tratando de guardar configuración inicial';
		logger.error(message);
		console.log(message);
		logger.error(e);
		console.log(e);
	}
};

function encryptPass(obj) {
	var salt = bcrypt.genSaltSync(10);
	obj = bcrypt.hashSync(obj, salt);
	return obj;
}
