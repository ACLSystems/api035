const StatusCodes = require('http-status-codes');
const TaxRegime = require('../src/taxRegimes');

module.exports = {

	async create(req,res) {
		const keyUser = res.locals.user;
		if(!keyUser.roles.isAdmin && !keyUser.roles.isTechAdmin && !keyUser.roles.isBillAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'No tienes privilegios'
			});
		}
		try {
			const taxRegime = new TaxRegime(req.body);
			taxRegime.history = [{
				by: keyUser._id,
				what: 'Creación del registro'
			}];
			await taxRegime.save();
			var regimeToSend = taxRegime.toObject();
			delete regimeToSend.history;
			delete regimeToSend.__v;
			return res.status(StatusCodes.OK).json({
				'message': 'Régimen creado',
				'regime': regimeToSend
			});
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //create

	async list(req,res) {
		try {
			const regimes = TaxRegime.find({})
				.select('-history -__v');
			if(regimes.length === 0) {
				return res.status(StatusCodes.OK).json({
					'message': 'No hay registros'
				});
			}
			return res.status(StatusCodes.OK).json(regimes);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //list

	async get(req,res) {
		try {
			const regime = TaxRegime.findById(req.params.regimeid)
				.select('-history -__v');
			if(!regime) {
				return res.status(StatusCodes.OK).json({
					'message': 'No existe registro'
				});
			}
			return res.status(StatusCodes.OK).json(regime);
		} catch (e) {
			console.log(e);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //get

	async update(req,res) {
		const keyUser = res.locals.user;
		if(!keyUser.roles.isAdmin && !keyUser.roles.isTechAdmin && !keyUser.roles.isBillAdmin) {
			return res.status(StatusCodes.UNAUTHORIZED).json({
				'message': 'No tienes privilegios'
			});
		}
		var updates = Object.keys(req.body);
		if(updates.length === 0) {
			return res.status(StatusCodes.OK).json({
				'message': 'No hay nada que modificar'
			});
		}
		updates = updates.filter(item => item !== '_id');
		updates = updates.filter(item => item !== 'history');
		const allowedUpdates = [
			'version',
			'revision',
			'taxRegime',
			'description',
			'applyToCompanies',
			'applyToUsers',
			'beginDate',
			'endDate'
		];

		const isValidOperation = updates.every(update => allowedUpdates.includes(update));
		if(!isValidOperation) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Existen datos inválidos o no permitidos en el JSON proporcionado'
			});
		}
		try {
			var regime = await TaxRegime.findById(req.params.regimeid);
			if(!regime) {
				return res.status(StatusCodes.OK).json({
					'message': 'No existe el registro con el id proporcionado'
				});
			}
			regime = Object.assign(regime,req.body);
			regime.history.unshift({
				by: keyUser._id,
				what: `Modificaciones: ${updates.join()}`
			});
			await regime.save();
			var regimeToSend = regime.toObject();
			delete regimeToSend.password;
			delete regimeToSend.history;
			delete regimeToSend.admin;
			delete regimeToSend.isAccountable;
			delete regimeToSend.roles;
			delete regimeToSend.__v;
			res.status(StatusCodes.OK).json(regimeToSend);
		} catch (e) {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				'message': 'Error del servidor. Favor de comunicarse con la mesa de servicio',
				error: e
			});
		}
	}, //update

};
