const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.plugin(schema => {schema.options.usePushEach = true;});

const ControlSchema = new Schema({
	name: {
		type: String,
		default: 'api035',
		unique: [true, 'Control ya existe. Por favor validar']
	},
	version: String,
	schemas: [String],
	mongo: String,
	mongoose: String,
	host: String
});

const Control = mongoose.model('control', ControlSchema, 'control');
module.exports = Control;
