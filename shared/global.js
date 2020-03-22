const Config = require('../src/config');
const logger = require('../shared/winstonLogger');
const version = require('../version/version');

module.exports = async function(app) {
	try {
		const config = await Config.findOne({});
		global.config = config.toObject();
		global.version = version;
		// console.log('Esta es la configuración por defecto... Se queda en memoria: ',global.config);
		app.emit('ready');
	} catch (e) {
		logger.error(e);
		console.log(e);
	}
};
