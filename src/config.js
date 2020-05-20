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
	mail: {
		fromEmail: String,
		fromName: String,
		apiKeyPublic: String,
		apiKeyPrivate: String,
		genericTemplate: Number,
		templateErrorDeliver: Boolean,
		templateErrorReportingEmail: String,
		templateErrorReportingName: String,
		saveEmail: Boolean
	},
	routes: {
		jsonBodyLimit: String
	},
	fresh: {
		serverUrl: String,
		apiKey: String
	},
	apiVersion: String,
	portalVersion: Number,
	history: [HistorySchema]
});

// ConfigSchema.index({ user: 1});

const Config = mongoose.model('config', ConfigSchema);
module.exports = Config;
