const StatusCodes = require('http-status-codes');
const Company 		= require('../src/companies');

module.exports = {
	async create(req,res) {
		const keyUser = res.locals.user;
		try {
			const companyFound = await Company.findOne({$or:[{name: req.body.name},{identifier:req.body.identifier}]})
				.select('-history')
				.populate([{
					path: 'headUser',
					select: ('identifier person isActive isAccountable')
				},{
					path: 'primeUser',
					select: ('identifier person isActive isAccountable')
				}]);
			if(companyFound) {
				res.status(StatusCodes.OK).json({
					'message': 'Empresa ya existe',
					'company': companyFound
				});
				return;
			}
			const company = new Company(req.body);
			company.history = [{
				by: keyUser._id,
				what: 'Creación de la empresa'
			}];
			await company.save();
			res.status(StatusCodes.CREATED).json(company);
		} catch (e) {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //create

	async read(req,res) {
		const keyUser = res.locals.user;
		const isOperator = keyUser.roles.isOperator;
		const isSupervisor = keyUser.roles.isSupervisor;
		if(isSupervisor && !isOperator) {
			if(!Array.isArray(keyUser.companies) && keyUser.companies.length === 0){
				res.status(StatusCodes.OK).json({
					'message': 'No se tienen empresas asignadas'
				});
				return;
			}
			const company = keyUser.companies.find(com => com.company._id + '' === req.params.companyid + '');
			if(company) {
				res.status(StatusCodes.OK).json(company);
				return;
			} else {
				res.status(StatusCodes.FORBIDDEN).json({
					'message': 'No hay empresa con el id especificado o no se tiene permiso para acceder a ella'
				});
				return;
			}
		}
		if(isOperator) {
			const company = keyUser.companies.find(com => com.company._id + '' === req.params.companyid + '');
			if(company) {
				// console.log('desde el keyUser');
				res.status(StatusCodes.OK).json(company);
			} else {
				try {
					const findCompany = await Company.findById(company)
						.select('-history')
						.lean();
					if(findCompany) {
						res.status(StatusCodes.OK).json(findCompany);
						return;
					}
					res.status(StatusCodes.OK).json({
						'message': 'No hay empresa con el id especificado'
					});
				} catch (e) {
					res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
						'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
						error: e
					});
				}
			}
		}
	}, //read
	async search(req,res) {
		var query = req.query;
		const page = query.page ? +query.page : 0;
		const perPage = query.perPage ? +query.perPage: 10;
		const keys = Object.keys(query);
		if(keys.includes('name')) {
			query.name = {
				'$regex': query.name,
				'$options': 'i'
			};
		}
		if(keys.includes('display')) {
			query.display = {
				'$regex': query.display,
				'$options': 'i'
			};
		}
		if(keys.includes('general')) {
			query = {
				$or: [{
					name: {
						'$regex': query.general,
						'$options': 'i'
					}
				},{
					display: {
						'$regex': query.general,
						'$options': 'i'
					}
				},{
					identifier: {
						'$regex': query.general,
						'$options': 'i'
					}
				}]
			};
		}
		try {
			// console.log(query);
			const companies = await Company.find(query)
				.select('-history')
				.limit(perPage)
				.skip(perPage * page)
				.sort({identifier: 'asc'})
				.lean();
			if(companies && companies.length > 0) {
				res.status(StatusCodes.OK).json(companies);
				return;
			} else {
				res.status(StatusCodes.OK).json({
					'message': 'No existen empresas con ese criterio de búsqueda'
				});
				return;
			}
		} catch (e) {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //search

	async update(req,res) {
		const keyUser = res.locals.user;
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
			'name',
			'identifier',
			'type',
			'isActive',
			'headUser',
			'primeUser',
			'display',
			'alias',
			'phone',
			'addresses'
		];
		const allowedArrayAdditions = [
			'alias',
			'phone',
			'addresses'
		];
		const isValidOperation = updates.every(update => allowedUpdates.includes(update));
		const isValidAdditionOperation = updates.every(update => allowedArrayAdditions.includes(update));
		if(!isValidOperation) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Existen datos inválidos o no permitidos en el JSON proporcionado'
			});
		}
		try {
			var company = await Company.findById(req.params.companyid);
			if(!company) {
				return res.status(StatusCodes.OK).json({
					'message': 'No se existe empresa con el id proporcionado'
				});
			}
			if(addToArray && isValidAdditionOperation) {
				const addUpdates = updates.filter(f => allowedArrayAdditions.includes(f));
				addUpdates.forEach(allowedArray => {
					company[allowedArray].push(req.body[allowedArray]);
					company.history.unshift({
						by: keyUser._id,
						what: `Adición: ${addUpdates.join()}`
					});
					delete req.body[allowedArray];
				});
			}
			company = Object.assign(company,req.body);
			company.history.unshift({
				by: keyUser._id,
				what: `Modificaciones: ${updates.join()}`
			});
			await company.save();
			var companyToSend = company.toObject();
			delete companyToSend.history;
			delete companyToSend.__v;
			if(companyToSend.addresses && Array.isArray(companyToSend.addresses) && companyToSend.addresses.length === 0) {
				companyToSend.addresses = 'Empresa no tiene direcciones asociadas';
			}
			res.status(StatusCodes.OK).json(companyToSend);
		} catch (e) {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //update
};
