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


const MarketingSchema = new Schema({
	tag: [String],
	isActive: {
		type: Boolean,
		default: true
	},
	beginDate: {
		type: Date,
		default: new Date()
	},
	endDate: {
		type: Date,
		default: new Date()
	},
	text: {
		type: String,
		required: true
	},
	image: {
		type: String
	},
	priority: {
		type: Number,
		default: 100
	},
	companies: [CompaniesSchema],
	history: [HistorySchema]
});

MarketingSchema.index({ tag									: 1},{sparse: true});
MarketingSchema.index({ isActive						: 1});
MarketingSchema.index({ beginDate						: 1},{sparse: true});
MarketingSchema.index({ endDate							: 1},{sparse: true});
MarketingSchema.index({ text								: 1});
MarketingSchema.index({ 'companies.isActive': 1},{sparse: true});
MarketingSchema.index({ 'companies.company'	: 1},{sparse: true});
MarketingSchema.index({ priority						: -1});

const Publicity = mongoose.model('publicities',MarketingSchema);
module.exports = Publicity;
