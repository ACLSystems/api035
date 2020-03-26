const AttachController = require('../controllers/attach_controllers');
const Validate = require('../middleware/validateAttachments');

module.exports = (app) => {
	app.post('/api/v1/attachment',
		Validate.create,
		Validate.results,
		AttachController.create
	);
};
