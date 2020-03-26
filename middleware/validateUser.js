const {
	body,
	header,
	param,
	query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');
const Tools = require('../shared/toolsValidate');

module.exports = {
	logout: [
		header('authorization','Debe contener encabezado de authorización')
			.exists()
	],
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('identifier')
			.exists()
			.withMessage('Identificador es obligatorio')
			.custom(value => {
				return value.match(/^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/);
			})
			.withMessage('Identificador debe ser un RFC válido').custom(async function(value) {
				return Tools.checkIdentifier(value);
			}),
		body('person.email')
			.optional()
			.custom(async function(value){
				return Tools.checkEmail(value);
			}),
		body('companies')
			.optional()
			.custom(async function(value){
				return Tools.checkCompany(value);
			})
	],
	read:[
		param('userid')
			.exists()
			.withMessage('Se requiere el id del usuario')
			.isMongoId()
			.withMessage('Id de usuario no es correcto')
	],
	search: [
		query('companies.company')
			.optional()
			.isMongoId()
			.withMessage('El id de la compañía no es válido')
	],
	update: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		param('userid')
			.exists('Userid es requerido'),
		body('identifier')
			.optional()
			.custom(value => {
				return value.match(/^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/);
			})
			.withMessage('Identificador debe ser un RFC válido').custom(async function(value) {
				return await Tools.checkIdentifier(value);
			}),
		body('person.email')
			.optional()
			.custom(async function(value){
				return await Tools.checkEmail(value);
			}),
		body('companies')
			.optional()
			.isArray({
				min: 1
			})
			.withMessage('"companies" debe tener al menos un elemento')
			.custom(async function(value){
				return await Tools.checkCompany(value);
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
