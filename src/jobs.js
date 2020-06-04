const mongoose			= require('mongoose');
const HistorySchema = require('./history');
const Schema 				= mongoose.Schema;
// const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const JobSchema = new Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	category: {
		type: String,
		required: true
	},
	history: [HistorySchema]
});

JobSchema.index({name:1});
JobSchema.index({category:1});

const Job = mongoose.model('jobs', JobSchema);
module.exports = Job;
