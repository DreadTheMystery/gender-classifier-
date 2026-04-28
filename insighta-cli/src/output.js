const Table = require("cli-table3");

function printJson(value) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(value, null, 2));
}

function printTable(items, columns) {
  if (!Array.isArray(items) || items.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No records found.");
    return;
  }

  const table = new Table({
    head: columns.map((c) => c.header),
    wordWrap: true,
  });

  items.forEach((item) => {
    table.push(columns.map((c) => item[c.key] ?? ""));
  });

  // eslint-disable-next-line no-console
  console.log(table.toString());
}

function getErrorMessage(error) {
  if (
    error &&
    error.response &&
    error.response.data &&
    error.response.data.message
  ) {
    return error.response.data.message;
  }
  if (error && error.message) return error.message;
  return "Request failed";
}

module.exports = {
  printJson,
  printTable,
  getErrorMessage,
};
