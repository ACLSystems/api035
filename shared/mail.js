const Mail 		= require('../src/mails');

module.exports = {
	async sendMail(toEmail,toName,userid,subject,message) {
		const emailConfig = (global.config && global.config.mail) ? global.config.mail : null;
		if(!emailConfig) {
			return null;
		}
		const genericTemplate = emailConfig.genericTemplate || null;
		if(!genericTemplate) {
			return null;
		}
		if(emailConfig && emailConfig .templateErrorDeliver && (!emailConfig .templateErrorReportingName || !emailConfig .templateErrorReportingEmail)) {
			return null;
		}
		const mailMessage = {
			'To': [{
				'Email': toEmail,
				'Name': toName
			}],
			'TemplateID': genericTemplate,
			'TemplateLanguage': true,
			'Subject': subject,
			'TemplateErrorDeliver': true,
			'TemplateErrorReporting': {
				'Email': emailConfig.templateErrorReportingEmail,
				'Name': emailConfig.templateErrorReportingName
			},
			'Variables': {
				'message': message,
				'name': toName,
				'subject': subject
			}
		};
		var mail = null;
		if(emailConfig.saveEmail) {
			mail = new Mail({
				subject,
				receiverEmail: toEmail,
				receiver: userid
			});
		}
		const mailjet = require('node-mailjet').connect(
			emailConfig.apiKeyPublic, emailConfig.apiKeyPrivate
		);
		const request = mailjet.post('send', {
			'version': 'v3.1'
		});
		try {
			const response = await request.request({
				'Messages': [mailMessage]
			});
			// console.log(response.body);
			if(mail) {
				if(response && response.body && response.body.Messages && response.body.Messages.length > 0) {
					let status = response.body.Messages[0].Status || null;
					let To = response.body.Messages[0].To || null;
					// console.log(status);
					// console.log(To);
					mail.status = status;
					mail.messageID = (To && To.length > 0 && To[0].MessageID ) ? To[0].MessageID : undefined;
					mail.messageHref = (To && To.length > 0 && To[0].MessageHref) ? To[0].MessageHref : undefined;
				}
				await mail.save();
			}
			return true;
		} catch (e) {
			// console.log('OOOOpss... hubo un error <--- jeje... eso queríamos');
			// console.log(e.response.body);
			if(mail) {
				if(e.response && e.response.body && e.response.body.Messages && e.response.body.Messages.length > 0) {
					let status = e.response.body.Messages[0].Status || null;
					let errors = e.response.body.Messages[0].Errors || null;
					mail.status = status;
					if(errors && errors.length > 0) {
						mail.emailErrors = [...errors];
					}
				}
				await mail.save();
			} else {
				// console.log(e.response.body);
			}
			return false;
		}
	},

	// async retrieveMail() {
	//
	// }
};
