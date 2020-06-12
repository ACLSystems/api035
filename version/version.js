const version = '1.4.8';

const now = new Date();
module.exports = {
	app: 'api035',
	version: version,
	year: now.getFullYear(),
	time: now,
	vendor: 'ACL Systems SA de CV',
	numVersion: version.replace(/\./g, '')
	// se utiliza semver
};
