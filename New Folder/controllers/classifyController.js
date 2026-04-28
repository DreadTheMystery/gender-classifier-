const { fetchGenderPrediction } = require("../services/genderizeService");
const {
  validateNameQuery,
  buildSuccessPayload,
} = require("../models/classifyModel");

const classifyName = async (req, res) => {
  const validation = validateNameQuery(req.query.name);

  if (!validation.isValid) {
    return res.status(validation.statusCode).json({
      status: "error",
      message: validation.message,
    });
  }

  try {
    const prediction = await fetchGenderPrediction(validation.name);

    if (!prediction.hasPrediction) {
      return res.status(422).json({
        status: "error",
        message: "No prediction available for the provided name",
      });
    }

    return res.status(200).json({
      status: "success",
      data: buildSuccessPayload(validation.name, prediction),
    });
  } catch (error) {
    return res.status(error.statusCode || 502).json({
      status: "error",
      message: error.message || "Failed to fetch data from external API",
    });
  }
};

module.exports = {
  classifyName,
};
