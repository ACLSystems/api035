const StatusCodes = require('http-status-codes');
const Service 		= require('../src/services');

module.exports = {

	async create(req,res) {
		const keyUser = res.locals.user;
		if(!keyUser.roles.isAdmin && !keyUser.roles.isTechAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'No tienes privilegios'
			});
		}
		try {
			const service = new Service(req.body);
			service.history = [{
				by: keyUser._id,
				what: 'Creación del servicio'
			}];
			await service.save();
			var serviceSend = service.toObject();
			delete serviceSend.history;
			delete serviceSend.__v;
			return res.status(StatusCodes.CREATED).json(serviceSend);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //create

	async get(req,res) {
		try {
			const service = await Service.findById(req.params.serviceid)
				.select('-history -__v');
			if(!service) {
				return res.status(StatusCodes.OK).json({
					'message': 'No existe servicio'
				});
			}
			if(!service.isActive) {
				return res.status(StatusCodes.OK).json({
					'message': 'Servicio inactivo'
				});
			}
			return res.status(StatusCodes.OK).json(service);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //get

	async list(req,res) {
		const keyUser = res.locals.user;
		if(!keyUser.roles.isAdmin && !keyUser.roles.isTechAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'No tienes authorización'
			});
		}
		try {
			const services = await Service.find({})
				.select('-history -__v');
			if(services.length === 0) {
				return res.status(StatusCodes.OK).json({
					'message': 'No hay servicios que listar'
				});
			}
			return res.status(StatusCodes.OK).json(services);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //list

	async myServices(req,res) {
		const keyUser = res.locals.user;
		if(!keyUser.isActive || !keyUser.isAccountable) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'Tu cuenta está desactivada'
			});
		}
		try {
			var companies = keyUser.companies.filter(com => com.isActive);
			companies = companies.filter(com => com.company.isActive);
			companies = companies.map(com => com.company._id);
			const services = await Service.find({
				$or: [
					{
						companies: {
							$size: 0
						}
					},
					{
						'companies.company': {
							$in: companies
						}
					}
				],
				isActive: true
			})
				.select('-tag -isActive -priority -history -__v');
			if(services.length === 0) {
				return res.status(StatusCodes.OK).json({
					'message': 'No hay servicios'
				});
			}
			res.status(StatusCodes.OK).json(services);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //myServices

	async update(req,res) {
		const keyUser = res.locals.user;
		if(!keyUser.roles.isAdmin && !keyUser.roles.isTechAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'No tienes privilegios'
			});
		}
		var updates = Object.keys(req.body);
		const addToArray = req.body.add || false;
		if(updates.length === 0) {
			return res.status(StatusCodes.OK).json({
				'message': 'No hay nada que modificar'
			});
		}
		updates = updates.filter(item => item !== '_id');
		updates = updates.filter(item => item !== 'history');
		updates = updates.filter(item => item !== 'add');
		const allowedUpdates = [
			'tag',
			'isActive',
			'title',
			'description',
			'image',
			'icon',
			'iconColor',
			'priority',
			'companies'
		];
		const allowedArrayAdditions = [
			'tag',
			'companies'
		];
		const isValidOperation = updates.every(update => allowedUpdates.includes(update));
		const isValidAdditionOperation = updates.every(update => allowedArrayAdditions.includes(update));
		if(!isValidOperation) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Existen datos inválidos o no permitidos en el JSON proporcionado'
			});
		}
		try {
			var service = await Service.findById(req.params.serviceid);
			if(!service) {
				return res.status(StatusCodes.OK).json({
					'message': 'No existe el servicio con el id proporcionado'
				});
			}
			if(addToArray && isValidAdditionOperation) {
				const addUpdates = updates.filter(f => allowedArrayAdditions.includes(f));
				addUpdates.forEach(allowedArray => {
					service[allowedArray].push(req.body[allowedArray]);
					service.history.unshift({
						by: keyUser._id,
						what: `Adición: ${addUpdates.join()}`
					});
					delete req.body[allowedArray];
				});
			}
			service = Object.assign(service,req.body);
			service.history.unshift({
				by: keyUser._id,
				what: `Modificaciones: ${updates.join()}`
			});
			await service.save();
			var serviceToSend = service.toObject();
			delete serviceToSend.password;
			delete serviceToSend.history;
			delete serviceToSend.admin;
			delete serviceToSend.isAccountable;
			delete serviceToSend.roles;
			delete serviceToSend.__v;
			if(serviceToSend.companies && Array.isArray(serviceToSend.companies) && serviceToSend.companies.length > 0) {
				const Company = require('../src/companies');
				var companiesToFind = serviceToSend.companies.map(com => com.company);
				var companies = await Company.find({
					_id:{
						$in: companiesToFind
					}
				}).select('isActive name display identifier');
				companies = companies.map(comp => {
					return {
						isActive: true,
						company: comp
					};
				});
				if(companies.length > 0) {
					serviceToSend.companies = companies;
				}
			}
			res.status(StatusCodes.OK).json(serviceToSend);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //update
};
