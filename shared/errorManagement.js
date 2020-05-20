const logger = require('../shared/winstonLogger');
const StatusCodes = require('http-status-codes');

module.exports.handler = new errorHandler();

function errorHandler(){
	this.handleError = async (err) => {
		await logger.error(err);
		console.log(err);
		// await sendMailToAdminIfCritical;
		// await saveInOpsQueueIfCritical;
		// await determineIfOperationalError;
	};
}


module.exports.manageError = manageError;

function manageError(res,error,unit) {
	console.log(`Error en -${unit}-:`);
	console.log(error);
	res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		message: 'Error del servidor. Favor de comunicarse con la mesa de servicio',
		unit: unit,
		error: error.message
	});
}
