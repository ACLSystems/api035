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
	employerRegistration: {
		type: String
	},
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
	}
});

CompanySchema.pre('save', function(next) {
	this.updated = new Date();
	next();
});

CompanySchema.index({name				: 1});
CompanySchema.index({identifier	: 1});
CompanySchema.index({isActive		: 1});
CompanySchema.index({freshid		: 1});

const Company = mongoose.model('companies', CompanySchema);
module.exports = Company;
