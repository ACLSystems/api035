const mongoose = require('mongoose');
const HistorySchema = require('./history');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const GroupSchema = new Schema ({
	name: {
		type: String,
		required: [true, '"name" es requerido'],
		lowercase: true,
		unique: true
	},
	company: {
		type: ObjectId,
		ref: 'companies'
	},
	display: String,
	alias: [String],
	isActive: {
		type: Boolean,
		default: true
	},
	users: [{
		type: ObjectId,
		ref: 'users'
	}],
	history: [HistorySchema]
});

GroupSchema.pre('save', function(next) {
	this.name = this.name.toLowerCase();
	next();
});

GroupSchema.index({name:1});
GroupSchema.index({isActive:1});

const Group = mongoose.model('groups', GroupSchema);
module.exports = Group;
