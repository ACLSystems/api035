const StatusCodes = require('http-status-codes');
const Request = require('../src/freshRequests');

module.exports = {

	async createServiceRequest(req,res) {
		const keyUser = res.locals.user;
		if(keyUser.person && keyUser.person.email) {
			const axios = require('axios');
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

	async updateFresh(req,res) {
		const keyUser = res.locals.user;
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
			if(freshwh.ticket_latest_public_comment) {
				if(!request.comments || request.comments.length === 0) {
					request.comments = [freshwh.ticket_latest_public_comment];
				}
				if(request.comments && request.comments.length > 0 && request.comments[0] !== freshwh.ticket_latest_public_comment){
					request.comments.unshift(freshwh.ticket_latest_public_comment);
				}
			}
			request.groupName = freshwh.ticket_group_name ? freshwh.ticket_group_name : undefined;
			request.agentName = freshwh.ticket_agent_name ? freshwh.ticket_agent_name : undefined;
			request.freshStatus = freshwh.ticket_status ? freshwh.ticket_status : undefined;
		}
		await request.save();
		res.status(StatusCodes.OK).json({
			message: 'ticket actualizado'
		});
	}, //update

	async listMyRequests(req,res) {
		const keyUser = res.locals.user;
		var query = {requester: keyUser._id};
		req.query.status = req.query.status || 'open';
		const requests = await Request.find(query).catch(error => {
			console.log('Error: '+error.response.status);
			console.log(error.response.data);
			return res.status(StatusCodes.BAD_REQUEST).json({
				message: 'Hubo un error al intentar localizar las solicitudes. Intente más tarde'
			});
		});
		return res.status(StatusCodes.OK).json(requests);
	}, //listMyRequests

};
