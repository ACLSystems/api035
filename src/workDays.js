const mongoose			= require('mongoose');
const HistorySchema = require('./history');
const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => {
	schema.options.usePushEach = true;
});

const WorkingDaysSchema = new Schema({
	company: {
		type: ObjectId,
		ref: 'companies'
	},
	label: {
		type: String
	},
	monday: {
		type: Boolean
	},
	tuesday: {
		type: Boolean
	},
	wednesday: {
		type: Boolean
	},
	thursday: {
		type: Boolean
	},
	friday: {
		type: Boolean
	},
	saturday: {
		type: Boolean
	},
	sunday: {
		type: Boolean
	},
	daysByWeek: {
		type: Number
	},
	specialDates: [{
		type: Date
	}]
});

WorkingDaysSchema.index({company	:1},{sparse:true});
WorkingDaysSchema.index({label		:1});

const WorkDay = mongoose.model('workday', WorkingDaysSchema);
module.exports = WorkDay;
