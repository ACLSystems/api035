const logger = require('../shared/winstonLogger');

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
