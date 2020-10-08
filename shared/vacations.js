const Rule = require('../src/vacationRules');

module.exports = {
	async vacations(company) {
		const now = new Date();
		const years = Math.floor((now.getTime() - company.beginDate.getTime()) / 31536000000); // 1000 / 60 / 60 / 24 / 365
		var query = {
			$or: [
				{company:company.company._id},
				{company:{$exists: false}}
			],
			active: true,
			year: {$gte: years}
		};
		const rules = await Rule.find(query)
			.sort({year: 1,company:-1})
			.catch(error => {
				console.log(error);
				return;
			});
		if(rules.length) {
			// console.log(rules);
			const rule = rules[0];
			// console.log('---Corrida--------');
			// console.log(rule);
			return {
				years,
				days: rule.days
			};
		}
	} //vacations
};
