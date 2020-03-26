const {
	body,
	header,
	param,
	// query,
	validationResult
} 	= require('express-validator');
const StatusCodes = require('http-status-codes');


module.exports = {
	create: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		body('taxRegime')
			.exists()
			.withMessage('El identificador del régimen fiscal es requerido "taxRegime"')
			.isInt()
			.withMessage('El identificador del régimen fiscal debe ser un número entero "taxRegime"'),
		body('description')
			.exists()
			.withMessage('La descripción del Régimen fiscal es requerida'),
		body('applyToCompanies')
			.optional()
			.isBoolean()
			.withMessage('"applyToCompanies" debe ser true o false'),
		body('applyToUsers')
			.optional()
			.isBoolean()
			.withMessage('"applyToUsers" debe ser true o false'),
	],
	get: [
		param('regimeid')
			.exists()
			.withMessage('Se requiere el id del régimen')
			.isMongoId()
			.withMessage('Id de régimen no es correcto')
	],
	update: [
		header('content-type','Encabezado incorrecto - solo application/json')
			.equals('application/json'),
		param('regimeid')
			.exists()
			.withMessage('Se requiere el id del régimen')
			.isMongoId()
			.withMessage('Id de régimen no es correcto'),
		body('applyToCompanies')
			.optional()
			.isBoolean()
			.withMessage('"applyToCompanies" debe ser true o false'),
		body('applyToUsers')
			.optional()
			.isBoolean()
			.withMessage('"applyToUsers" debe ser true o false')
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
