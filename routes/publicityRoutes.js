const PublicityController 	= require('../controllers/publicity_controller'	);
const Validate 				= require('../middleware/validatePublicity'			);

module.exports = (app) => {
	app.post('/api/v1/publicity',
		Validate.create,
		Validate.results,
		PublicityController.create
	);
	app.get('/api/v1/publicity',
		PublicityController.list
	);
	app.patch('/api/v1/publicity/:publicityid',
		Validate.read,
		Validate.results,
		PublicityController.update
	);
};
