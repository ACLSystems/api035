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
	app.patch('/api/v1/request',
		RequestController.updateFresh
	);
	app.patch('/api/v1/approvevacations',
		RequestController.approveVacations
	);
	app.get('/api/v1/request/:ticketid/refresh',
		RequestController.refreshTicket
	);
	app.post('/api/v1/reply/:ticketid',
		RequestController.reply
	);
};
