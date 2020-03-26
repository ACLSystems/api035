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
		body('title').exists().withMessage('El título del servicio es requerido'),
		body('companies')
			.optional()
			.isArray({
				min: 1
			})
			.withMessage('"companies" debe tener al menos un elemento')
			.custom(async function(value){
				await Tools.checkCompany(value);
			})
	],
	get: [
		param('serviceid')
			.exists()
			.withMessage('Parámetro "serviceid" requerido')
	],
	update: [
		param('serviceid')
			.exists('Parámetro "serviceid" requerido'),
		body('companies')
			.optional()
			.isMongoId('ID de compañía no es un id válido')
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
