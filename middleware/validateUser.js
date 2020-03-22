const {
	body,
	header,
	param,
	query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');

module.exports = {
	logout: [
		header('authorization','Debe contener encabezado de authorización').exists()
	],
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('identifier').exists().withMessage('Identificador es obligatorio').custom(value => {
			return value.match(/^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/);
		}).withMessage('Identificador debe ser un RFC válido').custom(async function(value) {
			return checkIdentifier(value);
		}),
		body('person.email')
			.optional()
			.custom(async function(value){
				return checkEmail(value);
			}),
		body('companies')
			.optional()
			.custom(async function(value){
				return checkCompany(value);
			})
	],
	read:[
		param('userid').exists().withMessage('Se requiere el id del usuario').isMongoId().withMessage('Id de usuario no es correcto')
	],
	search: [
		query('companies.company').optional().isMongoId().withMessage('El id de la compañía no es válido')
	],
	update: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		param('userid').exists('Userid es requerido'),
		body('identifier').optional().custom(value => {
			return value.match(/^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/);
		}).withMessage('Identificador debe ser un RFC válido').custom(async function(value) {
			return checkIdentifier(value);
		}),
		body('person.email').optional().custom(async function(value){
			return checkEmail(value);
		}),
		body('companies').optional().isMongoId('ID de compañía no es un id válido').custom(async function(value){
			return checkCompany(value);
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


async function checkIdentifier(value) {
	const User = require('../src/users');
	const user = await User.findOne({identifier: value})
		.select('_id')
		.lean();
	if(user) {
		throw new Error('Identificador ya existe. Favor de validar');
	} else {
		return true;
	}
}

async function checkEmail(value) {
	const User = require('../src/users');
	const user = await User.findOne({'person.email': value})
		.select('_id')
		.lean();
	if(user) {
		throw new Error('Otro usuario ya utiliza el correo definido. Favor de revisar');
	} else {
		return true;
	}
}

async function checkCompany(value) {
	if(Array.isArray(value) && value.length > 0) {
		const Company = require('../src/companies');
		const mongoose = require('mongoose');
		for(var i=0; i < value.length; i++) {
			if(value[i] && value[i].company) {
				if(!mongoose.Types.ObjectId.isValid(value[i].company)) {
					throw new Error('ID de compañía no es un id válido');
				}
				var company = await Company.findById(value[i].company)
					.select('id')
					.lean();
				if(!company) {
					throw new Error('ID de compañía no existe');
				} else {
					return true;
				}
			} else {
				throw new Error('No se indicó ID de compañía');
			}
		}
	} else {
		return true;
	}
}
