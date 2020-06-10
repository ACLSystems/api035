const StatusCodes = require('http-status-codes');
const Job				= require('../src/jobs');

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
