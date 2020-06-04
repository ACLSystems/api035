const {
	body,
	header,
	// param,
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
			.withMessage('Debe existir nombre del puesto'),
		body('category')
			.exists()
			.withMessage('Debe existir al menos una categoría')
			.custom((value) => {
				if(!Array.isArray(value)){
					throw new Error('La(s) categoría(s) deben venir en arreglo');
				}
			})
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
