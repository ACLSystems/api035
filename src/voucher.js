const mongoose = require('mongoose');
const HistorySchema = require('./history');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

mongoose.plugin(schema => { schema.options.usePushEach = true;});

const VoucherSchema = new Schema({
	type: {
		type: String,
		enum: ['payroll', 'other'],
		default: 'other'
	},
	user: {
		type: ObjectId,
		ref: 'users',
		required: true
	},
	document: Mixed,
	attachments: [{
		data: Buffer,
		contentType: String,
		originalName: String
	}],
	pdfTemplate: String,
	history:[HistorySchema]
});

VoucherSchema.index({ user: 1});
VoucherSchema.index({ type: 1});

const Voucher = mongoose.model('vouchers', VoucherSchema);
module.exports = Voucher;
