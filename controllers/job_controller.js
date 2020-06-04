const StatusCodes = require('http-status-codes');
const Job				= require('../src/jobs');

module.exports = {
	async create(req,res) {
		const keyUser = res.locals.user;
		var job = await Job.findOne({name:capitalize(req.body.name),category: capitalize(req.body.category)})
			.catch(e => {
				console.log(e);
				return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
					'message': 'Error al intentar localizar el puesto'
				});
			});
		if(job) {
			return res.status(StatusCodes.OK).json({
				message: `Puesto con nombre ${job.name} y categoría ${job.category} ya había sido creado anteriormente`
			});
		}
		job = new Job({
			name:capitalize(req.body.name),
			category: req.body.category,
			history: [{
				by: keyUser._id,
				what: 'Creación de puesto'
			}]
		});
		await job.save();
		res.status(StatusCodes.OK).json(job);
	}, //create

	async list(req,res) {
		const query = req.query.category || {};
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
