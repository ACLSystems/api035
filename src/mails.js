const mongoose	= require('mongoose');
const Schema 		= mongoose.Schema;
const ObjectId	= Schema.Types.ObjectId;
const Mixed			= Schema.Types.Mixed;

mongoose.plugin(schema => {schema.options.usePushEach = true;});

const MailSchema = new Schema({
	subject: {
		type: String,
		required: true
	},
	receiverEmail: {
		type: String,
		required: true
	},
	receiver: {
		type: ObjectId,
		ref: 'users',
		required: true
	},
	status: {
		type: String
	},
	date: {
		type: Date,
		default: new Date()
	},
	messageID: {
		type: String
	},
	messageHref: {
		type: String
	},
	emailErrors: {
		type: [Mixed]
	}
});

MailSchema.index({receiverEmail	: 1});
MailSchema.index({receiver			: 1});
MailSchema.index({status				: 1}, {sparse: true});
MailSchema.index({date					: 1});
MailSchema.index({subject				: 1});

const Mail = mongoose.model('mails', MailSchema);
module.exports = Mail;
