const Privates = require('./privates');

module.exports = {
	// CFDI recibe documento en base64
	nomina12(docString){
		var keys = Object.keys(docString);
		if(keys.includes('nomina12:Nomina')){
			let nomina12 = docString['nomina12:Nomina'];
			let nomina12Obj = {
				version: nomina12['Version'] || undefined,
				tipoNomina: nomina12['TipoNomina'] || undefined,
				fechaPago: nomina12['FechaPago'] ? Privates.createNewDate(nomina12['FechaPago']) : undefined,
				fechaInicialPago: nomina12['FechaInicialPago'] ? Privates.createNewDate(nomina12['FechaInicialPago']) : undefined,
				fechaFinalPago: nomina12['FechaFinalPago'] ? Privates.createNewDate(nomina12['FechaFinalPago']) : undefined,
				numDiasPagados: nomina12['NumDiasPagados'] || undefined,
				totalPercepciones: nomina12['TotalPercepciones'] || undefined,
				totalDeducciones: nomina12['TotalDeducciones'] || undefined,
				totalOtrosPagos: nomina12['TotalOtrosPagos'] || undefined,
				nomina12: true
			};
			if(nomina12['nomina12:Emisor']) {
				let emisor = nomina12['nomina12:Emisor'];
				nomina12Obj.emisor = {
					curp: emisor['Curp'] || undefined,
					registroPatronal: emisor['RegistroPatronal'] || undefined,
					rfcPatronOrigen: emisor['RfcPatronOrigen'] || undefined,
				};
				if(emisor['EntidadSNCF']) {
					let entidadSNCF = emisor['EntidadSNCF'];
					nomina12Obj.emisor.entidadSNCF = {
						origenRecurso: entidadSNCF['OrigenRecurso'] || undefined,
						montoRecursoPropio: entidadSNCF['MontoRecursoPropio'] || undefined
					};
					nomina12Obj.emisor.entidadSNCF = Privates.removeUndefined(nomina12.emisor.entidadSNCF);
					nomina12Obj.emisor.entidadSNCF.valid = Privates.validateRequired(nomina12.emisor.entidadSNCF,[
						'origenRecurso'
					]);
				}
				nomina12Obj.emisor = Privates.removeUndefined(nomina12Obj.emisor);
			}
			if(nomina12['nomina12:Receptor']) {
				let receptor = nomina12['nomina12:Receptor'];
				nomina12Obj.receptor = {
					curp: receptor['Curp'] || undefined,
					numSeguridadSocial: receptor['NumSeguridadSocial'] || undefined,
					fechaInicioRelLaboral: receptor['FechaInicioRelLaboral'] || undefined,
					antiguedad: receptor['Antigüedad'] || undefined,
					tipoContrato: receptor['TipoContrato'] || undefined,
					sindicalizado: receptor['Sindicalizado'] || undefined,
					tipoJornada: receptor['TipoJornada'] || undefined,
					tipoRegimen: receptor['TipoRegimen'] || undefined,
					numEmpleado: receptor['NumEmpleado'] || undefined,
					departamento: receptor['Departamento'] || undefined,
					puesto: receptor['Puesto'] || undefined,
					riesgoPuesto: receptor['RiesgoPuesto'] || undefined,
					periodicidadPago: receptor['PeriodicidadPago'] || undefined,
					banco: receptor['Banco'] || undefined,
					cuentaBancaria: receptor['CuentaBancaria'] || undefined,
					salarioBaseCotApor: receptor['SalarioBaseCotApor'] || undefined,
					salarioDiarioIntegrado: receptor['SalarioDiarioIntegrado'] || undefined,
					claveEntFed: receptor['ClaveEntFed'] || undefined
				};
				if(receptor['nomina12:SubContratacion']) {
					let subContratacion = receptor['nomina12:SubContratacion'];
					nomina12Obj.receptor.subContratacion = {
						rfcLabora: subContratacion['RfcLabora'] || undefined,
						porcentajeTiempo: subContratacion['PorcentajeTiempo'] || undefined
					};
					nomina12Obj.receptor.subContratacion = Privates.removeUndefined(nomina12Obj.receptor.subContratacion);
					nomina12Obj.receptor.subContratacion.valid = Privates.validateRequired(nomina12Obj.receptor.subContratacion,[
						'rfcLabora','porcentajeTiempo'
					]);
				}
				nomina12Obj.receptor = Privates.removeUndefined(nomina12Obj.receptor);
				nomina12Obj.receptor.valid = Privates.validateRequired(nomina12Obj.receptor,[
					'curp','tipoContrato','tipoRegimen','numEmpleado','periodicidadPago','claveEntFed'
				]);
			}
			if(nomina12['nomina12:Percepciones']) {
				let percepciones = nomina12['nomina12:Percepciones'];
				let percepcionesObj = {
					totalSueldos: percepciones['TotalSueldos'] || undefined,
					totalSeparacionIndemnizacion: percepciones['TotalSeparacionIndemnizacion'] || undefined,
					totalJubilacionPensionRetiro: percepciones['TotalJubilacionPensionRetiro'] || undefined,
					totalGravado: percepciones['TotalGravado'] || undefined,
					totalExento: percepciones['TotalExento'] || undefined,
					percepcion: []
				};
				if(percepciones['nomina12:Percepcion']) {
					let percepcionesArray = [];
					if(Array.isArray(percepciones['nomina12:Percepcion'])){
						percepcionesArray = percepciones['nomina12:Percepcion'];
					} else {
						percepcionesArray.push(percepciones['nomina12:Percepcion']);
					}
					for(let perc of percepcionesArray) {
						let percObj = {
							tipoPercepcion: perc['tipoPercepcion'] || undefined,
							clave: perc['Clave'] || undefined,
							concepto: perc['Concepto'] || undefined,
							importeGravado: perc['ImporteGravado'] || undefined,
							importeExento: perc['ImporteExento'] || undefined
						};
						if(perc['AccionesOTitulos']) {
							let accionesOTitulos = perc['AccionesOTitulos'];
							percObj.accionesOTitulos = {
								valorMercado: accionesOTitulos['ValorMercado'] || undefined,
								precioAlOtorgarse: accionesOTitulos['PrecioAlOtorgarse'] || undefined
							};
							percObj.accionesOTitulos = Privates.removeUndefined(percObj.accionesOTitulos);
							percObj.accionesOTitulos.valid = Privates.validateRequired(percObj.accionesOTitulos, [
								'valorMercado', 'precioAlOtorgarse'
							]);
						}
						if(perc['HorasExtras']) {
							let horasExtra = perc['HorasExtra'];
							percObj.horasExtra = {
								dias: horasExtra['Dias'] || undefined,
								tipoHoras: horasExtra['TipoHoras'] || undefined,
								horasExtra: horasExtra['HorasExtra'] || undefined,
								importePagado: horasExtra['ImportePagado'] || undefined
							};
							percObj.horasExtra = Privates.removeUndefined(percObj.horasExtra);
							percObj.horasExtra.valid = Privates.validateRequired(percObj.horasExtra, [
								'dias', 'tipoHoras', 'horasExtra', 'importePagado'
							]);
						}
						percObj = Privates.removeUndefined(percObj);
						percObj.valid = Privates.validateRequired(percObj,[
							'tipoPercepcion','clave','concepto','importeGravado','importeExento'
						]);
						percepcionesObj.percepcion.push(percObj);
					}
				}
				if(percepciones['nomina12:JubilacionPensionRetiro']) {
					let jubilacionPensionRetiro = percepciones['nomina12:JubilacionPensionRetiro'];
					let jubilacionPensionRetiroObj = {
						totalUnaExhibicion: jubilacionPensionRetiro['TotalUnaExhibicion'] || undefined,
						totalParcialidad: jubilacionPensionRetiro['TotalParcialidad'] || undefined,
						montoDiario: jubilacionPensionRetiro['MontoDiario'] || undefined,
						ingresoAcumulable: jubilacionPensionRetiro['IngresoAcumulable'] || undefined,
						ingresoNoAcumulable: jubilacionPensionRetiro['IngresoNoAcumulable'] || undefined
					};
					percepcionesObj.jubilacionPensionRetiro = Privates.removeUndefined(jubilacionPensionRetiroObj);
					percepcionesObj.jubilacionPensionRetiro.valid = Privates.validateRequired(jubilacionPensionRetiroObj,[
						'ingresoAcumulable', 'ingresoNoAcumulable'
					]);
				}
				if(percepciones['nomina12:SeparacionIndemnizacion']) {
					let separacionIndemnizacion = percepciones['nomina12:SeparacionIndemnizacion'];
					let separacionIndemnizacionObj = {
						totalPagado: separacionIndemnizacion['TotalPagado'] || undefined,
						numAniosServicio: separacionIndemnizacion['NumAñosServicio'] || undefined,
						ultimoSueldoMensOrd: separacionIndemnizacion['UltimoSueldoMensOrd'] || undefined,
						ingresoAcumulable: separacionIndemnizacion['IngresoAcumulable'] || undefined,
						ingresoNoAcumulable: separacionIndemnizacion['IngresoNoAcumulable'] || undefined,
					};
					percepcionesObj.separacionIndemnizacion = Privates.removeUndefined(separacionIndemnizacionObj);
					percepcionesObj.separacionIndemnizacion.valid = Privates.validateRequired(separacionIndemnizacionObj,[
						'totalPagado', 'numAniosServicio', 'ultimoSueldoMensOrd', 'ingresoAcumulable', 'ingresoNoAcumulable'
					]);
				}
				nomina12Obj.percepciones = Privates.removeUndefined(percepcionesObj);
				nomina12Obj.percepciones.valid = Privates.validateRequired(percepcionesObj,[
					'totalGravado', 'totalExento'
				]);
			}
			if(nomina12['nomina12:Deducciones']) {
				let deducciones = nomina12['nomina12:Deducciones'];
				let deduccionesObj = {
					totalOtrasDeducciones: deducciones['TotalOtrasDeducciones'] || undefined,
					totalImpuestosRetenidos: deducciones['TotalImpuestosRetenidos'] || undefined,
					deduccion: []
				};
				if(deducciones['nomina12:Deduccion']) {
					let deduccionesArray = [];
					if(Array.isArray(deducciones['nomina12:Deduccion'])){
						deduccionesArray = deducciones['nomina12:Deduccion'];
					} else {
						deduccionesArray.push(deducciones['nomina12:Deduccion']);
					}
					for(let deduc of deduccionesArray) {
						let deducObj = {
							tipoDeduccion: deduc['TipoDeduccion'] || undefined,
							clave: deduc['Clave'] || undefined,
							concepto: deduc['Concepto'] || undefined,
							importe: deduc['Importe'] || undefined
						};
						deducObj = Privates.removeUndefined(deducObj);
						deducObj.valid = Privates.validateRequired(deducObj,[
							'tipoDeduccion', 'clave', 'concepto', 'importe'
						]);
						deduccionesObj.deduccion.push(deducObj);
					}
					nomina12Obj.deducciones = Privates.removeUndefined(deduccionesObj);
					nomina12Obj.deducciones.valid = true;
				}
			}
			if(nomina12['nomina12:OtrosPagos']) {
				let otrosPagos = nomina12['nomina12:OtrosPagos'];
				let otrosPagosObj = {
					otroPago: []
				};
				if(otrosPagos['nomina12:OtroPago']) {
					let otrosPagosArray = [];
					if(Array.isArray(otrosPagos['nomina12:OtroPago'])){
						otrosPagosArray = otrosPagos['nomina12:OtroPago'];
					} else {
						otrosPagosArray.push(otrosPagos['nomina12:OtroPago']);
					}
					for(let otro of otrosPagosArray) {
						let otroObj = {
							tipoOtroPago: otro['TipoOtroPago'] || undefined,
							clave: otro['Clave'] || undefined,
							concepto: otro['Concepto'] || undefined,
							importe: otro['Importe'] || undefined
						};
						if(otro['SubsidioAlEmpleo']) {
							otroObj.subsidioAlEmpleo = {
								subsidioCausado: otro['SubsidioAlEmpleo']['subsidioCausado'] || undefined
							};
							otroObj.subsidioAlEmpleo = Privates.removeUndefined(otroObj.subsidioAlEmpleo);
							otroObj.subsidioAlEmpleo.valid = Privates.validateRequired(otroObj.subsidioAlEmpleo,[
								'subsidioCausado'
							]);
						}
						if(otro['CompensacionSaldosAFavor']) {
							otroObj.compensacionSaldosAFavor = {
								saldoAFavor: otro['CompensacionSaldosAFavor']['saldoAFavor'] || undefined,
								anio: otro['CompensacionSaldosAFavor']['Año'] || undefined,
								remanenteSalFav: otro['CompensacionSaldosAFavor']['RemanenteSalFav'] || undefined
							};
							otroObj.compensacionSaldosAFavor = Privates.removeUndefined(otroObj.compensacionSaldosAFavor);
							otroObj.compensacionSaldosAFavor.valid = Privates.validateRequired(otroObj.compensacionSaldosAFavor,[
								'saldoAFavor','anio','remanenteSalFav'
							]);
						}
						otroObj = Privates.removeUndefined(otroObj);
						otroObj.valid = Privates.validateRequired(otroObj,[
							'tipoDeduccion', 'clave', 'concepto', 'importe'
						]);
						otrosPagosObj.otroPago.push(otroObj);
					}
				}
				nomina12Obj.otrosPagos = Privates.removeUndefined(otrosPagosObj);
				nomina12Obj.otrosPagos.valid = true;
			}
			if(nomina12['nomina12:Incapacidades']) {
				let incapacidad = nomina12['nomina12:Incapacidades'];
				if(incapacidad['nomina12:Incapacidad']) {
					let incapacidadesArray = [];
					let incapacidadesObj = {
						incapacidad: []
					};
					if(Array.isArray(incapacidad['nomina12:Incapacidad'])){
						incapacidadesArray = incapacidad['nomina12:Incapacidad'];
					} else {
						incapacidadesArray.push(incapacidad['nomina12:Incapacidad']);
					}
					for(let inc of incapacidadesArray) {
						let incapacidadObj = {
							diasIncapacidad: inc['DiasIncapacidad'] || undefined,
							tipoIncapacidad: inc['TipoIncapacidad'] || undefined,
							importeMonetario: inc['importeMonetario'] || undefined
						};
						incapacidadObj = Privates.removeUndefined(incapacidadObj);
						incapacidadObj.valida = Privates.validateRequired(incapacidadObj,[
							'diasIncapacidad','tipoIncapacidad'
						]);
						incapacidadesObj.incapacidad.push(incapacidadObj);
					}
					nomina12Obj.incapacidades = incapacidadesObj;
					nomina12Obj.incapacidades.valid = true;
				}
			}
			return {
				nomina12: nomina12Obj
			};
		}
		return {
			nomina12: false
		};
	},//cfdi
};
