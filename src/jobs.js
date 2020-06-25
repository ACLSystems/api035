const mongoose			= require('mongoose');
const HistorySchema = require('./history');
const Schema 				= mongoose.Schema;
// const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const DocsSchema = new Schema({
	visa: Boolean,
	licencia: Boolean,
	aptoMedico: Boolean,
	antecedentes: Boolean,
	gafete: Boolean
},{_id:false});

const JobSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	area: {
		type: String,
		required: true
	},
	place: {
		type: String,
		required: true
	},
	functions: [String],
	history: [HistorySchema],
	docs: DocsSchema
});

JobSchema.index({name:1});
JobSchema.index({area:1});
JobSchema.index({place:1});
JobSchema.index({
	name: 1, area: 1, place: 1
}, {unique: true});

const Job = mongoose.model('jobs', JobSchema);
module.exports = Job;
