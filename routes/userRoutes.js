const UserController 	= require('../controllers/users_controller'	);
const PublicityController = require('../controllers/publicity_controller');
const Validate 				= require('../middleware/validateUser'			);


module.exports = (app) => {

	app.post('/api/v1/logout',
		Validate.logout,
		Validate.results,
		UserController.logout
	);
	app.post('/api/v1/logoutallbutme',
		Validate.logout,
		Validate.results,
		UserController.logoutAllButMe
	);
	app.post('/api/v1/logoutall',
		Validate.logout,
		Validate.results,
		UserController.logoutAll
	);
	app.get('/api/v1/user',
		UserController.getMyDetails
	);
	app.get('/api/generateonetimepass/:identifier',
		Validate.oneTimePassword,
		UserController.generateOneTimePassword
	);
	app.get('/api/reqpassrecovery/:identifier',
		Validate.reqPassRecovery,
		UserController.reqPassRecovery
	);
	app.patch('/api/validatepassrecovery',
		Validate.validatePassRecovery,
		UserController.validatePassRecovery
	);
	app.patch('/api/v1/newpass',
		Validate.newPass,
		UserController.newPass
	);
	app.post('/api/v1/operator/initiatecv',
		Validate.initiateCV,
		UserController.initiateCV
	);
	app.post('/api/v1/refreshtoken',
		UserController.tokenRefresh
	);
	app.post('/api/v1/operator/user',
		Validate.create,
		Validate.results,
		UserController.create
	);
	app.get('/api/v1/operator/user/:userid',
		Validate.read,
		Validate.results,
		UserController.read
	);
	app.get('/api/v1/supervisor/user/:userid',
		Validate.read,
		Validate.results,
		UserController.read
	);
	app.get('/api/v1/operator/user',
		Validate.search,
		Validate.results,
		UserController.search
	);
	app.get('/api/v1/operator/cvs',
		UserController.listCVs
	);
	app.get('/api/v1/supervisor/user',
		Validate.search,
		Validate.results,
		UserController.search
	);
	app.patch('/api/v1/operator/user/:userid',
		Validate.update,
		Validate.results,
		UserController.update
	);
	app.get('/api/v1/mypublicity',
		PublicityController.myPublicity
	);
	app.patch('/api/v1/user/addemail',
		Validate.addEmail,
		Validate.results,
		UserController.addEmail
	);
	app.get('/api/getcvbytoken',
		UserController.getCVbyToken
	);
};
