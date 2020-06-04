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
		body('method').exists().custom(value => {
			if(value !== 'get' && value !== 'post' && value !== 'patch') {
				throw new Error('Methods debe ser un valor de los siguientes: get, post, patch');
			} else {
				return true;
			}
		}),
		body('data').exists().withMessage('Debe existir el objeto de datos'),
		body('api').exists().withMessage('Debe existir el api a consumir')
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
