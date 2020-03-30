const mongoose = require('mongoose');
const HistorySchema = require('./history');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const AttachmentSchema = new Schema ({
	attachment: {
		data: Buffer,
		contentType: String,
		originalName: String
	},
	data: {
		type: String
	},
	mimeType: {
		type: String
	},
	type: {
		type: String,
		enum: ['attachment', 'data']
	},
	documentType: {
		type: String
	},
	subDocumentType: {
		type: String
	},
	documentNumber: {
		type: String
	},
	// kind: {
	// 	type: String,
	// 	required: [true, '"kind" (tipo de referencia) es requerido. Ejemplo: "users", "companies"']
	// },
	// item: {
	// 	type: ObjectId,
	// 	refPath: 'kind',
	// 	required: [true, '"item" es requerido. Este es el ID del elemento referido (usuario, compañía) Ejemplo: "9A238C318A102312301"']
	// },
	company: {
		type: ObjectId,
		ref: 'companies',
		required: [true, '"company" es requerido']
	},
	user: {
		type: ObjectId,
		ref: 'users'
	},
	created: {
		type: Date,
		default: new Date()
	},
	updated: {
		type: Date,
		default: new Date()
	},
	referenceDate: {
		type: Date
	},
	history: [HistorySchema]
});

module.exports = AttachmentSchema;

AttachmentSchema.index({user					: 1},{sparse: true});
AttachmentSchema.index({company				: 1});
AttachmentSchema.index({referenceDate	: 1});
AttachmentSchema.index({mimeType			: 1},{sparse: true});
AttachmentSchema.index({documentType	: 1},{sparse: true});
AttachmentSchema.index({subDocumentType	: 1},{sparse: true});


const Attachment = mongoose.model('attachments', AttachmentSchema);
module.exports = Attachment;
