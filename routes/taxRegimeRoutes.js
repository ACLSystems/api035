const TaxRegimeController = require('../controllers/taxregime_controllers');
const Validate = require('../middleware/validateTaxRegime');

module.exports = (app) => {

	app.post('/api/v1/regime',
		Validate.create,
		Validate.results,
		TaxRegimeController.create
	);
	app.get('/api/v1/regimes',
		TaxRegimeController.list
	);
	app.get('/api/v1/regime',
		Validate.get,
		Validate.results,
		TaxRegimeController.get
	);
	app.patch('/api/v1/regime',
		Validate.update,
		Validate.results,
		TaxRegimeController.update
	);
};
