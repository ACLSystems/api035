const {
	body,
	header,
	// param,
	// query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');


module.exports = {
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('type')
			.exists()
			.withMessage('El campo "type" es requerido. Los valores son "attachment" para archivos de cualquier tipo y "data" para almacenar datos tipo JSON'),
		body('item')
			.optional()
			.isMongoId()
			.withMessage('"item" debe ser un id válido')
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
