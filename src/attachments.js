const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const AttachmentSchema = new Schema ({
	attachment: {
		data: Buffer,
		contentType: String,
		originalName: String
	},
	kind: {
		type: String,
		required: [true, '"kind" (tipo de referencia) es requerido. Ejemplo: "users", "companies"']
	},
	item: {
		type: ObjectId,
		refPath: 'kind',
		required: [true, '"item" es requerido. Este es el ID del elemento referido (usuario, compañía) Ejemplo: "9A238C318A102312301"']
	}
});

module.exports = AttachmentSchema;

AttachmentSchema.index({kind: 1});
AttachmentSchema.index({item: 1});


const Attachment = mongoose.model('attachments', AttachmentSchema);
module.exports = Attachment;
