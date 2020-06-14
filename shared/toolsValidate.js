module.exports = {

	async checkIdentifier(value) {
		const User = require('../src/users');
		const user = await User.findOne({identifier: value})
			.select('_id')
			.lean();
		if(user) {
			throw new Error('Identificador ya existe. Favor de validar');
		} else {
			return true;
		}
	},

	async checkEmail(value) {
		const User = require('../src/users');
		const user = await User.findOne({'person.email': value})
			.select('_id')
			.lean();
		if(user) {
			throw new Error('La cuenta de correo ya está siendo utilizada. Favor de revisar');
		} else {
			return true;
		}
	},

	async checkCompany(value) {
		if(Array.isArray(value) && value.length > 0) {
			const Company = require('../src/companies');
			const mongoose = require('mongoose');
			for(var i=0; i < value.length; i++) {
				if(value[i] && value[i].company) {
					if(!mongoose.Types.ObjectId.isValid(value[i].company)) {
						throw new Error('ID de compañía no es un id válido');
					}
					var company = await Company.findById(value[i].company)
						.select('id')
						.lean();
					if(!company) {
						throw new Error('ID de compañía no existe');
					} else {
						return true;
					}
				} else {
					throw new Error('No se indicó ID de compañía');
				}
			}
		} else {
			return true;
		}
	},

	async checkCompanyExistence(key,value,message) {
		const Company = require('../src/companies');
		const company = await Company.findOne({key: value})
			.select('_id')
			.lean();
		if(company) {
			throw new Error(message);
		} else {
			return true;
		}
	},

	async checkUser(user, message) {
		const User = require('../src/users');
		var userFound = await User.findById(user)
			.select('id')
			.lean();
		if(!userFound) {
			throw new Error(message);
		} else {
			return true;
		}
	},

	transformDate(stringDate) {
		// console.log(typeof stringDate);
		let returnDate = null;
		if(stringDate.includes('-')) {
			let parts = stringDate.split('-');
			returnDate = new Date(parts[0], parts[1] - 1, parts[2]);
		} else if(stringDate.includes('/')) {
			let parts = stringDate.split('/');
			returnDate = new Date(parts[0], parts[1] - 1, parts[2]);
		} else {
			returnDate = new Date(stringDate);
		}
		return returnDate;
	}
};
