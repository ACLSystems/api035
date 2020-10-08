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
	createRule: [
		header('authorization','Debe contener encabezado de authorización')
			.exists(),
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('year')
			.exists()
			.withMessage('"year" es requerido')
			.isNumeric()
			.withMessage('"year" debe ser númerico'),
		body('days')
			.exists()
			.withMessage('"days" es requerido')
			.isNumeric()
			.withMessage('"days" debe ser númerico'),
		body('company')
			.optional()
			.isMongoId()
			.withMessage('"company" debe ser un id válido')
			.custom(async function(value) {
				return Tools.checkCompanyExistence('_id',value,'La empresa indicada no existe');
			}),
		body('label')
			.optional(),
		body('description')
			.optional()
	],
	deleteRule: [
		header('authorization','Debe contener encabezado de authorización')
			.exists(),
		param('ruleid')
			.exists()
			.withMessage('ruleid es requerido')
			.isMongoId()
			.withMessage('ruleid debe ser una cadena ObjectId válida')
	],
	createVacation: [
		header('authorization','Debe contener encabezado de authorización')
			.exists(),
		body('company')
			.exists()
			.withMessage('"company" es requerido')
			.isMongoId()
			.withMessage('"company" debe ser un id válido')
			.custom(async function(value) {
				return Tools.checkCompanyExistence('_id',value,'La empresa indicada no existe');
			}),
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
