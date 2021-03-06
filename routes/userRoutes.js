const UserController 	= require('../controllers/users_controller'	);
const Auth = require('../middleware/auth');
const PublicityController = require('../controllers/publicity_controller');
const KBController = require('../controllers/kb_controller');
const Validate 				= require('../middleware/validateUser'			);


module.exports = (app) => {

	app.get('/api/test',
		UserController.test
	);
	app.get('/api/v1/userhelp',
		KBController.listUsers
	);
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
	app.patch('/api/v1/resetPass',
		Validate.resetPass,
		UserController.resetPass
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
	app.get('/api/v1/requester/cvs',
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
	app.get('/api/v1/apikey',
		UserController.generateApiKey
	);
	app.delete('/api/v1/apikey',
		UserController.generateApiKey
	);
	app.patch('/api/v1/user/addemail',
		Validate.addEmail,
		Validate.results,
		UserController.addEmail
	);
	app.patch('/api/v1/adduseremail',
		Validate.addUserEmail,
		Validate.results,
		UserController.addUserEmail
	);
	app.patch('/api/user/confirmemail',
		Validate.confirmEmail,
		Validate.results,
		UserController.confirmEmail
	);
	app.get('/api/getcvbytoken',
		Auth.loginByCVToken,
		UserController.getCVbyToken
	);
	app.patch('/api/updatecv',
		UserController.updateCV
	);
	app.patch('/api/v1/modifycv/:cvid',
		UserController.modifyCV
	);
};
