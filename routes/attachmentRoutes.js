const AttachController = require('../controllers/attach_controllers');
const Validate = require('../middleware/validateAttachments');

module.exports = (app) => {

	app.post('/api/v1/cfdi',
		Validate.create,
		Validate.results,
		AttachController.loadCFDI
	);
	// app.post('/api/v1/attachment',
	// 	Validate.create,
	// 	Validate.results,
	// 	AttachController.create
	// );
	app.get('/api/v1/attachment',
		Validate.search,
		Validate.results,
		AttachController.search
	);
	app.get('/api/v1/myattachments',
		Validate.search,
		AttachController.searchMine
	);
	app.get('/api/v1/attachment/:attachid',
		Validate.get,
		Validate.results,
		AttachController.get
	);
};
