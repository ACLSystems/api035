const mongoose = require('mongoose');
const HistorySchema = require('./history');
const Schema = mongoose.Schema;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const ConfigSchema = new Schema({
	server: {
		issuer: String,
		expires: String,
		urlLogin: String,
		privateKey: String,
		publicKey: String,
		portalUri: String
	},
	routes: {
		jsonBodyLimit: String
	},
	history: [HistorySchema]
});

// ConfigSchema.index({ user: 1});

const Config = mongoose.model('config', ConfigSchema);
module.exports = Config;
