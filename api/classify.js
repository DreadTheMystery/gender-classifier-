const { fetchGenderPrediction } = require("../services/genderizeService");
const {
  validateNameQuery,
  buildSuccessPayload,
} = require("../models/classifyModel");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "error", message: "Method not allowed" }));
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const nameParams = url.searchParams.getAll("name");

  let incomingName;
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, "name")) {
    incomingName = req.query.name;
  } else if (nameParams.length > 1) {
    incomingName = nameParams;
  } else {
    incomingName = nameParams[0];
  }

  const validation = validateNameQuery(incomingName);

  if (!validation.isValid) {
    res.statusCode = validation.statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "error", message: validation.message }));
    return;
  }

  try {
    const prediction = await fetchGenderPrediction(validation.name);

    if (!prediction.hasPrediction) {
      res.statusCode = 422;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "error",
          message: "No prediction available for the provided name",
        }),
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "success",
        data: buildSuccessPayload(validation.name, prediction),
      }),
    );
  } catch (error) {
    res.statusCode = error.statusCode || 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "error",
        message: error.message || "Failed to fetch data from external API",
      }),
    );
  }
};
