const Config = require('../src/config');
const logger = require('../shared/winstonLogger');
const version = require('../version/version');

module.exports = async function(app) {
	const config = await Config.findOne({})
		.populate({
			path: 'history.by',
			select: 'identifier'
		}).catch(e => {
			logger.error(e);
			console.log(e);
		});
	global.config = config.toObject();
	global.version = version;
	// console.log('Esta es la configuración por defecto... Se queda en memoria: ',global.config);
	app.emit('ready');
};
