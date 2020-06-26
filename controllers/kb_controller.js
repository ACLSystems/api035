const StatusCodes = require('http-status-codes');
// const manageError = require('../shared/errorManagement').manageError;
const axios = require('axios');
const redisClient = require('../src/cache');

module.exports = {
	async listPublic(req,res) {
		const getFolderFromFresh = async () => {
			const fresh = ( global && global.config && global.config.fresh ) ? global.config.fresh : null;
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
			if(!fresh.serverUrl || !fresh.usersCategory || !fresh.publicFolder) {
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
				url: fresh.serverUrl + `/solution/categories/${fresh.usersCategory}/folders/${fresh.publicFolder}.json`,
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
		};
		if(redisClient && redisClient.connected) {
			console.log('Estamos conectados al caché...');
			const publicArticles = await redisClient.hget('articles','publicFolder');
			if(publicArticles) {
				return res.status(StatusCodes.OK).json(JSON.parse(publicArticles));
			} else {
				console.log('No hay artículos públicos en caché');
				const folder = await getFolderFromFresh();
				if(folder.error) {
					return res.status(folder.status).json({
						message: folder.message,
						error: folder.error
					});
				}
				redisClient.hset('articles','publicFolder',JSON.stringify(folder));
				redisClient.expire('article',43200);
				return res.status(StatusCodes.OK).json(folder);
			}
		}
	}
};
