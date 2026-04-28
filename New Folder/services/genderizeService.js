const https = require("https");

const fetchGenderPrediction = (name) =>
  new Promise((resolve, reject) => {
    const requestUrl = new URL("https://api.genderize.io");
    requestUrl.searchParams.set("name", name);

    const request = https.get(requestUrl, { family: 4 }, (response) => {
      let body = "";

      response.setEncoding("utf8");

      response.on("data", (chunk) => {
        body += chunk;
      });

      response.on("end", () => {
        if (response.statusCode !== 200) {
          const externalError = new Error(
            "Failed to fetch data from external API",
          );
          externalError.statusCode = 502;
          reject(externalError);
          return;
        }

        try {
          const data = JSON.parse(body || "{}");

          if (data.gender === null || data.count === 0) {
            resolve({
              hasPrediction: false,
            });
            return;
          }

          resolve({
            hasPrediction: true,
            gender: data.gender,
            probability: data.probability,
            sample_size: data.count,
          });
        } catch (error) {
          const externalError = new Error(
            "Failed to fetch data from external API",
          );
          externalError.statusCode = 502;
          reject(externalError);
        }
      });
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error("Request timed out"));
    });

    request.on("error", () => {
      const externalError = new Error("Failed to fetch data from external API");
      externalError.statusCode = 502;
      reject(externalError);
    });
  });

module.exports = {
  fetchGenderPrediction,
};
