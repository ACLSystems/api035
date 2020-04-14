const mongoose			= require('mongoose');
const HistorySchema = require('./history');
const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const CompaniesSchema = new Schema({
	isActive: {
		type: Boolean,
		default: true
	},
	company: {
		type: ObjectId,
		ref: 'companies'
	}
},{_id: false});

const ServiceSchema = new Schema({
	tag: [String],
	isActive: {
		type: Boolean,
		default: true
	},
	title: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	image: {
		type: String
	},
	icon: {
		type: String
	},
	code: {
		type: String,
		required: true
	},
	iconColor: {
		type: String
	},
	priority: {
		type: Number,
		default: 100
	},
	companies: [CompaniesSchema],
	history: [HistorySchema]
});

ServiceSchema.index({ tag										: 1}, {sparse: true});
ServiceSchema.index({	isActive							: 1});
ServiceSchema.index({ 'companies.isActive'	: 1}, {sparse: true});
ServiceSchema.index({ 'companies.company'		: 1}, {sparse: true});

const Service = mongoose.model('services', ServiceSchema);
module.exports = Service;
