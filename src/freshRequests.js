const mongoose			= require('mongoose');
const Schema 				= mongoose.Schema;
const ObjectId 			= Schema.Types.ObjectId;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const RequestsSchema = new Schema({
	transactionStatus: {
		type: String,
		enum: ['active','success','fail'],
		default: 'active'
	},
	requestStatus: {
		type: String,
		enum: ['open','closed'],
		default: 'open'
	},
	freshSchema: {
		type: String,
		enum: ['service_request', 'tickets', 'tasks', 'requesters']
	},
	requester: {
		type: ObjectId,
		ref: 'users'
	},
	data: {
		type: Object
	},
	ticketid: {
		type: Number,
		required: true
	},
	responses: [{
		type: Object
	}],
	dates: [{
		type: Date
	}]
});

RequestsSchema.index({ticketid					: 1});
RequestsSchema.index({transactionStatus	: 1});
RequestsSchema.index({requestStatus			: 1});
RequestsSchema.index({requester					: 1});

const Request = mongoose.model('requests', RequestsSchema);
module.exports = Request;
