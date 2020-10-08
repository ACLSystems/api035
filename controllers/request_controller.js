const StatusCodes = require('http-status-codes');
const Request 		= require('../src/freshRequests');
const manageError = require('../shared/errorManagement').manageError;

module.exports = {

	async createServiceRequest(req,res) {
		const keyUser = res.locals.user;
		if(keyUser.person && keyUser.person.email) {
			const fresh = ( global && global.config && global.config.fresh ) ? global.config.fresh : null;
			if(!fresh) {
				console.log('No... no hay configuración de fresh');
				return res.status(StatusCodes.NOT_IMPLEMENTED).json({
					'message': 'El servidor no tiene la configuración para realizar peticiones'
				});
			}
			const auth = new Buffer.from(fresh.apiKey + ':X');
			var options = {
				method: req.body.method,
				url: fresh.serverUrl + req.body.api,
				headers: {
					'Authorization': 'Basic ' + auth.toString('base64')
				}
			};
			if(req.body.method === 'post') {
				options.data = req.body.data;
			}
			const axios = require('axios');
			var response = await axios(options).catch(error => {
				console.log(error.response.data);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					message: 'Hubo un error en la comunicación con Fresh',
					error: error.response.data
				});
			});
			// console.log(response.data);
			if(response && response.data) {
				if( response.data.service_request) {
					const sr = response.data.service_request;
					// console.log('Service Request');
					// console.log(sr);
					var request = new Request({
						requester: keyUser._id,
						freshid: +sr.id,
						freshSchema: 'service_request',
						data: response.data,
						freshStatus: translateStatus(sr.status),
						dates: [ new Date ],
						responses: [response.status]
					});
					// console.log(request);
					await request.save();
				}
				return res.status(StatusCodes.OK).json(response.data);
			}
		} else {
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: `Usuario ${keyUser.identifier} no tiene correo configurado`
			});
		}
	}, //createServiceRequest

	async approveVacations(req,res) {
		// const keyUser = res.locals.user;
		console.log(req.body);
		const User = require('../src/users');
		var user = await User
			.findOne({'person.email':req.body.email})
			.catch(error => {
				console.log(error);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					message: 'Error al tratar de encontrar al usuario'
				});
			});
		if(!user) {
			return res.status(StatusCodes.NOT_FOUND).json({
				message: 'Usuario no se encuentra'
			});
		}
		for(let i=0;i<user.companies.length;i++) {
			let vIndex = user.companies[i].vacationHistory.findIndex(vac => vac.freshid === req.body.freshid);
			console.log(vIndex);
			if(vIndex > -1) {
				user.companies[i].vacationHistory[vIndex].approved = req.body.approve;
				user.companies[i].vacationHistory[vIndex].approvedBy = req.body.approvedBy;
				user.companies[i].vacationHistory[vIndex].approvalComments = req.body.approvalComments; 
			}
		}
		await user.save().catch(error => {
			manageError(res,error,'Error al intentar guardar al  usuario');
			return;
		});
		res.status(StatusCodes.OK).json({
			message: 'Status guardado'
		});
	}, //approveVacations

	async updateFresh(req,res) {
		// const keyUser = res.locals.user;
		if(req.body.freshdesk_webhook) {
			const freshwh = Object.assign({},req.body.freshdesk_webhook);
			const [tt,ticketid] = freshwh.ticket_id.split('-');
			var request = await Request.findOne({freshid:+ticketid})
				.catch(e => {
					console.log(e);
					return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						message: 'Hubo un error en la actualización'
					});
				});
			if(!request) {
				return res.status(StatusCodes.NOT_FOUND).json({
					message: 'No se localizó'
				});
			}
			// if(freshwh.ticket_latest_public_comment) {
			// 	if(!request.comments || request.comments.length === 0) {
			// 		request.comments = [freshwh.ticket_latest_public_comment];
			// 	}
			// 	if(request.comments && request.comments.length > 0 && request.comments[0] !== freshwh.ticket_latest_public_comment){
			// 		request.comments.unshift(freshwh.ticket_latest_public_comment);
			// 	}
			// }
			request.groupName = freshwh.ticket_group_name ? freshwh.ticket_group_name : undefined;
			request.agentName = freshwh.ticket_agent_name ? freshwh.ticket_agent_name : undefined;
			request.freshStatus = translateStatus(freshwh.ticket_status);
		}
		await request.save();
		res.status(StatusCodes.OK).json({
			message: 'ticket actualizado'
		});
	}, //update

	async listMyRequests(req,res) {
		const keyUser = res.locals.user;
		var query = {requester: keyUser._id, freshStatus: {$ne:'Cerrado'}};
		if(req.query.status && req.query.status === 'all') {
			delete query.freshStatus;
		}
		const requests = await Request.find(query)
			.populate('comments.user','person')
			.populate('agent','person')
			.catch(error => {
				console.log('Error: '+error.response.status);
				console.log(error.response.data);
				return res.status(StatusCodes.BAD_REQUEST).json({
					message: 'Hubo un error al intentar localizar las solicitudes. Intente más tarde'
				});
			});
		return res.status(StatusCodes.OK).json(requests);
	}, //listMyRequests

	async refreshTicket(req,res) {
		const request = await Request.findOne({freshid:req.params.ticketid}).catch(error => {
			console.log('refreshTicket Error:');
			console.log(error);
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: 'Hubo un error al intentar localizar las solicitudes. Intente más tarde'
			});
		});
		// console.log(request);
		const fresh = ( global && global.config && global.config.fresh ) ? global.config.fresh : null;
		if(!fresh) {
			console.log('No... no hay configuración de fresh');
			return res.status(StatusCodes.NOT_IMPLEMENTED).json({
				'message': 'El servidor no tiene la configuración para realizar peticiones'
			});
		}
		const auth = new Buffer.from(fresh.apiKey + ':X');
		var options = {
			method: 'GET',
			url: fresh.serverUrl + '/api/v2/tickets/' + req.params.ticketid + '?include=conversations',
			headers: {
				'Authorization': 'Basic ' + auth.toString('base64')
			}
		};
		const axios = require('axios');
		var response = await axios(options).catch(error => {
			console.log(error.response.data);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Hubo un error en la comunicación con Fresh',
				error: error.response.data
			});
		});
		if(response && response.data && response.data.ticket) {
			const ticket = response.data.ticket;
			// res.status(StatusCodes.OK).json(ticket.status);
			// return;
			// Status
			request.freshStatus = translateStatus(ticket.status);
			request.approvalStatus = translateApprovalStatus(ticket.approval_status);
			var agent = null;
			if(ticket.responder_id) {
				agent = await getUserByFreshID(ticket.responder_id);
				request.agent = agent._id;
			}
			// conversations
			if(ticket.conversations && ticket.conversations.length > 0) {
				request.comments = [];
				for(let i=0; i < ticket.conversations.length; i++) {
					const conversation = ticket.conversations[i];
					if(!conversation.private) {
						const responder = await getUserByFreshID(conversation.user_id);
						if(responder) {
							request.comments.unshift({
								body: conversation.body,
								body_text: conversation.body_text,
								created: new Date(conversation.created_at),
								user: responder._id,
								id: conversation.id
							});
						}
					}
				}
			}
			await request.save().catch(error => {
				console.log(error);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					message: 'Hubo un error al guardar la solicitud',
					error: error
				});
			});
			res.status(StatusCodes.OK).json({
				message: 'Ticket actualizado'
			});
		} else {
			res.status(StatusCodes.OK).json({
				message: 'Nada que actualizar'
			});
		}
	}, // refreshTicket

	async reply(req,res) {
		const keyUser = res.locals.user;
		if(!keyUser.freshid) {
			return res.status(StatusCodes.NOT_ACCEPTABLE).json({
				message: 'No tienes configurado una cuenta de correo y/o una cuenta de fresh'
			});
		}
		const fresh = ( global && global.config && global.config.fresh ) ? global.config.fresh : null;
		if(!fresh) {
			console.log('No... no hay configuración de fresh');
			return res.status(StatusCodes.NOT_IMPLEMENTED).json({
				'message': 'El servidor no tiene la configuración para realizar peticiones'
			});
		}
		const auth = new Buffer.from(fresh.apiKey + ':X');
		const data = req.body.cc_emails ? {
			body: req.body.body,
			user_id: +keyUser.freshid,
			cc_emails: req.body.cc_emails
		} : {
			body: req.body.body,
			user_id: +keyUser.freshid
		};
		var options = {
			method: 'POST',
			url: fresh.serverUrl + '/api/v2/tickets/' + req.params.ticketid + '/reply',
			headers: {
				'Authorization': 'Basic ' + auth.toString('base64')
			},
			data
		};
		const axios = require('axios');
		var response = await axios(options).catch(error => {
			console.log(error.response.data);
			return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				message: 'Hubo un error en la comunicación con Fresh',
				error: error.response.data
			});
		});
		if(response.data && response.data.conversation) {
			return res.status(StatusCodes.OK).json({
				message: 'Respuesta añadida'
			});
		}
		res.status(StatusCodes.OK).json(response.data);
	}, // reply

};

function translateStatus(status) {
	if(isNaN(status)) status = 2;
	const statuses = [
		'','',
		'Abierto',
		'Pendiente',
		'Resuelto',
		'Cerrado',
		'En espera de autorización'
	];
	return statuses[status];
}

function translateApprovalStatus(status) {
	if(isNaN(status)) status = 3;
	const statuses = [
		'Pendiente',
		'Aprobado',
		'Rechazado',
		'Sin aprobación'
	];
	return statuses[status];
}

async function getUserByFreshID(freshid) {
	const Users = require('../src/users');
	const user = Users.findOne({freshid})
		.select('_id')
		.lean()
		.catch(error => {
			console.log('refreshTicket Error:');
			console.log(error);
			return null;
		});
	if(!user) return null;
	return user;
}
