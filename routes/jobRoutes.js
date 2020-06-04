const JobController = require('../controllers/job_controller');
const Validate = require('../middleware/validateJob');

module.exports = (app) => {
	app.post('/api/v1/operator/job',
		Validate.create,
		JobController.create
	);
	app.get('/api/v1/operator/jobs',
		JobController.list
	);
};
