const Validate	= require('../middleware/validatePublic');
const Auth 			= require('../middleware/auth');

module.exports = (app) => {
	app.post('/login',
		Validate.login,
		Validate.results,
		Auth.login
	);
};
