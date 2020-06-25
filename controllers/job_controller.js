const StatusCodes = require('http-status-codes');
const Job				= require('../src/jobs');
const manageError = require('../shared/errorManagement').manageError;

module.exports = {
	async create(req,res) {
		const keyUser = res.locals.user;
		var job = await Job.findOne({name:capitalize(req.body.name),area: capitalize(req.body.area),place: req.body.place})
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al intentar localizar el puesto'
				});
			});
		if(job) {
			return res.status(StatusCodes.OK).json({
				message: `Puesto con nombre ${job.name} y departamento ${job.area} y lugar de trabajo ${job.place} ya había sido creado anteriormente`
			});
		}
		job = new Job({
			name:capitalize(req.body.name).trim(),
			area: req.body.area.trim(),
			place: req.body.place.trim(),
			functions: req.body.functions || '',
			history: [{
				by: keyUser._id,
				what: 'Creación de puesto'
			}]
		});
		await job.save();
		res.status(StatusCodes.CREATED).json(job);
	}, //create

	async list(req,res) {
		var query = {};
		if(req.query.area) {
			query.area = req.query.area;
		}
		if(req.query.place) {
			query.place = req.query.place;
		}
		// console.log(query);
		const jobs = await Job.find(query)
			.select('-history -__v')
			.lean()
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al intentar listar los puestos'
				});
			});
		res.status(StatusCodes.OK).json(jobs);
	}, //create

	async update(req,res) {
		const keyUser = res.locals.user;
		const {
			isOperator,
			isTechAdmin,
			isAdmin,
			isBillAdmin
		} = keyUser.roles;
		if(!isOperator && !isAdmin && !isTechAdmin && !isBillAdmin) {
			return res.status(StatusCodes.FORBIDDEN).json({
				message: 'No estás autorizado a realizar esta operación'
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
			'name',
			'area',
			'place',
			'functions'
		];
		const allowedArrayAdditions = [
			'functions'
		];
		const isValidOperation = updates.every(update => allowedUpdates.includes(update));
		const isValidAdditionOperation = updates.every(update => allowedArrayAdditions.includes(update));
		if(!isValidOperation) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				'message': 'Existen datos inválidos o no permitidos en el JSON proporcionado'
			});
		}
		var job = await Job.findById(req.params.jobid)
			.catch(error => manageError(res,error,'Buscando job'));
		if(!job) {
			return res.status(StatusCodes.OK).json({
				'message': 'No existe el job con el id proporcionado'
			});
		}
		if(addToArray && isValidAdditionOperation) {
			const addUpdates = updates.filter(f => allowedArrayAdditions.includes(f));
			addUpdates.forEach(allowedArray => {
				job[allowedArray].push(req.body[allowedArray]);
				job.history.unshift({
					by: keyUser._id,
					what: `Adición: ${addUpdates.join()}`
				});
				delete req.body[allowedArray];
			});
		}
		job = Object.assign(job,req.body);
		job.history.unshift({
			by: keyUser._id,
			what: `Modificaciones: ${updates.join()}`
		});
		await job.save()
			.catch(error => manageError(res,error,'Guardando job'));
		var jobToSend = job.toObject();
		delete jobToSend.history;
		delete jobToSend.__v;
		return res.status(StatusCodes.OK).json(jobToSend);
	}, // update
};

function capitalize(phrase) {
	if(typeof phrase !== 'string') {
		return phrase;
	}
	var words = phrase.toLowerCase().split(' ');
	var returnWords = '';

	for(var i=0;i<words.length;i++) {
		if(i > 0 && words.length > 1) {
			returnWords = returnWords + ' ';
		}
		returnWords = returnWords + words[i].charAt(0).toUpperCase() + words[i].slice(1);
	}
	return returnWords;

}
