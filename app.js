const express = require("express");
const cors = require("cors");
const classifyRoutes = require("./routes/classifyRoutes");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api", classifyRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Gender classification API is running",
  });
});


app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
