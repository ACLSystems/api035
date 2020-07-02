const Validate	= require('../middleware/validatePublic');
const Auth 			= require('../middleware/auth');
const KBController = require('../controllers/kb_controller');

module.exports = (app) => {
	app.post('/login',
		Validate.login,
		Validate.results,
		Auth.login
	);
	app.get('/',
		Auth.hello
	);
	app.get('/publichelp',
		KBController.listPublic
	);
};
