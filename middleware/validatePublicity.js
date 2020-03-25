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
		body('text').exists().withMessage('Campo texto es requerido'),
		body('beginDate')
			.optional()
			.custom(value => {
				if(!validDate(value)) {
					throw new Error();
				}
				return true;
			})
			.withMessage('Fecha no reconocible'),
		body('endDate')
			.optional()
			.custom(value => {
				// console.log('validDate: ',validDate(value));
				if(!validDate(value)) {
					throw new Error();
				}
				return true;
			})
			.withMessage('Fecha no reconocible'),
		body('companies')
			.optional()
			.custom(async function(value){
				return await Tools.checkCompany(value);
			})
	],
	read: [
		param('publicityid')
			.exists()
			.withMessage('Id de la publicidad es requerido')
	],
	update: [
		param('publicityid')
			.exists()
			.withMessage('Id de la publicidad es requerido'),
		body('beginDate')
			.optional()
			.custom(value => {
				if(!validDate(value)) {
					throw new Error();
				}
				return true;
			})
			.withMessage('Fecha no reconocible'),
		body('endDate')
			.optional()
			.custom(value => {
				if(!validDate(value)) {
					throw new Error();
				}
				return true;
			})
			.withMessage('Fecha no reconocible')
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

function validDate(dateString) {
	if(typeof (Date.parse(dateString)) !== 'number') {
		return false;
	}
	return true;
}
