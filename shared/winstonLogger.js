const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const logger = winston.createLogger();
logger.configure({
	transports: [
		new DailyRotateFile({
			filename: './logs/api-%DATE%.log',
			datePattern: 'YYYY-MMM-DD',
			prepend: true,
			localTime: true
		})
	]
});

module.exports = logger;
