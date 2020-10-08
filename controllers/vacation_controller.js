const StatusCodes = require('http-status-codes');
const Rule 				= require('../src/vacationRules');
const User 				= require('../src/users');
const WeedDay			= require('../src/workDays');
const manageError = require('../shared/errorManagement').manageError;

module.exports = {

	async createRule(req,res) {
		const keyUser = res.locals.user;
		const {isAdmin, isTechAdmin} = keyUser.roles;
		if(!isAdmin && !isTechAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		var rule = new Rule(req.body);
		rule.history = [{
			by: keyUser._id,
			what: 'Regla creada'
		}];
		await rule.save()
			.catch(error => {
				manageError(res,error,'Error al intentar guardar la regla');
				return;
			});
		var ruleSend = rule.toObject();
		delete ruleSend.history;
		delete ruleSend.__v;
		res.status(StatusCodes.OK).json(ruleSend);
	}, //createRule

	async createWD(req,res) {
		const keyUser = res.locals.user;
		const {isAdmin, isTechAdmin, isOperator, isSupervisor} = keyUser.roles;
		if(!isAdmin && !isTechAdmin && !isOperator && !isSupervisor) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		var weekday = new WeedDay(Object.assign({},req.body));
		if(weekday.specialDates.length > 0) {
			weekday.specialDates.map(sp => new Date(
				sp.getFullYear(),
				sp.getMonth(),
				sp.getDate(),
				12,0,0
			));
		}
		await weekday.save().catch(error => {
			manageError(res,error,'Error al intentar guardar la definición');
			return;
		});
		res.status(StatusCodes.OK).json({
			message: 'Días guardados'
		});
	}, //createWD

	async listRules(req,res) {
		const keyUser = res.locals.user;
		const {isAdmin, isTechAdmin} = keyUser.roles;
		if(!isAdmin && !isTechAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		const rules = await Rule.find()
			.select('-__v -history')
			.sort({year: -1})
			.catch(error => {
				manageError(res,error,'Error al intentar extraer las reglas');
				return;
			});
		res.status(StatusCodes.OK).json(rules);
	}, //listRules

	async removeRule(req,res) {
		const keyUser = res.locals.user;
		const {isAdmin, isTechAdmin} = keyUser.roles;
		if(!isAdmin && !isTechAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No tienes privilegios'
			});
		}
		const rule = await Rule.deleteOne({_id: req.params.ruleid})
			.catch(error => {
				manageError(res,error,'Error al intentar eliminar la regla');
				return;
			});
		if(rule.deletedCount) {
			res.status(StatusCodes.OK).json({
				message: 'Regla eliminada'
			});
		} else {
			res.status(StatusCodes.NOT_FOUND).json({
				message: 'Regla no encontrada'
			});
		}

	}, //removeRule

	async createVacation(req,res) {
		const keyUser = res.locals.user;
		var identifier = keyUser.identifier;
		const {
			isAdmin,
			isTechAdmin,
			isRequester,
			isSupervisor,
			isOperator
		} = keyUser.roles;
		if(req.body.identifier) {
			if(isAdmin || isTechAdmin || isRequester || isSupervisor || isOperator) {
				identifier = req.body.identifier;
			}
		}
		var user = await User.findOne({identifier})
			.catch(error => {
				manageError(res,error,'Error al intentar encontrar usuario');
				return;
			});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Usuario ${identifier} no se encuentra`
			});
		}
		if(!req.body.skipFresh && (!user.person || !user.person.email)) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: `El usuario con identificador ${user.identifier} no tiene correo definido`
			});
		}
		const company = user.companies.findIndex(comp => comp.company + '' === req.body.company + '');
		if(company === -1) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: `Empresa con identificador ${req.body.company} para ${user.identifier} no se encuentra`
			});
		}
		///////// comunicación con Fresh
		var freshid;
		if(!req.body.skipFresh) {
			const fresh = (global && global.config && global.config.fresh) ? global.config.fresh : null;
			if(!fresh) {
				console.log('No... no hay configuración de Fresh');
				return res.status(StatusCodes.NOT_IMPLEMENTED).json({
					message: 'El servidor no tiene la configuración para realizar peticiones'
				});
			}
			const auth = new Buffer.from(fresh.apiKey + ':X');
			var options = {
				method: 'post',
				url: fresh.serverUrl + req.body.api,
				headers: {
					'Authorization': 'Basic ' + auth.toString('base64')
				},
				data: {
					quantity: 1,
					email: user.person.email,
					custom_fields: {
						desde: new Date(req.body.vacation.beginDate),
						hasta: new Date(req.body.vacation.endDate),
						justificacion: req.body.vacation.justify
					}
				}
			};
			const axios = require('axios');
			var response = await axios(options)
				.catch(error => {
					console.log(error.response.data);
					return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						message: 'Hubo un error en la comunicación con Fresh',
						error: error.response.data
					});
				});
			if(response && response.data) {
				if(response.data.service_request) {
					const sr = response.data.service_request;
					req.body.vacation.freshid = +sr.id;
					freshid = sr.id;
				}
			}
		}
		/////////
		if(req.body.beginDate) {
			if(isAdmin || isTechAdmin || isRequester || isSupervisor || isOperator) user.companies[company].beginDate = req.body.beginDate;
		}
		//// Revisar si el periodo de vacaciones no "choca" con un periodo anterior
		if(req.body.vacation) {
			var crossDates = false;
			const vacationHistory = user.companies[company].vacationHistory;
			vacationHistory.forEach(vac => {
				if(crossTimespan(
					new Date(vac.beginDate),
					new Date(vac.endDate),
					new Date(req.body.vacation.beginDate),
					new Date(req.body.vacation.endDate)
				)) {
					crossDates = true;
				}
			});
			if(crossDates) {
				return res.status(StatusCodes.NOT_ACCEPTABLE).json({
					message: 'Las fechas ingresadas chocan con fechas que ya están en el historial de vacaciones'
				});
			}
			user.companies[company].vacationHistory.push(Object.assign({},req.body.vacation));
		}
		await user.save().catch(error => {
			manageError(res,error,'Error al intentar guardar al  usuario');
			return;
		});
		var responseToSend = {
			message: 'Vacaciones cargadas'
		};
		if(freshid) responseToSend.freshid = freshid;
		res.status(StatusCodes.OK).json(responseToSend);
	}, //createVacation

};

function crossTimespan(x,y,a,b) {
	if(Math.min(x,y) <= Math.max(a,b) && Math.max(x,y) >= Math.min(a,b)) {
		return true;
	} else {
		return false;
	}
}
