const StatusCodes = require('http-status-codes');
const Attachment 	= require('../src/attachments');
const Company 		= require('../src/companies');
const TaxRegime 	= require('../src/taxRegimes');
const User				= require('../src/users');
const Secure 			= require('../shared/secure');
const DocType 		= require('../parsers/cfdi');
const Tools 			= require('../shared/toolsValidate');

module.exports = {

	async loadCFDI(req,res) {
		const keyUser = res.locals.user;
		/*
		La siguiente sección validará si los datos del usuario y la compañía existen. De lo contrario hay que crearlas.
		*/
		var emisorCreated = false;
		var subhireCreated = false;
		var userCreated = false;
		var dataCreated = false;
		var documentNumber = false;
		if(req.body.type === 'data' &&
		(req.body.mimeType === 'application/xml' ||
		req.body.mimeType === 'text/xml')
		){
			if(!req.body.company && !req.body.user) {
				const xml2json = require('xml2json');
				var docData;
				try {
					if(req.body.base64) {
						const buffer = Buffer.from(req.body.data,'base64');
						docData = JSON.parse(xml2json.toJson(buffer.toString('utf-8')));
					} else {
						docData = JSON.parse(xml2json.toJson(req.body.data));
					}

					const doc = DocType.cfdi(docData);
					// return res.status(StatusCodes.OK).json(doc);
					if(!doc.complemento || (doc.complemento && !doc.complemento.nomina12)) {
						return res.status(StatusCodes.OK).json({
							'message': 'CFDI 3.3 es válido pero no contiene complemento de nómina 1.2'
						});
					}
					if(doc.complemento &&
						doc.complemento.timbreFiscalDigital &&
						doc.complemento.timbreFiscalDigital.uuid
					) {
						documentNumber = doc.complemento.timbreFiscalDigital.uuid;
					}
					// console.log(documentNumber);
					if(documentNumber) {
						var data = await Attachment.findOne({documentNumber})
							.select('-id');
						if(data) {
							return res.status(StatusCodes.OK).json({
								'message': 'Documento previamente cargado',
								'emisorCreated': emisorCreated,
								'subhireCreated': subhireCreated,
								'userCreated': userCreated,
								'dataCreated': dataCreated
							});
						}
					}
					data = new Attachment({
						data: req.body.data,
						type: 'data',
						mimeType: req.body.mimeType,
						documentNumber: documentNumber ? documentNumber : undefined,
						documentName: req.body.documentName,
						documentValid: doc.valid,
						history: [{
							by: keyUser._id,
							what: 'Carga de documento'
						}]
					});
					if(doc.cfdi) {
						data.documentType = 'cfdi';
					}
					if(doc.complemento && doc.complemento.nomina12 && doc.complemento.nomina12.nomina12) {
						data.subDocumentType = 'nomina12';
						data.beginDate = doc.complemento.nomina12.fechaInicialPago || undefined;
						data.endDate = doc.complemento.nomina12.fechaFinalPago || undefined;
					}

					// buscar emisor
					var emisor = await Company.findOne({identifier: doc.emisor.rfc});
					const taxRegime = await TaxRegime.findOne({taxRegime: +doc.emisor.regimenFiscal})
						.select('_id');
					var pleaseSaveEmisor = false;
					if(!emisor) {
						if(doc.emisor && doc.emisor.rfc) {
							emisor = new Company({
								identifier: doc.emisor.rfc,
								name: (doc.emisor && doc.emisor.nombre) ? doc.emisor.nombre : undefined,
								display: (doc.emisor && doc.emisor.nombre) ? doc.emisor.nombre : undefined,
								taxRegime: (taxRegime && taxRegime._id) ? taxRegime._id : undefined,
								type: 'pagadora',
								employerRegistration: (doc.complemento && doc.complemento.nomina12 && doc.complemento.nomina12.emisor && doc.complemento.nomina12.emisor.registroPatronal) ? doc.complemento.nomina12.emisor.registroPatronal : undefined,
								history: [{
									by: keyUser._id,
									what: 'Creación de la empresa mediante cfdi'
								}]
							});
							emisorCreated = true;
							pleaseSaveEmisor = true;
						}
					} else {
						if(!emisor.taxRegime) {
							emisor.taxRegime = taxRegime._id;
							pleaseSaveEmisor = true;
						}
						if(!emisor.employerRegistration) {
							emisor.employerRegistration = (doc.complemento && doc.complemento.nomina12 && doc.complemento.nomina12.emisor && doc.complemento.nomina12.emisor.registroPatronal) ? doc.complemento.nomina12.emisor.registroPatronal : undefined;
							pleaseSaveEmisor = true;
						}
					}
					if(pleaseSaveEmisor){
						await emisor.save();
					}
					//buscar subhire
					var subhire = false;
					if(doc.complemento && doc.complemento.nomina12 && doc.complemento.nomina12.receptor && doc.complemento.nomina12.receptor.subContratacion && doc.complemento.nomina12.receptor.subContratacion.rfcLabora) {
						const sub = doc.complemento.nomina12.receptor.subContratacion;
						subhire = await Company.findOne({identifier: sub.rfcLabora});
						if(!subhire) {
							subhire = new Company({
								identifier: sub.rfcLabora,
								name: sub.rfcLabora,
								type: 'cliente',
								history: [{
									by: keyUser._id,
									what: 'Creación de la empresa mediante cfdi'
								}]
							});
							subhireCreated = true;
							await subhire.save();
						}
					} else {
						console.log(`Esta empresa paga directo: ${emisor.identifier}`);
					}
					var pleaseSaveUser = false;
					var user = await User.findOne({identifier: doc.receptor.rfc});
					const receptor = (doc.complemento && doc.complemento.nomina12 && doc.complemento.nomina12.receptor) ? doc.complemento.nomina12.receptor : false;
					var userCompany = {
						isActive: true,
						company: subhire ? subhire._id : emisor._id,
						employeeId: receptor ? receptor.numEmpleado : undefined,
						jobTitle: receptor ? receptor.puesto : undefined,
						jobRisk: receptor ? receptor.riesgoPuesto : undefined,
						department: receptor ? receptor.departamento : undefined,
						beginDate: (receptor && receptor.fechaInicioRelLaboral) ? new Date(receptor.fechaInicioRelLaboral) : undefined,
						dailySalary: receptor ? receptor.salarioDiarioIntegrado : undefined
					};
					if(!user) {
						const name = doc.receptor.nombre.split(' ');
						user = new User({
							identifier: doc.receptor.rfc,
							person: {
								name: name.slice(0,-2).join(' '),
								fatherName: name.slice(-2,-1).join(' '),
								motherName: name.slice(-1).join(''),
								imss: receptor ? receptor.numSeguridadSocial : undefined,
								curp: receptor ? receptor.curp : undefined
							}
						});

						user.companies = [userCompany];
						user.admin = {
							initialPassword: Secure.createSecurePass()
						};
						user.password = user.admin.initialPassword;
						userCreated = true;
						pleaseSaveUser = true;
					} else {
						var findCompany = user.companies.find(comp => comp.company + '' === subhire._id + '');
						if(!findCompany) {
							if(user.companies && Array.isArray(user.companies)) {
								user.companies.push(userCompany);
							} else {
								user.companies = [userCompany];
							}
							pleaseSaveUser = true;
						}
					}
					if(pleaseSaveUser) {
						await user.save();
					}

					if(subhire) {
						data.company = subhire._id;
					} else {
						data.company = emisor._id;
					}
					data.user = user._id;
					dataCreated = true;
					await data.save();
					if(user && user.person && user.person.email) {
						const server = (global.config && global.config.server) ? global.config.server : null;
						if(server && server.portalUri) {
							if(doc && doc.complemento && doc.complemento.nomina12) {
								const mail = require('../shared/mail');
								const toName = user.person.name || 'Nombre de usuario no definido';
								const options = {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								};
								await mail.sendMail(
									user.person.email,
									toName,
									user._id,
									'Nuevo recibo de nómina',
									`Se ha cargado un nuevo recibo de nómina en el Kiosco de servicios que abarca el periodo de ${doc.complemento.nomina12.fechaInicialPago.toLocaleDateString('es-MX',options)} a ${doc.complemento.nomina12.fechaFinalPago.toLocaleDateString('es-MX',options)}. Ingresa al Kiosco para descargarlo.`
								);
							}
						}
					}
					return res.status(StatusCodes.CREATED).json({
						'message': 'Documento cargado',
						'emisorCreated': emisorCreated,
						'subhireCreated': subhireCreated,
						'userCreated': userCreated,
						'dataCreated': dataCreated
					});
				} catch (e) {
					if(e.message.includes('errors in your xml file')) {
						return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
							'message': 'Favor de revisar el error:',
							error: 'El archivo no es un xml válido. Puede ocurrir que: 1. sea una cadena base64 en cuyo caso falta la bandera base64: true, o 2. envie un archivo xml válido.'
						});
					} else if(e.message.includes('E11000 duplicate key error collection')) {
						return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
							'message': 'Favor de revisar el error:',
							error: 'El archivo xml enviado tiene un número de certificado que ya fue cargado previamente'
						});
					} else {
						console.log(e);
						return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
							'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
							error: e.message
						});
					}
				}
			}
		}
		// Falta validar de archivos de otro tipo
		// await data.save();
	}, //create

	// Este API solo sacará una lista de documentos, pero no los documentos en sí
	// la idea es que en el siguiente API se obtenga el documento mediante el id
	async search(req,res) {
		const keyUser = res.locals.user;
		const {
			isAdmin,
			isTechAdmin,
			isBillAdmin,
			isOperator,
			isSupervisor
		} = keyUser.roles;
		if(!isAdmin &&
			!isTechAdmin &&
			!isBillAdmin &&
			!isOperator &&
			!isSupervisor
		) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes suficientes privilegios'
			});
		}
		if(!isSupervisor) {
			// poner en el query las empresas a las que pertenece el super
		}
		var query = Object.assign({},req.query);
		// Checar qué usuario es el que quiere consultar
		if(!query.user && !query.company) {
			query.user = keyUser._id;
		}
		// const operatorCompanies = keyUser.assignedCompanies.filter(comp => comp.isActive).map(comp => comp.company._id + '');
		// if(keyUser.roles.isOperator &&
		// 	!keyUser.roles.isAdmin &&
		// 	!keyUser.roles.isTechAdmin &&
		// 	!keyUser.roles.isBillAdmin
		// ){
		// 	if(query.company) {
		// 		if(!operatorCompanies.includes(req.query.company)) {
		// 			return res.status(StatusCodes.OK).json({
		// 				'message': 'No se encontraron documentos con ese criterio de búsqueda'
		// 			});
		// 		}
		// 	} else {
		// 		query.company = {
		// 			$in: operatorCompanies
		// 		};
		// 	}
		// }

		const now = new Date();
		var date = null;
		if(query.date) {
			date = Tools.transformDate(query.date);
		}
		// console.log('date',date);
		var beginDate = null;
		if(query.beginDate) {
			beginDate = Tools.transformDate(query.beginDate);
		} else {
			beginDate = date ?
				new Date(date.getFullYear(),date.getMonth(), 1) :
				new Date(now.getFullYear(),now.getMonth() -1, 1);
		}
		query.beginDate = {
			$gte: beginDate
		};

		var endDate = null;
		if(query.endDate) {
			endDate = Tools.transformDate(query.endDate);
		} else {
			endDate = date ?
				new Date(date.getFullYear(),date.getMonth() +1, 0) :
				new Date(now.getFullYear(),now.getMonth() +1, 0);
		}
		query.endDate = {
			$lte: endDate
		};

		delete query.date;
		// console.log(query);
		const docs = await Attachment.find(query)
			.select('type documentType subDocumentType documentNumber company user created updated referenceDate beginDate endDate').catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
					error: e.message
				});
			});
		// if(docs.length > 0) {
		// 	return res.status(StatusCodes.OK).json(docs);
		// }
		return res.status(StatusCodes.OK).json(docs);
		// return res.status(StatusCodes.OK).json({
		// 	'message': 'No se encontraron documentos con ese criterio de búsqueda'
		// });
	}, //search

	async searchMine(req,res) {
		const keyUser = res.locals.user;
		var query = Object.assign({},req.query);
		query.user = keyUser._id;
		var date = null;
		if(query.date) {
			date = Tools.transformDate(query.date);
		}
		var beginDate = null;
		if(query.beginDate) {
			beginDate = Tools.transformDate(query.beginDate);
		}
		var endDate = null;
		if(query.endDate) {
			endDate = Tools.transformDate(query.endDate);
		}
		if(date || beginDate || endDate) {
			query.referenceDate = {
				$gte: (!beginDate) ? new Date(date.getFullYear(), date.getMonth(), 1) : beginDate,
				$lte:  (!endDate) ? new Date(date.getFullYear(), date.getMonth() + 1, 0) : endDate
			};
		}
		delete query.date;
		// console.log(query);
		const docs = await Attachment.find(query)
			.select('type documentType documentNumber company user created updated referenceDate beginDate endDate').catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
					error: e.message
				});
			});
		if(docs.length > 0) {
			return res.status(StatusCodes.OK).json(docs);
		}
		return res.status(StatusCodes.OK).json({
			'message': 'No se encontraron documentos con ese criterio de búsqueda'
		});
	}, //search

	async get(req,res) {
		const keyUser = res.locals.user;
		const xml2json = require('xml2json');
		const Regimen = require('../src/taxRegimes');
		try {
			var doc = await Attachment.findById(req.params.attachid)
				.select('company user');
			if(!doc) {
				return res.status(StatusCodes.OK).json({
					'message': 'No existe documento'
				});
			}
			// Este documento es del mismo usuario
			if(doc.user +'' === keyUser._id + '') {
				doc = await Attachment.findById(doc._id)
					.select('attachment data mimeType type documentType documentNumber referenceDate beginDate endDate')
					.lean();
				if(!doc) {
					return res.status(StatusCodes.OK).json({
						'message': 'No existe documento'
					});
				}
				doc.json = DocType.cfdi(JSON.parse(xml2json.toJson(doc.data)));
				if(doc.json && doc.json.emisor && doc.json.emisor.regimenFiscal) {
					const regimen = await Regimen.findOne({taxRegime:doc.json.emisor.regimenFiscal}).catch(e => console.log(e));
					if(regimen) {
						doc.json.emisor.regimenFiscalDescripcion = regimen.description;
					}
				}
				doc.json.cadena = await  xslt(doc.data,doc.json.complemento.timbreFiscalDigital.uuid);
				return res.status(StatusCodes.OK).json(doc);
			}
			// usuario no tiene roles
			if(!Secure.checkPrivileges(keyUser,[
				'isAdmin',
				'isOperator',
				'isSupervisor',
				'isTechAdmin',
				'isBillAdmin'])) {
				if(doc.user + '' !== keyUser._id + '') {
					return res.status(StatusCodes.FORBIDDEN).json({
						'message': 'No tienes privilegios'
					});
				}
				doc = await Attachment.findById(doc._id)
					.select('attachment data mimeType type documentType documentNumber referenceDate beginDate endDate')
					.lean();
				if(!doc) {
					return res.status(StatusCodes.OK).json({
						'message': 'No existe documento'
					});
				}
				doc.json = DocType.cfdi(JSON.parse(xml2json.toJson(doc.data)));
				if(doc.json && doc.json.emisor && doc.json.emisor.regimenFiscal) {
					const regimen = await Regimen.findOne({taxRegime:doc.json.emisor.regimenFiscal}).catch(e => console.log(e));
					if(regimen) {
						doc.json.emisor.regimenFiscalDescripcion = regimen.description;
					}
				}
				doc.json.cadena = await  xslt(doc.data,doc.json.complemento.timbreFiscalDigital.uuid);
				return res.status(StatusCodes.OK).json(doc);
			}
			// Es algún admin?
			if(Secure.checkPrivileges(keyUser, ['isAdmin',
				'isTechAdmin',
				'isBillAdmin'])) {
				doc = await Attachment.findById(doc._id)
					.select('attachment data mimeType type documentType documentNumber referenceDate company user created updated')
					.populate([{
						path: 'company',
						select: 'identifier display alias'
					},{
						path: 'user',
						select: 'identifier person'
					}])
					.lean();
				if(!doc) {
					return res.status(StatusCodes.OK).json({
						'message': 'No existe documento'
					});
				}
				doc.json = await DocType.cfdi(JSON.parse(xml2json.toJson(doc.data)));
				if(doc.json && doc.json.emisor && doc.json.emisor.regimenFiscal) {
					const regimen = await Regimen.findOne({taxRegime:doc.json.emisor.regimenFiscal}).catch(e => console.log(e));
					if(regimen) {
						doc.json.emisor.regimenFiscalDescripcion = regimen.description;
					}
				}
				doc.json.cadena = await xslt(doc.data,doc.json.complemento.timbreFiscalDigital.uuid);
				return res.status(StatusCodes.OK).json(doc);
			} else {
				// Entonces es algún operador o un supervisor
				const operatorCompanies = keyUser.assignedCompanies.filter(comp => comp.isActive).map(comp => comp.company._id + '');
				if(!operatorCompanies.includes(doc.company + '')) {
					return res.status(StatusCodes.OK).json({
						'message': 'No tiene privilegios sobre el documento'
					});
				}
				doc = await Attachment.findById(doc._id)
					.select('attachment data mimeType type documentType documentNumber referenceDate company user created updated')
					.populate([{
						path: 'company',
						select: 'identifier display alias'
					},{
						path: 'user',
						select: 'identifier person'
					}])
					.lean();
				if(!doc) {
					return res.status(StatusCodes.OK).json({
						'message': 'No existe documento'
					});
				}
				if(doc.json && doc.json.emisor && doc.json.emisor.regimenFiscal) {
					const regimen = await Regimen.findOne({taxRegime:doc.json.emisor.regimenFiscal}).catch(e => console.log(e));
					if(regimen) {
						doc.json.emisor.regimenFiscalDescripcion = regimen.description;
					}
				}
				doc.json = DocType.cfdi(JSON.parse(xml2json.toJson(doc.data)));
				doc.json.cadena = await xslt(doc.data,doc.json.complemento.timbreFiscalDigital.uuid);
				return res.status(StatusCodes.OK).json(doc);
			}
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //get

	async create(req, res) {
		var user = res.locals.user;
		const cv = res.locals.cv;
		const accessToken = global.config &&
			global.config.fileRepo &&
			global.config.fileRepo.apiToken;
		if(!accessToken) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Acceso a servidor de archivos no configurado. Favor de contactar al administrador'
			});
		}
		if(!user && !cv) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No tienes privilegios o no estás autorizado a cargar archivos'
			});
		}
		var attach = new Attachment({
			attachment: {
				contentType: req.file.mimeType,
				originalName: req.file.originalName
			},
			documentType: req.body.documentType || undefined,
			documentName: req.file.originalName,
			subDocumentType: req.body.subDocumentType || undefined,
			company: req.body.company,
			user: req.body.userid || user._id || cv.user,
			created: new Date(),
			updated: new Date(),
			expirationDate: req.body.expirationDate || undefined,
			history: [{
				by: user._id || cv.user,
				what: 'Creación del documento'
			}]
		});
		await attach.save()
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al intentar almacenar el archivo'
				});
			});
		// var fileName = (req.file && req.file.filename) ? req.file.filename : (req.file && req.file.originalname) ? req.file.originalname : undefined;
		// require('isomorphic-fetch');
		// await new dropbox({accessToken: accessToken})
		// 	.filesUpload()
	}, // create

	async upload(req, res) {
		const fileRepo = (global.config && global.config.fileRepo) ? global.config.fileRepo: null;
		// console.log(fileRepo);
		if(!fileRepo || !fileRepo.apiToken) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Acceso a servidor de archivos no configurado. Favor de contactar al administrador'
			});
		}
		var keyUser = res.locals.user;
		const cv = res.locals.cv;
		if(!keyUser && !cv) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No estás autorizado'
			});
		}
		if(!req.file) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'No hay archivo que procesar'
			});
		}
		// console.log(cv);
		// console.log(keyUser);

		const dir = fileRepo.rootFolder;
		if(!dir) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Carpeta raiz no configurada. Favor de contactar al administrador'
			});
		}
		const dir1 = req.body.company || null;
		const dir2 = cv ? cv._id : keyUser._id;

		if(!dir1 || !dir2) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'No se encuentran las carpetas para almacenar archivo. Por favor seleccionar compañía'
			});
		}
		// console.log(req.file);
		var filename = (req.file && req.file.filename) ? req.file.filename : req.file.originalname;
		if(req.file.size > fileRepo.maxSize) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'Tamaño del archivo es más grande que el permitido'
			});
		}
		const File = require('../src/files');
		const file = new File({
			name		: req.file.originalname,
			mimetype: req.file.mimetype,
			filename: filename,
			path 		: `/${dir}/${dir1}/${dir2}`,
			size 		: req.file.size
		});
		// console.log(file);

		// const fs = require('fs');
		const axios = require('axios');
		// const localFile = await fs.readFileSync(fileRepo.tempDest);
		var options = {
			method: 'POST',
			url: `${fileRepo.serverContent}/2/files/upload`,
			headers: {
				'Authorization': `Bearer ${fileRepo.apiToken}`,
				'Dropbox-API-Select-User': fileRepo.teamMemberId,
				'Dropbox-API-Path-Root': `{".tag":"namespace_id","namespace_id": "${fileRepo.namespaceId}"}`,
				'Dropbox-API-Arg': `{"path":"/${dir}/${dir1}/${dir2}/${filename}"}`,
				'Content-Type': 'application/octet-stream'
			},
			data: req.file.buffer
		};
		var errorOcurred = false;
		var response = await axios(options).catch(e => {
			console.log(e.response.data);
			errorOcurred = true;
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Hubo un error en la transferencia del archivo',
				error: e.response.data.error
			});
		});
		if(errorOcurred) return;
		if(response && response.data) {
			file.fileid = response.data.id;
			await file.save().catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					message: 'Error al almacenar archivo'
				});
			});
			// response.data.fileid = file._id;
			res.status(StatusCodes.OK).json({
				name: response.data.name,
				fileid: file._id
			});
		} else {
			res.status(StatusCodes.OK).json({
				message: 'No response'
			});
		}
	}, // upload

	async getFileLink(req,res) {
		const fileRepo = (global.config && global.config.fileRepo) ? global.config.fileRepo: null;
		// console.log(fileRepo);
		if(!fileRepo || !fileRepo.apiToken) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Acceso a servidor de archivos no configurado. Favor de contactar al administrador'
			});
		}
		var keyUser = res.locals.user;
		const cv = res.locals.cv;
		if(!keyUser && !cv) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No estás autorizado'
			});
		}
		const File = require('../src/files');
		const file = await File.findById(req.params.fileid).catch(e => {
			console.log(e);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Hubo un error al intentar traer el id del archivo'
			});
		});
		if(!file) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'ID de archivo no existe'
			});
		}
		if(file.sharedLink) {
			return res.status(StatusCodes.OK).json({
				sharedLink: file.sharedLink
			});
		}
		const axios = require('axios');
		// const localFile = await fs.readFileSync(fileRepo.tempDest);
		var options = {
			method: 'POST',
			url: `${fileRepo.serverApi}/2/sharing/create_shared_link_with_settings`,
			headers: {
				'Authorization': `Bearer ${fileRepo.apiToken}`,
				'Dropbox-API-Select-User': fileRepo.teamMemberId,
				'Dropbox-API-Path-Root': `{".tag":"namespace_id","namespace_id": "${fileRepo.namespaceId}"}`,
				'Content-Type': 'application/json'
			},
			data: {
				path: `${file.path}/${file.filename}`,
				settings: {
					requested_visibility: 'public',
					audience: 'public',
					access: 'viewer'
				}
			}
		};
		var errorOcurred = false;
		var response = await axios(options).catch(e => {
			console.log(e.response.data);
			errorOcurred = true;
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Hubo un error en la transferencia del archivo',
				error: e.response.data.error
			});
		});
		if(errorOcurred) return;
		if(response && response.data) {
			file.sharedLink = response.data.url;
			await file.save().catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					message: 'Error al almacenar archivo'
				});
			});
			return res.status(StatusCodes.OK).json({
				sharedLink: file.sharedLink
			});
		}
		res.status(StatusCodes.OK).json({
			message: 'No response'
		});
	}, //getFileLink

	async getThumbnail(req,res) {
		const fileRepo = (global.config && global.config.fileRepo) ? global.config.fileRepo: null;
		// console.log(fileRepo);
		if(!fileRepo || !fileRepo.apiToken) {
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Acceso a servidor de archivos no configurado. Favor de contactar al administrador'
			});
		}
		var keyUser = res.locals.user;
		const cv = res.locals.cv;
		if(!keyUser && !cv) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				message: 'No estás autorizado'
			});
		}
		const File = require('../src/files');
		const file = await File.findById(req.params.fileid).catch(e => {
			console.log(e);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Hubo un error al intentar traer el id del archivo'
			});
		});
		if(!file) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'ID de archivo no existe'
			});
		}
		const axios = require('axios');
		// const localFile = await fs.readFileSync(fileRepo.tempDest);
		const apiArg = JSON.stringify(file.sharedLink ? {
			resource: {
				'.tag': 'link',
				url: file.sharedLink
			},
			format: 'jpeg',
			size: 'w256h256',
			mode: 'strict'
		} : {
			resource: {
				'.tag': 'path',
				path: `${file.path}/${file.filename}`
			},
			format: 'jpeg',
			size: 'w256h256',
			mode: 'strict'
		});
		// console.log(apiArg);
		var options = {
			method: 'GET',
			responseType: 'stream',
			url: `${fileRepo.serverContent}/2/files/get_thumbnail_v2`,
			headers: {
				'Authorization': `Bearer ${fileRepo.apiToken}`,
				'Dropbox-API-Select-User': fileRepo.teamMemberId,
				'Dropbox-API-Path-Root': `{".tag":"namespace_id","namespace_id": "${fileRepo.namespaceId}"}`,
				'Dropbox-API-Arg': apiArg
			}
		};
		// console.log(options);
		var errorOcurred = false;
		var response = await axios(options).catch(e => {
			console.log(e.response.data);
			errorOcurred = true;
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Hubo un error en la transferencia del archivo',
				error: e.response.data.error
			});
		});
		if(errorOcurred) return;
		// console.log(response.data);
		if(response && response.data) {
			// const fs = require('fs');
			// const myFile = `${fileRepo.tempDest}/${file._id}-${file.filename}.-thumb.jpg`;
			// await response.data.pipe(fs.createWriteStream(myFile));
			res.set({'Content-Disposition': `attachment; filename="${file.filename}.-thumb.jpg"`,'Content-type':'image/jpeg'});
			// var fileStream = fs.createReadStream(myFile);
			// fileStream.pipe(res);
			// res.download(myFile);
			response.data.pipe(res);
			return;
		} else {
			res.status(StatusCodes.OK).json({
				message: 'No response'
			});
		}
	}, //getThumbnail
};

async function xslt(xml,uuid) {
	// console.log('XSLT');
	const nodeEnv = process.env.NODE_ENV || 'development';
	const fs = require('fs');
	const { spawnSync } = require('child_process');
	const dirApp = process.env.DIR_APP || '/usr/src/app';
	const xsltFile = `${dirApp}/files/cadenaoriginal_TFD_1_1.xslt`;
	const dir = (nodeEnv === 'production') ? '/usr/src/data' : '/tmp';
	const xmlFile = `${dir}/${uuid}`;
	await fs.writeFileSync(xmlFile,xml,'utf-8');
	const xsltproc = await spawnSync('/usr/bin/xsltproc', [xsltFile, xmlFile]);
	const buff = new Buffer.from(xsltproc.stdout);
	await spawnSync('/bin/rm',[xmlFile]);
	const buffString = buff.toString('utf-8');
	// console.log(buffString);
	return buffString;
}
//
// async function createCompany(
// 	name = undefined,
// 	identifier,
// 	freshid = undefined,
// 	type = 'cliente',
// 	headUser = undefined,
// 	primeUser = undefined,
// 	display = undefined,
// 	taxRegime = undefined,
// 	employerRegistration = undefined,
// 	user,
// 	what = 'Creación de empresa'
// ) {
// 	if(!identifier) {
// 		throw new Error('identifier es requerido');
// 	}
// 	if(!user) {
// 		throw new Error('user es requerido');
// 	}
// 	if(!user.roles) {
// 		throw new Error('Usuario no tiene roles');
// 	}
// 	if(!Secure.checkPrivileges(user,[
// 		'isAdmin',
// 		'isTechAdmin',
// 		'isBillAdmin',
// 		'isOperator'
// 	])) {
// 		throw new Error('No tienes privilegios');
// 	}
// 	var company = new Company({
// 		name,
// 		identifier,
// 		freshid,
// 		type,
// 		headUser,
// 		primeUser,
// 		taxRegime,
// 		employerRegistration,
// 		display,
// 	});
// 	company.history = [{
// 		by: user._id,
// 		what
// 	}];
// }
