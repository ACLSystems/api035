const ServiceController = require('../controllers/services_controller');
const Validate = require('../middleware/validateService');

module.exports = (app) => {
	app.post('/api/v1/service',
		Validate.create,
		Validate.results,
		ServiceController.create
	);
	app.get('/api/v1/service/:serviceid',
		Validate.get,
		Validate.results,
		ServiceController.get
	);
	app.get('/api/v1/services',
		ServiceController.list
	);
	app.get('/api/v1/myservices',
		ServiceController.myServices
	);
	app.patch('/api/v1/service/:serviceid',
		Validate.update,
		Validate.results,
		ServiceController.update
	);
};
