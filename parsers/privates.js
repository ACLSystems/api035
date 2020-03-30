module.exports = {
	removeUndefined(object) {
		const keys = Object.keys(object);
		keys.forEach(prop => {
			if(object[prop] === undefined) {
				// console.log(`Quitando ${prop}`);
				delete object[prop];
			}
		});
		return object;
	},

	validateRequired(object, required) {
		const keys = Object.keys(object);
		return required.every(e => keys.includes(e));
	},

	createNewDate(dateString) {
		let stringSplit = dateString.split('-');
		return new Date(stringSplit[0], stringSplit[1] - 1, stringSplit[2]);
	}
};
