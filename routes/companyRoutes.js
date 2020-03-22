const CompanyController 	= require('../controllers/companies_controllers'	);
const Validate 				= require('../middleware/validateCompany'			);


module.exports = (app) => {

	app.post('/api/v1/operator/company',
		Validate.create,
		Validate.results,
		CompanyController.create
	);
	app.get('/api/v1/operator/company/:companyid',
		CompanyController.read
	);
	app.get('/api/v1/supervisor/company/:companyid',
		Validate.read,
		Validate.results,
		CompanyController.read
	);
	app.get('/api/v1/operator/company',
		CompanyController.search
	);
	app.patch('/api/v1/operator/company/:companyid',
		Validate.update,
		Validate.results,
		CompanyController.update
	);
};
