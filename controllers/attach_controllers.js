const StatusCodes = require('http-status-codes');
const Attachment 	= require('../src/attachments');
const Company 		= require('../src/companies');
const TaxRegime 	= require('../src/taxRegimes');
const User				= require('../src/users');

module.exports = {

	async create(req,res) {
		const keyUser = res.locals.user;
		/*
			Esta sección validará los datos que se envían de usuarios y compañía. Si no existen manda error.
		*/
		if(req.body.kind && req.body.kind !== 'companies' && req.body.kind !== 'users') {
			return res.status(StatusCodes.OK).json({
				'message': `El campo kind: ${req.body.kind} tiene un valor no reconocido`
			});
		}
		if(req.body.kind === 'companies') {
			const company = await Company.findById(req.body.item);
			if(!company){
				return req.status(StatusCodes.OK).json({
					'message': 'El valor de "item" no corresponde con una empresa existente. kind = "companies"'
				});
			}
		}
		if(req.body.kind === 'users') {
			const User = require('../src/users');
			const user = await User.findById(req.body.item);
			if(!user){
				return req.status(StatusCodes.OK).json({
					'message': 'El valor de "item" no corresponde con un usuario existente. kind = "users"'
				});
			}
		}
		/*
		La siguiente sección validará si los datos del usuario y la compañía existen. De lo contrario hay que crearlas.
		*/
		try {
			var data = new Attachment(req.body);
			data.history = [{
				by: keyUser._id,
				what: 'Creación del documento'
			}];
			if(data.type === 'data' && data.data) {
				if(!data.kind) {
					const xml2json = require('xml2json');
					const buffer = Buffer.from(req.body.data,'base64');
					const data = JSON.parse(xml2json.toJson(buffer.toString('utf-8')));
					const keys = Object.keys(data['cfdi:Comprobante']);
					if(keys.includes('xmlns:nomina12')) {
						const comprobante = data['cfdi:Comprobante'];
						data.documentType = 'xmlns:nomina12';
						var emitter = await Company.findOne({identifier: comprobante['cfdi:Emisor']['Rfc']});
						const taxRegime = await TaxRegime.findOne({taxRegime: +comprobante['cfdi:Emisor']['RegimenFiscal']})
							.select('_id');
						if(!emitter) {
							emitter = new Company({
								identifier: comprobante['cfdi:Emisor']['Rfc'] || undefined,
								name: comprobante['cfdi:Emisor']['Nombre'] || undefined,
								display: comprobante['cfdi:Emisor']['Nombre'] || undefined,
								taxRegime: taxRegime._id || undefined,
								type: 'pagadora',
								employerRegistration: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Emisor']['RegistroPatronal'] || undefined
							});
							emitter.history = [{
								by: keyUser._id,
								what: 'Creación de la empresa mediante documento'
							}];
							await emitter.save();
						} else {
							if(!emitter.taxRegime) {
								emitter.taxRegime = taxRegime._id;
							}
							if(!emitter.employerRegistration) {
								emitter.employerRegistration = comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Emisor']['RegistroPatronal'];
							}
						}
						var subhire = await Company.findOne({identifier: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['nomina12:SubContratacion']['RfcLabora']});
						if(!subhire) {
							subhire = new Company({
								name: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['nomina12:SubContratacion']['RfcLabora'],
								identifier: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['nomina12:SubContratacion']['RfcLabora']
							});
							subhire.history = [{
								by: keyUser._id,
								what: 'Creación de la empresa mediante documento'
							}];
							await subhire.save();
						}
						var user = await User.findOne({identifier: comprobante['cfdi:Receptor']['Rfc']});
						if(!user) {
							const securePass = require('secure-random-password');
							const names = comprobante['cfdi:Receptor']['Nombre'].split(' ');
							user = new User({
								identifier: comprobante['cfdi:Receptor']['Rfc'],
								companies: [{
									isActive: true,
									company: subhire._id,
									employeeId: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['NumEmpleado'] || undefined,
									jobTitle: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['Puesto'] || undefined,
									jobRisk: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['RiesgoPuesto'] || undefined,
									department: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['Departamento'] || undefined,
									beginDate: new Date(comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['FechaInicioRelLaboral']),
									dailySalary: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['SalarioDiarioIntegrado'] || undefined
								}],
								person: {
									name: name.slice(0,-2),
									fatherName: name.slice(-2,-1),
									motherName: names.slice(-1),
									imss: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['NumSeguridadSocial'] || undefined,
									curp: comprobante['cfdi:Complemento']['nomina12:Nomina']['nomina12:Receptor']['Curp'] || undefined
								}
							});
							user.password = securePass.randomPassword({
								length: 12,
								characters: [{
									characters: securePass.upper,
									exactly: 4
								},{
									characters: securePass.symbols,
									exactly: 2
								},{
									characters: securePass.digits,
									exactly: 2
								},
								securePass.lower
								]
							});
							user.admin = {
								initialPassword: user.password
							};
							await user.save();
						}
						data.kind = 'users';
						data.item = user._id;
						data.referenceDate = new Date(comprobante['cfdi:Complemento']['nomina12:Nomina']['fechaPago']);
					}
				}
			}
			await data.save();
			return res.status(StatusCodes.CREATED).json({
				'message': 'Documento cargado'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}
};
