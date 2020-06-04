const RequestController = require('../controllers/request_controller');
const Validate = require('../middleware/validateFreshRequest');

module.exports = (app) => {
	app.post('/api/v1/request',
		Validate.create,
		Validate.results,
		RequestController.createServiceRequest
	);
	app.get('/api/v1/requests',
		RequestController.listMyRequests
	);
};
