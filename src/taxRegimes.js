const mongoose = require('mongoose');
const HistorySchema = require('./history');
const Schema = mongoose.Schema;

const TaxRegimeSchema = new Schema ({
	version: {
		type: String,
		default: '1.0'
	},
	revision: {
		type: String,
		default: 'B'
	},
	taxRegime: {
		type: Number,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	applyToCompanies: {
		type: Boolean
	},
	applyToUsers: {
		type: Boolean
	},
	beginDate: {
		type: Date
	},
	endDate: {
		type: Date
	},
	history: [HistorySchema]
});

module.exports = TaxRegimeSchema;

TaxRegimeSchema.index({taxRegime	: 1});
TaxRegimeSchema.index({description: 1});

const TaxRegime = mongoose.model('taxregimes', TaxRegimeSchema);
module.exports = TaxRegime;
