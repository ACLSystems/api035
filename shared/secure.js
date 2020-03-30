module.exports = {
	checkPrivileges(user,privs) {
		for(var i=0;i<privs.length; i++) {
			if(user.roles[privs[i]]) return true;
		}
		return false;
	},

	createSecurePass() {
		const securePass = require('secure-random-password');
		return securePass.randomPassword({
			length: 12,
			characters: [{
				characters: securePass.upper,
				exactly: 4
			},{
				characters: securePass.symbols,
				exactly: 2
			},{
				characters: securePass.digits,
				exactly: 2
			},
			securePass.lower
			]
		});
	}
};
