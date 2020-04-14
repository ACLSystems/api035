const StatusCodes = require('http-status-codes');
const Publicity = require('../src/marketing');
const mongoose = require('mongoose');

module.exports = {

	async create(req,res) {
		const keyUser = res.locals.user;
		if(!validatePrivs(keyUser.roles)) return res.status(StatusCodes.UNAUTHORIZED).json({
			'message': 'No tienes privilegios'
		});
		if(req.body.beginDate){
			req.body.beginDate = onlyDate(req.body.beginDate);
		}
		if(req.body.endDate){
			req.body.endDate = onlyDate(req.body.endDate);
		}
		if(!req.body.beginDate) {
			req.body.beginDate = onlyDate(new Date());
		}
		if(!req.body.endDate) {
			req.body.endDate = onlyDate(addDays(new Date(),1));
		}
		if(req.body.companies && Array.isArray(req.body.companies) && req.body.companies.length > 0) {
			req.body.companies = req.body.companies.map(comp => {
				return {
					isActive: true,
					company: comp
				};
			});
			// console.log(req.body.companies);
		}
		try {
			const publicity = new Publicity(req.body);
			publicity.history = [{
				by: keyUser._id,
				what: 'Creación de publicidad'
			}];
			await publicity.save();
			delete publicity.history;
			res.status(StatusCodes.OK).json({
				'message': 'Anuncio creado'
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //create

	async read(req,res) {
		const keyUser = res.locals.user;
		if(!validatePrivs(keyUser.roles)) return res.status(StatusCodes.UNAUTHORIZED).json({
			'message': 'No tienes privilegios'
		});
		try {
			const publicity = await Publicity.findById(req.params.publicityid).select('-history');
			if(!publicity) return res.status(StatusCodes.OK).json({
				'message': 'No existe la publicidad solicitada'
			});
			return res.status(StatusCodes.OK).json(publicity);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //read

	async list(req,res) {
		const keyUser = res.locals.user;
		if(!validatePrivs(keyUser.roles)) return res.status(StatusCodes.UNAUTHORIZED).json({
			'message': 'No tienes privilegios'
		});
		var query = req.query || {};
		if(query.text) {
			query.text = {
				'$regex': query.text,
				'$options': 'i'
			};
		}
		if(query.nocompanies) {
			query.companies = { $size: 0 };
			delete query.nocompanies;
		}
		if(query.withcompanies) {
			query['companies.0'] = {$exists: 1} ;
			delete query.withcompanies;
		}
		try {
			const publicity = await Publicity.find(query).select('-history -__v');
			if(publicity.length === 0) return res.status(StatusCodes.OK).json({
				'message': 'No existe publicidad con los criterios proporcionados'
			});
			return res.status(StatusCodes.OK).json(publicity);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //read


	async update(req,res) {
		const keyUser = res.locals.user;
		if(!validatePrivs(keyUser.roles)) return res.status(StatusCodes.UNAUTHORIZED).json({
			'message': 'No tienes privilegios'
		});
		var updates = Object.keys(req.body);
		const addToArray = req.body.add || false;
		if(updates.length === 0) {
			return res.status(StatusCodes.OK).json({
				'message': 'No hay nada que modificar'
			});
		}
		if(req.body.beginDate) {
			req.body.beginDate = onlyDate(req.body.beginDate);
		}
		if(req.body.endDate) {
			req.body.endDate = onlyDate(req.body.endDate);
		}
		updates = updates.filter(item => item !== '_id');
		updates = updates.filter(item => item !== 'history');
		updates = updates.filter(item => item !== 'add');
		const allowedUpdates = [
			'isActive',
			'beginDate',
			'endDate',
			'image',
			'tag',
			'text',
			'companies',
			'priority'
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
			var publicity = await Publicity.findById(req.params.publicityid);
			if(!publicity) {
				return res.status(StatusCodes.OK).json({
					'message': 'No existe la publicidad solicitada'
				});
			}
			if(addToArray && isValidAdditionOperation) {
				const addUpdates = updates.filter(f => allowedArrayAdditions.includes(f));
				addUpdates.forEach(allowedArray => {
					publicity[allowedArray].push(req.body[allowedArray]);
					publicity.history.unshift({
						by: keyUser._id,
						what: `Adición: ${addUpdates.join()}`
					});
					delete req.body[allowedArray];
				});
			}
			publicity = Object.assign(publicity,req.body);

			publicity.history.unshift({
				by: keyUser._id,
				what: `Modificaciones: ${updates.join()}`
			});
			await publicity.save();
			var toSend = publicity.toObject();
			delete toSend.history;
			delete toSend.__v;
			return res.status(StatusCodes.OK).json(publicity);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	},

	async myPublicity(req,res) {
		const keyUser = res.locals.user;
		const now = new Date();
		var companies = keyUser.companies;
		companies = companies.filter(comp => comp.isActive);
		companies = companies.map(comp => mongoose.Types.ObjectId(comp.company._id));
		var query = {
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
			isActive: true,
			beginDate: {
				$lte: now
			},
			endDate: {
				$gt: now
			}
		};
		try {
			const publicity = await Publicity.find(query).select('text image priority').sort({priority: -1});
			return res.status(StatusCodes.OK).json(publicity);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e.message
			});
		}
	}, //myPublicity
	// async now(req,res) {
	//
	// }

};

function validatePrivs(roles) {
	if(roles && (
		roles.isAdmin ||
		roles.isTechAdmin ||
		roles.isBillAdmin ||
		roles.isOperator
	)) return true;
	return false;
}

function onlyDate(date) {
	let tempDate = (typeof date === 'string') ? new Date(date) : date;
	const year = tempDate.getFullYear();
	const month = tempDate.getMonth() + 1;
	const day = tempDate.getDate();
	return new Date(`${year}-${month}-${day}`);
}

function addDays(date, days) {
	const copy = new Date(Number(date));
	copy.setDate(date.getDate() + days);
	return copy;
}
