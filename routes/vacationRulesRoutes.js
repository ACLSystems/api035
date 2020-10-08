const VacationController = require('../controllers/vacation_controller');
const Validate = require('../middleware/validateVacations');

module.exports = (app) => {
	app.post('/api/v1/rule',
		Validate.createRule,
		Validate.results,
		VacationController.createRule
	);
	app.get('/api/v1/rules',
		VacationController.listRules
	);
	app.delete('/api/v1/rule/:ruleid',
		Validate.deleteRule,
		Validate.results,
		VacationController.removeRule
	);
	app.post('/api/v1/vacation',
		Validate.createVacation,
		Validate.results,
		VacationController.createVacation
	);
	app.post('/api/v1/workdays',
		VacationController.createWD
	);
};
