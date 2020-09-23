const mongoose = require('mongoose');
const HistorySchema = require('./history');
const AddressSchema = require('./address');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const CompanySchema = new Schema ({
	name: {
		type: String,
		required: [true, '"name" es requerido'],
		unique: true
	},
	identifier: {
		type: String,
		required: [true, '"identifier" es requerido'],
		uppercase: true,
		unique: true
	},
	freshid: String,
	type: {
		type: String,
		enum: ['interna', 'pagadora', 'cliente'],
		default: 'cliente'
	},
	headUser: {
		type: ObjectId,
		ref: 'users'
	},
	primeUser: {
		type: ObjectId,
		ref: 'users'
	},
	taxRegime: {
		type: ObjectId,
		ref: 'taxregimes'
	},
	employerRegistration: [{
		type: String
	}],
	customersRelated: [{
		type: ObjectId,
		ref: 'companies'
	}],
	payersRelated: [{
		type: ObjectId,
		ref: 'companies'
	}],
	display: String,
	alias: [String],
	phone: [String],
	addresses: [AddressSchema],
	isActive: {
		type: Boolean,
		default: true
	},
	history: [HistorySchema],
	created: {
		type: Date,
		default: new Date()
	},
	updated: {
		type: Date,
		default: new Date()
	},
	middleware: {
		type: Boolean,
		default: false
	}
});

CompanySchema.pre('save', function(next) {
	this.updated = new Date();
	next();
});

CompanySchema.pre('save', async function(next) {
	const dmp = this.directModifiedPaths();
	console.log(dmp);
	if(dmp.includes('employerRegistration') && this.type === 'cliente' && !this.middleware) {
		var payers = await Company.find({type: 'pagadora',employerRegistration: {$in:this.employerRegistration}});
		if(payers.length === 0) {
			throw new Error('No existe pagadora con los registros patronales de esta compañía');
		}
		for(let i=0;i<payers.length;i++) {
			if(!payers[i].customersRelated.find(payer => payer + ''=== this._id)){
				payers[i].customersRelated.push(this._id);
				payers[i].middleware = true;
				await payers[i].save();
				payers[i].middleware = false;
				await payers[i].save();
			}
			if(!this.payersRelated.find(payer => payer + '' === payers[i]._id)) {
				this.payersRelated.push(payers[i]._id);
			}
		}
	}
	next();
});

CompanySchema.pre('save', async function(next) {
	const dmp = this.directModifiedPaths();
	console.log(dmp);
	if(dmp.includes('customersRelated') && this.type === 'pagadora' && !this.middleware) {
		var customers = await Company.find({type: {$not: /pagadora/}, _id: {$in: this.customersRelated}});
		if(customers.length === 0) {
			throw new Error('No existen clientes con el id definido en customersRelated');
		}
		for(let i=0;i<customers.length;i++) {
			if(!customers[i].payersRelated.find(payer => payer + '' === this.id)) {
				customers[i].payersRelated.push(this._id);
				customers[i].middleware = true;
				await customers[i].save();
				customers[i].middleware = false;
				await customers[i].save();
			}
		}
	}
	next();
});

CompanySchema.pre('save', async function(next) {
	const dmp = this.directModifiedPaths();
	console.log(dmp);
	if(dmp.includes('payersRelated') && this.type !== 'pagadora' && !this.middleware) {
		var payers = await Company.find({type:'pagadora', _id: {$in: this.payersRelated}});
		if(payers.length === 0) {
			throw new Error('No existen pagadoras con el id definido en payersRelated');
		}
		for(let i=0;i<payers.length;i++) {
			if(!payers[i].customersRelated.find(payer => payer + '' === this.id)) {
				payers[i].customersRelated.push(this._id);
				payers[i].middleware = true;
				await payers[i].save();
				payers[i].middleware = false;
				await payers[i].save();
			}
		}
	}
	next();
});

CompanySchema.pre('save', async function(next) {
	if(!this.freshid) {
		const findCompanyAPI = '/api/v2/departments';
		const fresh = (global && global.config && global.config.fresh ) ? global.config.fresh: null;
		if(!fresh) {
			console.log('No... no hay configuración de fresh');
			return next();
		}
		const axios = require('axios');
		const auth = new Buffer.from(fresh.apiKey + ':X');
		var options = {
			method: 'get',
			url: `${fresh.serverUrl}${findCompanyAPI}`,
			headers: {
				'Authorization': 'Basic ' + auth.toString('base64')
			}
		};
		var response = await axios(options).catch(error => {
			console.log('Error: '+error.response.status);
			console.log(error.response.data);
		});
		if(response && response.data) {
			const companies = (response.data.departments) ? response.data.departments: [];
			if(companies > 0) {
				const freshCompany = companies.find(comp => comp.custom_fields.rfc === this.identifier);
				if(freshCompany) {
					this.freshid = freshCompany.id;
					return next();
				} else {
					console.log(`Buscamos, pero no hay empresas para ${this.identifier}`);
				}
			} else {
				console.log(`No hay empresas para ${this.identifier}`);
			}
			options.method = 'post';
			options.data = {
				name: this.name,
				custom_fields: {
					rfc: this.identifier,
					razon_social: this.name
				}
			};
			// console.log(options);
			response = await axios(options).catch(error => {
				console.log('Error: '+error.response.status);
				console.log(error.response.data);
			});
			if(response && response.data) {
				console.log(`Creación de ${this.identifier} creado en fresh`);
				if(response.data.department && response.data.department.id) {
					this.freshid = response.data.department.id;
				}
			}
		}
	}
	next();
});

CompanySchema.index({name									: 1});
CompanySchema.index({type 								: 1});
CompanySchema.index({employerRegistration	: 1});
CompanySchema.index({customersRelated 		: 1});
CompanySchema.index({payersRelated				: 1});
CompanySchema.index({identifier						: 1});
CompanySchema.index({isActive							: 1});
CompanySchema.index({freshid							: 1});

const Company = mongoose.model('companies', CompanySchema);
module.exports = Company;
