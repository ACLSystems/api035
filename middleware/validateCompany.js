const {
	body,
	header,
	param,
	// query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');
const Tools = require('../shared/toolsValidate');

module.exports = {
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('identifier')
			.exists()
			.withMessage('Identificador es obligatorio')
			.custom(value => {
				return value.match(/^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/);
			})
			.withMessage('Identificador debe ser un RFC válido')
			.custom(async function(value) {
				return await Tools.checkCompanyExistence('identifier',value,'Identificador de compañía ya este. Favor de validar');
			}),
		body('name')
			.exists()
			.withMessage('Nombre "name" de la empresa es requerido')
			.custom(async function(value) {
				return await Tools.checkCompany('name',value,'Nombre de empresa ya este. Favor de validar');
			})
	],
	read: [
		param('companyid')
			.exists()
			.withMessage('Hace falta el id de la empresa')
			.isMongoId()
			.withMessage('El ID de la empresa debe ser un identificador válido')
	],
	update: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		param('companyid')
			.exists('companyid es requerido'),
		body('headUser')
			.optional()
			.isMongoId()
			.withMessage('headUser debe ser un id válido')
			.custom(async (value) => {
				return await Tools.checkUser(value,'headUser id no corresponde a un usuario existente');
			}),
		body('primeUser')
			.optional()
			.isMongoId()
			.withMessage('primeUser debe ser un id válido')
			.custom(async (value) => {
				return await Tools.checkUser(value,'primeUser id no corresponde a un usuario existente');
			})
	],
	results(req,res,next){
		const errors = validationResult(req);
		if(!errors.isEmpty()) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: 'Error: Favor de revisar los errores siguientes',
				errors: errors.array()
			});
		} else {
			next();
		}
	}
};

// async function checkCompany(key,value,message) {
// 	const Company = require('../src/companies');
// 	const company = await Company.findOne({key: value})
// 		.select('_id')
// 		.lean();
// 	if(company) {
// 		throw new Error(message);
// 	} else {
// 		return true;
// 	}
// }

// async function checkUser(user, message) {
// 	const User = require('../src/users');
// 	var userFound = await User.findById(user)
// 		.select('id')
// 		.lean();
// 	if(!userFound) {
// 		throw new Error(message);
// 	} else {
// 		return true;
// 	}
// }
