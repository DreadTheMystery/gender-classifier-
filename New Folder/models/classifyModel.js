const validateNameQuery = (nameQuery) => {
  if (nameQuery === undefined || nameQuery === null) {
    return {
      isValid: false,
      statusCode: 400,
      message: "name query parameter is required",
    };
  }

  if (Array.isArray(nameQuery) || typeof nameQuery !== "string") {
    return {
      isValid: false,
      statusCode: 422,
      message: "name must be a string",
    };
  }

  const normalizedName = nameQuery.trim();

  if (!normalizedName) {
    return {
      isValid: false,
      statusCode: 400,
      message: "name query parameter is required",
    };
  }

  if (/^\d+$/.test(normalizedName)) {
    return {
      isValid: false,
      statusCode: 422,
      message: "name must be a string",
    };
  }

  return {
    isValid: true,
    name: normalizedName,
  };
};

const buildSuccessPayload = (name, prediction) => {
  const sampleSize = prediction.sample_size;

  return {
    name,
    gender: prediction.gender,
    probability: prediction.probability,
    sample_size: sampleSize,
    is_confident: prediction.probability >= 0.7 && sampleSize >= 100,
    processed_at: new Date().toISOString(),
  };
};

module.exports = {
  validateNameQuery,
  buildSuccessPayload,
};
