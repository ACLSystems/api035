const Privates = require('./privates');

module.exports = {
	// CFDI recibe documento en base64
	timbreFiscalDigital(docString){
		let timbre = {
			version: docString['Version'] || undefined,
			uuid: docString['UUID'] || undefined,
			fechaTimbrado: docString['FechaTimbrado'] ? Privates.createNewDate(docString['FechaTimbrado']) : undefined,
			rfcProvCertif: docString['RfcProvCertif'] || undefined,
			leyenda: docString['Leyenda'] || undefined,
			selloCFD: docString['SelloCFD'] || undefined,
			noCertificadoSAT: docString['NoCertificadoSAT'] || undefined,
			selloSAT: docString['SelloSAT'] || undefined,
			timbreFiscalDigital: true
		};
		timbre = Privates.removeUndefined(timbre);
		timbre.valid = Privates.validateRequired(timbre,[
			'version','uuid','fechaTimbrado','rfcProvCertif','selloCFD','noCertificadoSAT','selloSAT'
		]);
		return timbre;
	},//timbreFiscalDigital
};
