const mongoose			= require('mongoose');
const auto 					= require('mongoose-sequence')(mongoose);
const HistorySchema = require('./history');
const AddressSchema = require('./address');
const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const QualityLifeSchema = new Schema({
	distanceToHomeTime	: Number,
	distanceToHomeUnits	: {
		type: String,
		enum: ['minutos','horas']
	},
	dailyTransportRate	: Number,
	gasWeeklyRate				: Number,
	ownAutomobile				: Boolean,
	ownHouse						: Boolean,
	rent								: Boolean,
	familyHouse					: Boolean,
	mortage							: Boolean,
	motageCost 					: Number,
	rentCost						: String,
	infonavitRetention	: Boolean,
	placeShift					: Boolean,
	whyPlaceShift				: String,
	monthlyIncome				: Number,
	monthlyExpenses			: Number
},{_id: false});

const HealthSchema = new Schema({
	hobbies							: [String],
	alcohol							: Boolean,
	alcoholFrecuency		: {
		type: String,
		enum: [
			'Diario',
			'Una vez a la semana',
			'Una vez al mes'
		]
	},
	tobacco							: Boolean,
	tobaccoFrecuency		: {
		type: String,
		enum: [
			'Diario',
			'Una vez a la semana',
			'Una vez al mes'
		]
	},
	mainStrength: String,
	mainOportunityArea: String
});

const ReferencesSchema = new Schema({
	name: String,
	phone: String
},{_id: false});

const AcademicInfoSchema = new Schema({
	studiesGrade: String,
	diplomasAchieved: String,
	certificatesAchieved: String,
	institute: String,
	beginDate: Date,
	endDate: Date
},{_id: false});

const WorkInfoSchema = new Schema({
	companyName				: String,
	beginDate					: Date,
	endDate						: Date,
	initialJob				: String,
	finalJob					: String,
	salary						: String,
	reasonToLeave			: String,
	jobWeekSchedule		: [{
		type: String,
		enum: [
			'Lunes',
			'Martes',
			'Miércoles',
			'Jueves',
			'Viernes',
			'Sábado',
			'Domingo'
		]
	}],
	jobDailySchedule	: String,
	bossName					: String,
	companyPhone			: String,
	referencePhone		: String
},{_id: false});

const ChildrenSchema = new Schema({
	name: String,
	birthDate: Date,
	scholarShip: String,
	ocuppation: String
},{_id: false});

const FamilySchema = new Schema({
	name: String,
	birthDate: Date,
	relationShip: String,
	ocuppation: String
},{_id: false});

const JobSchema = new Schema({
	name: String,
	place: String,
},{_id: false});

const CommentsSchema = new Schema({
	text: String,
	by: {
		type: ObjectId,
		ref: 'users',
	},
	when: {
		type: Date,
		default: new Date()
	}
},{_id: false});

const StatusSchema = new Schema({
	status: {
		type: String,
		enum: [
			'Pendiente por llenar',
			'Revisar',
			'Relevante',
			'Entrevista',
			'Propuesta',
			'Contratado',
			'Rechazado'
		],
		default: 'Pendiente por llenar'
	},
	by: {
		type: ObjectId,
		ref: 'users',
	},
	when: {
		type: Date,
		default: new Date()
	},
	reason: {
		type: String
	}
},{_id: false});

const CVSchema = new Schema({
	user						: {
		type: ObjectId,
		ref: 'users',
		required: true
	},
	request					: {
		type: Number
	},
	folio: {
		type: Number,
		unique: true
	},
	filledWhen:{
		type: Date
	},
	modified: {
		type: Date
	},
	valid: {
		type: Boolean,
		default: true
	},
	cvToken					: String,
	cvTokenDate			: Date,
	birthDate				: Date,
	birthPlace			: String,
	gender					: {
		type: String,
		enum: [
			'Masculino',
			'Femenino'
		]
	},
	reHire: {
		type: Boolean,
		default: true
	},
	comments: [CommentsSchema],
	expireWhen: {
		type: Date
	},
	status: [StatusSchema],
	phone						: String,
	cellPhone				: String,
	messagePhone		: String,
	civil						: {
		type: String,
		enum: ['Casado','Soltero']
	},
	currentAddress	: AddressSchema,
	currentAddressDate	: Date,
	history					: [HistorySchema],
	childrenNumber	: Number,
	workInfo				:	[WorkInfoSchema],
	academicInfo		:	[AcademicInfoSchema],
	qualityLife			: QualityLifeSchema,
	references			: [ReferencesSchema],
	findVacancy			: {
		type: String,
		enum: [
			'Redes sociales',
			'Periódicos',
			'Revistas',
			'Me contactaron por teléfono',
			'Me contactaron vía email',
			'Me comentó un conocido',
			'Otros'
		]
	},
	working: Boolean,
	lastWorkInfo: Number,
	children: [ChildrenSchema],
	family: [FamilySchema],
	whatDoYouKnowAboutCompany : String,
	health: HealthSchema,
	tools: [String],
	job: [JobSchema]
});

CVSchema.plugin(auto,{inc_field: 'folio'});

CVSchema.index({user				: 1});
CVSchema.index({request			: 1});
CVSchema.index({folio 			: 1});
CVSchema.index({cvToken			: 1},{sparse:true});
CVSchema.index({'job.name'	: 1},{sparse:true});
CVSchema.index({'job.place'	: 1},{sparse:true});

const CV = mongoose.model('cvs', CVSchema);
module.exports = CV;
