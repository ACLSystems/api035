const ConfigController = require('../controllers/config_controllers');
const Validate = require('../middleware/validateConfig');

module.exports = (app) => {
	app.get('/api/v1/admin/config',
		ConfigController.get
	);
	app.patch('/api/v1/admin/config',
		Validate.setConfig,
		Validate.results,
		ConfigController.setConfig
	);
};
