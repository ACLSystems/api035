const Privates = require('./privates');
const Nomina	 = require('./nomina');

module.exports = {
	// CFDI recibe documento en base64
	cfdi(docString){
		var keys = Object.keys(docString);
		if(keys.includes('cfdi:Comprobante')){
			const comprobante = docString['cfdi:Comprobante'];
			// Añadimos las propiedades requeridas y validamos su existencia
			var cfdi = {
				version : comprobante['Version'] || undefined,
				fecha : comprobante['Fecha'] ? new Date(comprobante['Fecha']) : undefined,
				sello : comprobante['Sello'] || undefined,
				lugarExpedicion : comprobante['LugarExpedicion'] || undefined,
				noCertificado : comprobante['NoCertificado'] || undefined,
				certificado : comprobante['Certificado'] || undefined,
				subTotal : comprobante['SubTotal'] || undefined,
				moneda : comprobante['Moneda'] || undefined,
				total : comprobante['Total'] || undefined,
				tipoDeComprobante: comprobante['TipoDeComprobante'] || undefined,
				serie: comprobante['Serie'] || undefined,
				folio: comprobante['Folio'] || undefined,
				formaPago: comprobante['FormaPago'] || undefined,
				condicionesDePago: comprobante['CondicionesDePago'] || undefined,
				descuento: comprobante['Descuento'] || undefined,
				tipoCambio: comprobante['TipoCambio'] || undefined,
				metodoPago: comprobante['MetodoPago'] || undefined,
				confirmacion: comprobante['Confirmacion'] || undefined,
				cfdi:true
			};
			// Parte del emisor
			if(comprobante['cfdi:Emisor']) {
				let emisor = comprobante['cfdi:Emisor'];
				cfdi.emisor = {
					rfc: emisor['Rfc'] || undefined,
					nombre: emisor['Nombre'] || undefined,
					regimenFiscal: emisor['RegimenFiscal'] || undefined
				};
				cfdi.emisor = Privates.removeUndefined(cfdi.emisor);
				cfdi.emisor.valid = Privates.validateRequired(cfdi.emisor,[
					'rfc', 'regimenFiscal'
				]);
			}
			// parte del Receptor
			if(comprobante['cfdi:Receptor']) {
				let receptor = comprobante['cfdi:Receptor'];
				cfdi.receptor = {
					rfc: receptor['Rfc'] || undefined,
					nombre: receptor['Nombre'] || undefined,
					numRegIdTrib: receptor['NumRegIdTrib'] || undefined,
					residenciaFiscal: receptor['ResidenciaFiscal'] || undefined,
					usoCFDI: receptor['UsoCFDI'] || undefined
				};
				cfdi.receptor = Privates.removeUndefined(cfdi.receptor);
				cfdi.receptor.valid = Privates.validateRequired(cfdi.receptor,[
					'rfc','usoCFDI'
				]);
			}
			// Parte de conceptos
			if(comprobante['cfdi:Conceptos']) {
				var conceptos = comprobante['cfdi:Conceptos'];
				cfdi.conceptos = [];
				// checar si no es un arreglo y convertirlo a arreglo
				if(Array.isArray(conceptos)) {
					conceptos = conceptos['cfdi:Concepto'];
				} else {
					conceptos = [conceptos['cfdi:Concepto']];
				}
				for(let concepto of conceptos) {
					let conceptoObj = {
						claveProdServ: concepto['ClaveProdServ'] || undefined,
						noIdentificacion: concepto['NoIdentificacion'] || undefined,
						cantidad: concepto['Cantidad'] || undefined,
						claveUnidad: concepto['ClaveUnidad'] || undefined,
						unidad: concepto['Unidad'] || undefined,
						descripcion: concepto['Descripcion'] || undefined,
						valorUnitario: concepto['ValorUnitario'] || undefined,
						importe: concepto['Importe'] || undefined,
						descuento: concepto['Descuento'] || undefined,
					};
					if(concepto['cfdi:Impuestos']) {
						var impuestos = concepto['cfdi:Impuestos'];
						// traslados
						if(impuestos['cfdi:Traslados']) {
							var traslados;
							if(Array.isArray(traslados)) {
								traslados = impuestos['cfdi:Traslados'];
							} else {
								traslados = [impuestos['cfdi:Traslados']];
							}
						}
						conceptoObj.impuestos.traslados = [];
						for(let traslado of traslados) {
							let trasladoObj = {
								base: traslado['Base'] || undefined,
								impuesto: traslado['Impuesto'] || undefined,
								tipoFactor: traslado['TipoFactor'] || undefined,
								tasaOCuota: traslado['TasaOCuota'] || undefined,
								importe: traslado['Importe'] || undefined
							};
							trasladoObj = Privates.removeUndefined(trasladoObj);
							trasladoObj.valid = Privates.validateRequired(trasladoObj,[
								'base', 'impuesto', 'tipoFactor'
							]);
							conceptoObj.impuestos.traslados.push(trasladoObj);
						}
						// retenciones
						if(impuestos['cfdi:Retenciones']) {
							var retenciones;
							if(Array.isArray(traslados)) {
								retenciones = impuestos['cfdi:Retenciones'];
							} else {
								retenciones = [impuestos['cfdi:Retenciones']];
							}
						}
						conceptoObj.impuestos.retenciones = [];
						for(let retencion of retenciones) {
							let retencionObj = {
								base: retencion['Base'] || undefined,
								impuesto: retencion['Impuesto'] || undefined,
								tipoFactor: retencion['TipoFactor'] || undefined,
								tasaOCuota: retencion['TasaOCuota'] || undefined,
								importe: retencion['Importe'] || undefined
							};
							retencionObj = Privates.removeUndefined(retencionObj);
							retencionObj.valid = Privates.validateRequired(retencionObj,[
								'base', 'impuesto', 'tipoFactor','TasaOCuota','Importe'
							]);
							conceptoObj.impuestos.retenciones.push(retencionObj);
						}
					}
					conceptoObj = Privates.removeUndefined(conceptoObj);
					conceptoObj.valid = Privates.validateRequired(conceptoObj,[
						'ClaveProdServ', 'Cantidad', 'ClaveUnidad', 'Descripcion', 'ValorUnitario', 'Importe'
					]);
					cfdi.conceptos.push(conceptoObj);
				}
			}
			// Parte de la resumen de Impuestos
			if(comprobante['cfdi:Impuestos']) {
				impuestos = comprobante['cfdi:Impuestos'];
				cfdi.impuestos = {
					totalImpuestosTrasladados: impuestos['TotalImpuestosTrasladados'] || undefined,
					totalImpuestosRetenidos: impuestos['TotalImpuestosRetenidos'] || undefined
				};
				if(impuestos['cfdi:Traslados']) {
					cfdi.impuestos.traslados = [];
					if(Array.isArray(impuestos['cfdi:Traslados'])) {
						traslados = impuestos['cfdi:Traslados'];
					} else {
						traslados = [impuestos['cfdi:Traslados']];
					}
					for(let traslado of traslados) {
						let trasladoObj = {
							impuesto: traslado['Impuesto'] || undefined,
							tipoFactor: traslado['TipoFactor'] || undefined,
							tasaOCuota: traslado['TasaOCuota'] || undefined,
							importe: traslado['Importe'] || undefined
						};
						trasladoObj = Privates.removeUndefined(trasladoObj);
						trasladoObj.valid = Privates.validateRequired(trasladoObj,[
							'impuesto','tipoFactor','tasaOCuota','importe'
						]);
						cfdi.impuestos.traslados.push(trasladoObj);
					}
				}
				if(impuestos['cfdi:Retenciones']) {
					cfdi.impuestos.retenciones = [];
					if(Array.isArray(impuestos['cfdi:Retenciones'])) {
						retenciones = impuestos['cfdi:Retenciones'];
					} else {
						retenciones = [impuestos['cfdi:Retenciones']];
					}
					for(let retencion of retenciones) {
						let retencionObj = {
							impuesto: retencion['Impuesto'] || undefined,
							importe: retencion['Importe'] || undefined
						};
						retencionObj = Privates.removeUndefined(retencionObj);
						retencionObj.valid = Privates.validateRequired(retencionObj,[
							'impuesto','importe'
						]);
						cfdi.impuestos.retenciones.push(retencionObj);
					}
				}
			}
			// Parte de Complemento
			if(comprobante['cfdi:Complemento']) {
				let complemento = comprobante['cfdi:Complemento'];
				// Nómina v1.2
				cfdi.complemento = {};
				if(complemento['nomina12:Nomina']) {
					cfdi.complemento = Nomina.nomina12(complemento);
					cfdi.complemento.valid = true;
				}
			}
			cfdi = Privates.removeUndefined(cfdi);
			cfdi.valid = Privates.validateRequired(cfdi,[
				'version','fecha','sello','noCertificado','certificado','subTotal','moneda','total','tipoDeComprobante','lugarExpedicion','emisor','receptor','conceptos'
			]);
			return cfdi;
		}
		return {
			cfdi: false
		};
	},//cfdi
};
