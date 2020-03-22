const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AddressSchema = new Schema ({
	line1: String,
	line2: String,
	postalCode: String,
	locality: String,
	city: String,
	state: String,
	country: String
});

module.exports = AddressSchema;
