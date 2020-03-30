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
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('type')
			.exists()
			.withMessage('El campo "type" es requerido. Los valores son "attachment" para archivos de cualquier tipo y "data" para almacenar datos tipo JSON'),
		body('company')
			.optional()
			.isMongoId()
			.withMessage('"company" debe ser un id válido')
			.custom(async function(value) {
				return Tools.checkCompanyExistence('_id',value,'La empresa indicada no existe');
			}),
		body('user')
			.optional()
			.isMongoId()
			.withMessage('"user" debe ser un id válido')
			.custom(async function(value){
				return Tools.checkUser(value,'Referencia del usuario inexistente');
			})
	],
	search: [
		query('company')
			.optional()
			.isMongoId()
			.withMessage('"company" debe ser un id válido')
			.custom(async function(value) {
				return Tools.checkCompanyExistence('_id',value,'La empresa indicada no existe');
			}),
		query('user')
			.optional()
			.isMongoId()
			.withMessage('"user" debe ser un id válido')
			.custom(async function(value){
				return Tools.checkUser(value,'Referencia del usuario inexistente');
			})
	],
	get: [
		param('attachid')
			.exists()
			.withMessage('"attachid" es requerido')
			.isMongoId()
			.withMessage('"attachid" debe ser un id válido')
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
