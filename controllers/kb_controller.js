const StatusCodes = require('http-status-codes');
// const manageError = require('../shared/errorManagement').manageError;
const axios = require('axios');
const redisClient = require('../src/cache');
const fresh = ( global && global.config && global.config.fresh ) ? global.config.fresh : null;

module.exports = {
	async listPublic(req,res) {
		await getFolder(req,res,'publicFolder',fresh.usersCategory,fresh.publicFolder);
	}, // listPublic

	async listUsers(req,res) {
		await getFolder(req,res,'usersFolder',fresh.usersCategory,fresh.usersFolder);
	}, //listUsers
};

// Private functions

async function getFolder(req,res,subkey,category,folderCat) {
	if(redisClient && redisClient.connected) {
		const key = 'articles';
		const ttl = 43200; // 12 horas
		// console.log('Estamos conectados al caché...');
		// const userArticles = await redisClient.hget('articles','usersFolder');
		const articles = await redisClient.hget(key,subkey);
		if(articles) {
			// console.log('Traemos desde caché... Yes!');
			return res.status(StatusCodes.OK).json(JSON.parse(articles));
		} else {
			// console.log('No hay artículos públicos en caché');
			const folder = await getFolderFromFresh(category, folderCat);
			if(folder.error) {
				return res.status(folder.status).json({
					message: folder.message,
					error: folder.error
				});
			}
			redisClient.hset(key,subkey,JSON.stringify(folder));
			redisClient.expire(key,ttl);
			return res.status(StatusCodes.OK).json(folder);
		}
	}
}

async function getFolderFromFresh(category,folder){
	// console.log(fresh);
	if(!fresh) {
		console.log('No... no hay configuración para conectarnos con fresh y sacar artículos públicos');
		// return res.status(StatusCodes.NOT_IMPLEMENTED).json({
		// 	'message': 'El servidor no tiene la configuración para cargar artículos de conocimiento'
		// });
		return {
			message: 'El servidor no tiene la configuración para cargar artículos de conocimiento desde Fresh',
			error: 'Error de configuración',
			status: StatusCodes.NOT_IMPLEMENTED
		};
	}
	if(!fresh.serverUrl || !category || !folder) {
		console.log('No... no hay configuración de fresh para artículos públicos');
		// return res.status(StatusCodes.NOT_IMPLEMENTED).json({
		// 	'message': 'El servidor no tiene la configuración para cargar artículos de conocimiento públicos'
		// });
		return {
			message: 'El servidor no tiene la configuración para cargar artículos de conocimiento públicos',
			error: 'Error de configuración',
			status: StatusCodes.NOT_IMPLEMENTED
		};
	}
	const auth = new Buffer.from(fresh.apiKey + ':X');
	var options = {
		method: 'get',
		url: fresh.serverUrl + `/solution/categories/${category}/folders/${folder}.json`,
		headers: {
			'Authorization': 'Basic ' + auth.toString('base64')
		}
	};
	const response = await axios(options).catch(error => {
		console.log(error);
		return {
			message: 'Hubo un error en la comunicación con Fresh',
			error: error.response.data,
			status: StatusCodes.INTERNAL_SERVER_ERROR
		};
		// res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		// 	message: 'Hubo un error en la comunicación con Fresh',
		// 	error: error.response.data
		// });
	});
	if(response && response.data) {
		return response.data.folder;
	}
}
