const {
	body,
	header,
	param,
	// query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');
// const Tools = require('../shared/toolsValidate');

module.exports = {
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('name')
			.exists()
			.withMessage('Puesto es requerido'),
		body('area')
			.exists()
			.withMessage('Area/Departamento es requerido'),
		body('place')
			.exists()
			.withMessage('Lugar de trabajo es requerido')
	],
	update: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		param('jobid')
			.exists('jobid es requerido')
	],
	results(req,res,next) {
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
