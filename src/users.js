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
		enum: [
			'Masculino',
			'Femenino'
		]
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
	isRequester: {
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
	tokens: [String],
	validationString: {
		type: String,
		default: ''
	},
	validationDate: {
		type: Date
	}
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
},{_id: false});

const VacationSchema = new Schema({
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	},
	submit: {
		type: Date
	},
	totalDays: {
		type: Number,
		default: 0
	},
	approved: {
		type: Boolean
	},
	approvedBy: {
		type: String
	},
	approvalComments: {
		type: String
	},
	justify: {
		type: String
	},
	freshid: {
		type: Number
	},
	processed: {
		type: Boolean
	}
},{_id: false});

VacationSchema.pre('save', async function(next) {
	// console.log('Validando vacaciones',this.ownerDocument().identifier);
	if(this.processed) {
		return next();
	}
	this.submit = new Date(),
	this.beginDate = new Date(
		this.beginDate.getFullYear(),
		this.beginDate.getMonth(),
		this.beginDate.getDate(),
		2,0,0
	);
	this.endDate = new Date(
		this.endDate.getFullYear(),
		this.endDate.getMonth(),
		this.endDate.getDate(),
		20,59,59
	);
	const calculateVacationDays = function(vacation, wday) {
		// console.log('Entramos en calculateVacationDays');
		const calculateWeekDays = function(date1,date2,wd) {
			// console.log('Entramos en calculateWeekDays');
			var currentDate = new Date(date1);
			var days = 0;
			const failsafe = 1000;
			var i = 0;
			while (currentDate < date2 && i < failsafe) {
				// console.log('===> ',currentDate);
				if(currentDate.getDay() === wd) days ++;
				currentDate.setDate(currentDate.getDate() + 1);
				i++;
			}
			return days;
		};
		const oneDay = 86400000; //24 * 60 * 60 * 1000 milisegundos
		var totalDays =  Math.ceil(Math.abs(vacation.beginDate - vacation.endDate) / oneDay);
		// console.log('TotalDays before procesing',totalDays);
		if(wday) {
			if(wday.daysByWeek) {
				const calcDays = Math.floor(totalDays / wday.daysByWeek);
				if(calcDays) {
					totalDays = totalDays - calcDays;
				}
			} else {
				if(wday.sunday) {
					totalDays = totalDays - calculateWeekDays(vacation.beginDate,vacation.endDate,0);
				}
				if(wday.monday) {
					totalDays = totalDays - calculateWeekDays(vacation.beginDate,vacation.endDate,1);
				}
				if(wday.tuesday) {
					totalDays = totalDays - calculateWeekDays(vacation.beginDate,vacation.endDate,2);
				}
				if(wday.wednesday) {
					totalDays = totalDays - calculateWeekDays(vacation.beginDate,vacation.endDate,3);
				}
				if(wday.thursday) {
					totalDays = totalDays - calculateWeekDays(vacation.beginDate,vacation.endDate,4);
				}
				if(wday.friday) {
					totalDays = totalDays - calculateWeekDays(vacation.beginDate,vacation.endDate,5);
				}
				if(wday.saturday) {
					totalDays = totalDays - calculateWeekDays(vacation.beginDate,vacation.endDate,6);
				}
			}
			if(wday.specialDates && wday.specialDates.length > 0) {
				wday.specialDates.forEach(sd => {
					if(sd >= vacation.beginDate && sd <= vacation.endDate) totalDays --;
				});
			}
		} else {
			console.log('No WeekDay object');
		}

		// console.log(totalDays);
		return totalDays;
	};

	var query = {};
	const vacationLabel = this.parent().vacationLabel;
	if(vacationLabel) {
		query.label = vacationLabel;
	} else {
		query.company = this.parent().company._id;
	}
	// console.log(query);
	const WeekDay = require('./workDays');
	var wday = await WeekDay.findOne(query);
	if(wday) {
		this.totalDays = calculateVacationDays(this,wday);
	} else {
		wday = await WeekDay.findOne({label:'default'});
		if(wday) {
			this.totalDays = calculateVacationDays(this,wday);
		} else {
			this.totalDays = calculateVacationDays(this);
		}
	}
	this.processed = true;
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
	},
	freshReportingManager: {
		type: Number
	},
	reportingManager: {
		type: ObjectId,
		ref: 'users'
	},
	vacationLabel: {
		type: String
	},
	vacationHistory: [VacationSchema],
	vacations: {}
},{
	_id: false,
	id: false,
	toJSON : {virtuals: true},
	toObject: {virtuals: true}
});

const UserSchema = new Schema({
	identifier: {
		type: String,
		required: [true, 'Se requiere el identificador del usuario'],
		unique: [true, 'Identificador de usuario ya existe'],
		uppercase: true,
		match: /^([A-ZÑ&]{3,4}) ?(?:- ?)?(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])) ?(?:- ?)?([A-Z\d]{2})([A\d])$/ //CALA72100734A
	},
	password: String,
	oneTimePassword: {
		type: String,
		default: ''
	},
	oneTimePasswordDate: {
		type: Date
	},
	apiKey: String,
	freshid: String,
	isActive: {
		type: Boolean,
		default: true
	},
	isAccountable:{
		type: Boolean,
		default: true
	},
	isCandidate: {
		type: Boolean,
		default: false
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
		if(this.isCandidate) {
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
			isRequester: false,
			isSupervisor: false,
			isTechAdmin: false,
			isBillAdmin: false,
		};
	}
	next();
});

UserSchema.pre('save', function(next) {
	if(!this.person || (this.person && !this.person.name)) {
		next();
	}
	var char = this.person.name.charAt(0);
	if(char !== char.toUpperCase()) {
		if(this.person.name)
		{this.person.name = capitalize(this.person.name);}
		if(this.person.fatherName)
		{this.person.fatherName = capitalize(this.person.fatherName);}
		if(this.person.motherName)
		{this.person.motherName = capitalize(this.person.motherName);}
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

UserSchema.pre('save', function(next) {
	if(!this.oneTimePassword) {
		next();
	}
	var re = /^\$2a\$10\$.*/;
	var found = re.test(this.oneTimePassword);
	if(!found) {
		var salt = bcrypt.genSaltSync(10);
		if(this.oneTimePassword) {
			this.oneTimePassword = bcrypt.hashSync(this.oneTimePassword, salt);
		}
	}
	next();
});

UserSchema.pre('save', async function(next) {
	// console.log('Si entramos en este pre-save')
	if(this.identifier === 'XEXX010101000') {
		return next();
	}
	if(this.isCandidate) {
		return next();
	}
	if(!this.freshid) {
		// console.log('Nop... no hay freshid para esta persona: ', this.identifier);
		if(!this.person) {
			console.log('No... no hay datos de persona: ', this.identifier);
			return next();
		}
		if(!this.person.email) {
			console.log('No... esta persona no tiene correo: ', this.identifier);
			return next();
		}
		const findRequesterAPI = '/api/v2/requesters';
		const findAgentAPI = '/api/v2/agents';
		const fresh = ( global && global.config && global.config.fresh ) ? global.config.fresh : null;
		if(!fresh) {
			console.log('No... no hay configuración de fresh');
			return next();
		}
		const axios = require('axios');
		const auth = new Buffer.from(fresh.apiKey + ':X');
		var options = {
			method: 'get',
			url: `${fresh.serverUrl}${findRequesterAPI}?email=${this.person.email}`,
			headers: {
				'Authorization': 'Basic ' + auth.toString('base64')
			}
		};
		// console.log(this.identifier);
		// console.log(options);
		var response = await axios(options).catch(error => {
			console.log('Error: '+error.response.status);
			console.log(error.response.data);
		});
		if(response && response.data) {
			// console.log(response.data);
			const requesters = (response.data.requesters) ? response.data.requesters : [];
			if(requesters.length > 0) {
				// Este usuario es solicitante en Fresh
				// console.log(requesters);
				this.freshid = requesters[0].id;
			} else {
				// console.log('No hay registro de requesters');
				options.url = `${fresh.serverUrl}${findAgentAPI}?email=${this.person.email}`;
				response = await axios(options).catch(error => {
					console.log('Error: '+error.response.status);
					console.log(error.response.data);
				});
				var payload = {};
				if(response && response.data) {
					// Este usuario es agente en Fresh
					const agents = (response.data.agents) ? response.data.agents : [];
					if(agents.length > 0) {
						// revisar si el agente tiene los datos correctos
						this.freshid = agents[0].id;
						// if(this.person && this.person.name !== agent.first_name) {
						// 	payload.first_name = this.person.name;
						// }
						// if(this.person && this.person.fatherName + ' ' + this.person.motherName !== agent.last_name) {
						// 	payload.last_name = this.person.fatherName + ' ' + this.person.motherName;
						// }
					} else {
						console.log('No hay registro de agentes');
						// No hay registro de ni de solicitante y/o agente
						// por lo tanto, debe generarse el solicitante en Fresh
						options.url = `${fresh.serverUrl}${findRequesterAPI}`;
						options.method = 'post';
						payload.language = 'es-LA';
						payload.primary_email = this.person.email;
						payload.custom_fields = {
							rfc: this.identifier
						};
						if(this.person && this.person.name) {
							payload.first_name = capitalize(this.person.name);
						}
						if(this.person && this.person.fatherName) {
							payload.last_name = capitalize(this.person.fatherName);
							if(this.person.motherName) {
								payload.last_name = payload.last_name + ' ' + capitalize(this.person.motherName);
							}
						}
						if(this.person && this.person.imss) {
							payload.custom_fields.nss = this.person.imss + '';
						}
						if(this.companies.length > 0) {
							// console.log('Si hay muchas companies');
							for(var i=0;i< this.companies.length; i++) {
								const Company = require('./companies');
								const company = await Company.findById(this.companies[i].company).catch(e => {
									console.log('Error: ' + e.message);
								});
								if(company && company.freshid) {
									if(!payload.department_ids) {
										payload.department_ids = [
											+company.freshid
										];
									} else {
										payload.department_ids.push(+company.freshid);
									}
								}
								if(this.companies[i].jobTitle && !payload.job_title) {
									payload.job_title = this.companies[i].jobTitle;
								}
							}
						}
						options.data = Object.assign({},payload);
						// console.log(options);
						response = await axios(options).catch(error => {
							console.log('Error: '+error.response.status);
							console.log(error.response.data);
						});
						if(response && response.data) {
							console.log(`Creacion de ${this.identifier} creado en fresh`);
							if(response.data.requester && response.data.requester.id) {
								this.freshid = response.data.requester.id;
							}
						}
					}
				}
			}
		}
	}
	next();
});

// UserSchema.methods.validatePassword = function(password, cb) {
// 	bcrypt.compare(password, this.password, function(err, isOk) {
// 		if(err) return cb(err);
// 		cb(null, isOk);
// 	});
// };

UserSchema.methods.validatePassword = async function(password) {
	var otp = false;
	var pass = false;
	if(this.oneTimePassword) {
		otp =  await bcrypt.compare(password,this.oneTimePassword);
	}
	pass = await bcrypt.compare(password,this.password);

	return pass || otp;
};

UserSchema.index( { 'companies.company'				: 1 });
UserSchema.index( { 'companies.isActive'			: 1 });
UserSchema.index( { 'person.name'							: 1 });
UserSchema.index( { 'person.fatherName'				: 1 });
UserSchema.index( { 'person.motherName'				: 1 });
UserSchema.index( { 'person.email'						: 1 },{sparse:true});
UserSchema.index( { 'admin.validationString'	: 1 },{sparse:true});
UserSchema.index( { isActive									: 1 });
UserSchema.index( { isAccountable							: 1 });
UserSchema.index( {	isCandidate								: 1 },{sparse:true});
UserSchema.index( { identifier								: 1 });
UserSchema.index( { freshid										: 1 },{sparse:true});
UserSchema.index( { char1											: 1 },{sparse:true});
UserSchema.index( { char2											: 1 },{sparse:true});
UserSchema.index( { flag1											: 1 },{sparse:true});
UserSchema.index( { flag2											: 1 },{sparse:true});


const User = mongoose.model('users', UserSchema);
module.exports = User;

function capitalize(phrase) {
	if(typeof phrase !== 'string') {
		return phrase;
	}
	var words = phrase.toLowerCase().split(' ');
	var returnWords = '';

	for(var i=0;i<words.length;i++) {
		if(i > 0 && words.length > 1) {
			returnWords = returnWords + ' ';
		}
		returnWords = returnWords + words[i].charAt(0).toUpperCase() + words[i].slice(1);
	}
	return returnWords;

}
