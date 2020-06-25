const JobController = require('../controllers/job_controller');
const Validate = require('../middleware/validateJob');

module.exports = (app) => {
	app.post('/api/v1/operator/job',
		Validate.create,
		Validate.results,
		JobController.create
	);
	app.get('/api/v1/jobs',
		JobController.list
	);
	app.patch('/api/v1/job/:jobid',
		Validate.update,
		Validate.results,
		JobController.update
	);
};
