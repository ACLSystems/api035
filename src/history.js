const mongoose	= require('mongoose');
const Schema 		= mongoose.Schema;
const ObjectId	= Schema.Types.ObjectId;


const HistorySchema = new Schema({
	by: {
		type: ObjectId,
		required: true,
		ref: 'users'
	},
	when: {
		type: Date,
		required: true,
		default: new Date()
	},
	what: {
		type: String,
		required: true,
		default: 'Modificado'
	}
}, { _id: false });

module.exports = HistorySchema;
