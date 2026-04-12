const { fetchGenderPrediction } = require('../services/genderizeService');
const {
	validateNameQuery,
	buildSuccessPayload,
} = require('../models/classifyModel');

module.exports = async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');

	if (req.method !== 'GET') {
		res.statusCode = 405;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify({ status: 'error', message: 'Method not allowed' }));
		return;
	}

	const validation = validateNameQuery(req.query.name);

	if (!validation.isValid) {
		res.statusCode = validation.statusCode;
		res.setHeader('Content-Type', 'application/json');
		res.end(
			JSON.stringify({ status: 'error', message: validation.message })
		);
		return;
	}

	try {
		const prediction = await fetchGenderPrediction(validation.name);

		if (!prediction.hasPrediction) {
			res.statusCode = 422;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					status: 'error',
					message: 'No prediction available for the provided name',
				})
			);
			return;
		}

		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		res.end(
			JSON.stringify({
				status: 'success',
				data: buildSuccessPayload(validation.name, prediction),
			})
		);
	} catch (error) {
		res.statusCode = error.statusCode || 502;
		res.setHeader('Content-Type', 'application/json');
		res.end(
			JSON.stringify({
				status: 'error',
				message: error.message || 'Failed to fetch data from external API',
			})
		);
	}
};
