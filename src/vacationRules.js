const mongoose = require('mongoose');
const HistorySchema = require('./history');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const RuleSchema = new Schema({
	year: {
		type: Number,
		required: true
	},
	days: {
		type: Number,
		required: true
	},
	company: {
		type: ObjectId,
		ref: 'companies'
	},
	label: {
		type: String
	},
	description: {
		type: String
	},
	active: {
		type: Boolean,
		default: true,
		required: true
	},
	history: [HistorySchema]
});

RuleSchema.index({company	: 1},{sparse:true});
RuleSchema.index({label		: 1},{sparse:true});
RuleSchema.index({status	: 1});
RuleSchema.index({years		: 1});

const Rule = mongoose.model('vacationRules', RuleSchema);
module.exports = Rule;
