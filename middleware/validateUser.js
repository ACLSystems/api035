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
			.withMessage('Identificador debe ser un RFC válido')
			.custom(async function(value) {
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
	addEmail: [
		body('email')
			.exists()
			.withMessage('Email es requerido')
			.custom(value => {
				return value.match(/\S+@\S+\.\S+/);
			})
			.withMessage('Email debe ser una cuenta de correo válida')
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
	oneTimePassword: [
		param('identifier')
			.exists()
			.withMessage('Se requiere RFC')
	],
	reqPassRecovery : [
		param('identifier')
			.exists()
			.withMessage('Se requiere RFC')
	],
	validatePassRecovery : [
		body('identifier')
			.exists()
			.withMessage('Se requiere RFC'),
		body('validationString')
			.exists()
			.withMessage('Se requiere token de validación'),
		body('password')
			.exists()
			.withMessage('Se requiere password')
	],
	newPass : [
		body('password')
			.exists()
			.withMessage('Se requiere password')
	],
	initiateCV: [
		body('identifier')
			.exists()
			.withMessage('Se requiere RFC')
			.custom(value => {
				return value.match(/^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/);
			})
			.withMessage('RFC debe ser válido'),
		body('jobName')
			.exists()
			.withMessage('Se requiere nombre de la vacante'),
		body('jobPlace')
			.exists()
			.withMessage('Se requiere lugar de trabajo'),
		body('request')
			.exists()
			.withMessage('Se requiere el número de ticket'),
		body('companies')
			.exists()
			.withMessage('Se requiere empresa')
			.isArray({
				min: 1
			})
			.withMessage('"companies" debe tener al menos un elemento')
			.custom(async function(value){
				return await Tools.checkCompany(value);
			})

	],
	getCVbyToken: [
		param('cvToken')
			.exists()
			.withMessage('Se requiere token')
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
