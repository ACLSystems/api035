const mongoose			= require('mongoose');
const bcrypt 				= require('bcryptjs');
const HistorySchema = require('./history');
const AddressSchema = require('./address');
const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const PersonSchema = new Schema({
	name: String,
	fatherName: String,
	motherName: String,
	email: {
		type: String,
		match: /\S+@\S+\.\S+/
	},
	birthDate: Date,
	phone: String,
	cellPhone: String,
	genre: {
		type: String,
		enum: ['Hombre', 'Mujer']
	},
	imss: {
		type: Number
	},
	curp: {
		type: String
	}
},{_id: false});

const RolesSchema = new Schema({
	isAdmin: {
		type: Boolean,
		required: true,
		default: false
	},
	isSupervisor: {
		type: Boolean,
		required: true,
		default: false
	},
	isOperator: {
		type: Boolean,
		required: true,
		default: false
	},
	isTechAdmin: {
		type: Boolean,
		required: true,
		default: false
	},
	isBillAdmin: {
		type: Boolean,
		required: true,
		default: false
	}
},{_id: false});

const AdminSchema = new Schema({
	isEmailValidated: {
		type: Boolean,
		default: false
	},
	initialPassword: {
		type: String,
	},
	tokens: [String]
},{_id: false});

const OperatorSchema = new Schema({
	isActive: {
		type: Boolean,
		default: true
	},
	company: {
		type: ObjectId,
		ref: 'companies'
	}
});

const CompaniesSchema = new Schema({
	isActive: {
		type: Boolean,
		default: true
	},
	company: {
		type: ObjectId,
		ref: 'companies'
	},
	employeeId: {
		type: String
	},
	jobTitle: {
		type: String
	},
	jobRisk: {
		type: String
	},
	department: {
		type: String
	},
	beginDate: {
		type: Date
	},
	dailySalary: {
		type: Number
	}
},{_id: false});

const UserSchema = new Schema({
	identifier: {
		type: String,
		required: [true, 'Se requiere el identificador del usuario'],
		unique: [true, 'Identificador de usuario ya existe'],
		uppercase: true,
		match: /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/ //CALA72100734A
	},
	password: String,
	freshid: String,
	isActive: {
		type: Boolean,
		default: true
	},
	isAccountable:{
		type: Boolean,
		default: true
	},
	assignedCompanies: [OperatorSchema],
	companies: [CompaniesSchema],
	char1: String,
	char2: String,
	flag1: Boolean,
	flag2: Boolean,
	roles: RolesSchema,
	person: PersonSchema,
	admin: AdminSchema,
	phone: [String],
	addresses: [AddressSchema],
	history: [HistorySchema],
	created: {
		type: Date,
		default: new Date()
	},
	updated: {
		type: Date,
		default: new Date()
	},
	lastLogin: {
		type: Date
	},
	lastAccess: {
		type: Date
	}
});

UserSchema.pre('save', function(next){
	if(this.companies && Array.isArray(this.companies) && this.companies.length > 0) {
		var trueValue = this.companies.find(dep => dep.isActive === true);
		if(trueValue) {
			this.isAccountable = true;
		} else {
			this.isAccountable = false;
		}
	}
	next();
});

UserSchema.pre('save', function(next) {
	if(!this.roles) {
		this.roles = {
			isAdmin: false,
			isOperator: false,
			isSupervisor: false,
			isTechAdmin: false,
			isBillAdmin: false,
		};
	}
	next();
});

UserSchema.pre('save', function(next) {
	if(!this.admin) {
		this.admin = { isEmailValidated: false };
	}
	next();
});

UserSchema.pre('save', function(next) {
	var re = /^\$2a\$10\$.*/;
	var found = re.test(this.password);
	if(!found) {
		var salt = bcrypt.genSaltSync(10);
		if(!this.admin) {
			this.admin = {
				initialPassword : this.password
			};
		} else {
			if(!this.admin.initialPassword) {
				this.admin.initialPassword = this.password;
			}
		}
		if(this.password) {
			this.password = bcrypt.hashSync(this.password, salt);
		}
	}
	next();
});

UserSchema.methods.validatePassword = function(password, cb) {
	bcrypt.compare(password, this.password, function(err, isOk) {
		if(err) return cb(err);
		cb(null, isOk);
	});
};

UserSchema.index( { 'companies.company'			: 1} );
UserSchema.index( { 'companies.isActive'		: 1} );
UserSchema.index( { 'person.name'						: 1} );
UserSchema.index( { 'person.fatherName'			: 1} );
UserSchema.index( { 'person.motherName'			: 1} );
UserSchema.index( { 'person.email'					: 1}, {sparse: true} );
UserSchema.index( { isActive								: 1} );
UserSchema.index( { isAccountable						: 1} );
UserSchema.index( { identifier							: 1} );
UserSchema.index( { freshid									: 1} );
UserSchema.index( { char1										: 1}, {sparse: true} );
UserSchema.index( { char2										: 1}, {sparse: true} );
UserSchema.index( { flag1										: 1}, {sparse: true} );
UserSchema.index( { flag2										: 1}, {sparse: true} );


const User = mongoose.model('users', UserSchema);
module.exports = User;
