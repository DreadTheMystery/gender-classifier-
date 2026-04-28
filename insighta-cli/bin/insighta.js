#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { Command } = require("commander");
const oraImport = require("ora");
const { loginCli } = require("../src/oauth");
const { request, apiRequest } = require("../src/http");
const {
  readCredentials,
  clearCredentials,
  CREDENTIALS_PATH,
} = require("../src/storage");
const { printJson, printTable, getErrorMessage } = require("../src/output");

const ora = oraImport.default || oraImport;

const program = new Command();

program.name("insighta").description("Insighta Labs CLI").version("1.0.0");

program
  .command("login")
  .description("Login via GitHub OAuth (PKCE)")
  .action(async () => {
    const spinner = ora("Opening browser for GitHub login...").start();

    try {
      const user = await loginCli();
      spinner.succeed(`Logged in as @${user.username}`);
      // eslint-disable-next-line no-console
      console.log(`Credentials saved to ${CREDENTIALS_PATH}`);
    } catch (error) {
      spinner.fail(getErrorMessage(error));
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Logout and clear local credentials")
  .action(async () => {
    const creds = readCredentials();

    try {
      if (creds && creds.refresh_token) {
        await request({
          method: "post",
          path: "/auth/logout",
          data: { refresh_token: creds.refresh_token },
          spinnerText: "Logging out...",
        });
      }
    } catch (_error) {
      // ignore remote logout failure and clear local credentials
    }

    clearCredentials();
    // eslint-disable-next-line no-console
    console.log("Logged out.");
  });

program
  .command("whoami")
  .description("Show current authenticated user")
  .action(async () => {
    try {
      const response = await request({
        method: "get",
        path: "/auth/whoami",
        spinnerText: "Fetching user...",
      });

      printJson(response.data.data || response.data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(getErrorMessage(error));
      process.exit(1);
    }
  });

const profiles = program.command("profiles").description("Profiles operations");

profiles
  .command("list")
  .option("--gender <gender>")
  .option("--country <countryId>")
  .option("--age-group <ageGroup>")
  .option("--min-age <minAge>")
  .option("--max-age <maxAge>")
  .option("--sort-by <sortBy>")
  .option("--order <order>")
  .option("--page <page>", "page", "1")
  .option("--limit <limit>", "limit", "10")
  .description("List profiles")
  .action(async (opts) => {
    const params = {
      page: opts.page,
      limit: opts.limit,
    };

    if (opts.gender) params.gender = opts.gender;
    if (opts.country) params.country_id = opts.country;
    if (opts.ageGroup) params.age_group = opts.ageGroup;
    if (opts.minAge) params.min_age = opts.minAge;
    if (opts.maxAge) params.max_age = opts.maxAge;
    if (opts.sortBy) params.sort_by = opts.sortBy;
    if (opts.order) params.order = opts.order;

    try {
      const response = await apiRequest({
        method: "get",
        path: "/api/profiles",
        params,
        spinnerText: "Loading profiles...",
      });

      const payload = response.data;
      // eslint-disable-next-line no-console
      console.log(
        `Page ${payload.page}/${payload.total_pages} | total=${payload.total} | limit=${payload.limit}`,
      );
      printTable(payload.data, [
        { header: "ID", key: "id" },
        { header: "Name", key: "name" },
        { header: "Gender", key: "gender" },
        { header: "Age", key: "age" },
        { header: "Age Group", key: "age_group" },
        { header: "Country", key: "country_id" },
      ]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(getErrorMessage(error));
      process.exit(1);
    }
  });

profiles
  .command("get")
  .description("Get profile by id")
  .argument("<id>")
  .action(async (id) => {
    try {
      const response = await apiRequest({
        method: "get",
        path: `/api/profiles/${id}`,
        spinnerText: "Fetching profile...",
      });

      printJson(response.data.data || response.data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(getErrorMessage(error));
      process.exit(1);
    }
  });

profiles
  .command("search")
  .description("Search profiles with natural language")
  .argument("<query>")
  .option("--page <page>", "page", "1")
  .option("--limit <limit>", "limit", "10")
  .action(async (query, opts) => {
    try {
      const response = await apiRequest({
        method: "get",
        path: "/api/profiles/search",
        params: {
          q: query,
          page: opts.page,
          limit: opts.limit,
        },
        spinnerText: "Searching profiles...",
      });

      const payload = response.data;
      // eslint-disable-next-line no-console
      console.log(
        `Page ${payload.page}/${payload.total_pages} | total=${payload.total} | limit=${payload.limit}`,
      );
      printTable(payload.data, [
        { header: "ID", key: "id" },
        { header: "Name", key: "name" },
        { header: "Gender", key: "gender" },
        { header: "Age", key: "age" },
        { header: "Country", key: "country_id" },
      ]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(getErrorMessage(error));
      process.exit(1);
    }
  });

profiles
  .command("create")
  .description("Create profile (admin only)")
  .requiredOption("--name <name>")
  .action(async (opts) => {
    try {
      const response = await apiRequest({
        method: "post",
        path: "/api/profiles",
        data: { name: opts.name },
        spinnerText: "Creating profile...",
      });

      printJson(response.data.data || response.data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(getErrorMessage(error));
      process.exit(1);
    }
  });

profiles
  .command("export")
  .description("Export profiles to CSV")
  .requiredOption("--format <format>")
  .option("--gender <gender>")
  .option("--country <countryId>")
  .option("--age-group <ageGroup>")
  .option("--min-age <minAge>")
  .option("--max-age <maxAge>")
  .option("--sort-by <sortBy>")
  .option("--order <order>")
  .action(async (opts) => {
    if (opts.format.toLowerCase() !== "csv") {
      // eslint-disable-next-line no-console
      console.error("Only csv export is supported");
      process.exit(1);
    }

    const params = { format: "csv" };
    if (opts.gender) params.gender = opts.gender;
    if (opts.country) params.country_id = opts.country;
    if (opts.ageGroup) params.age_group = opts.ageGroup;
    if (opts.minAge) params.min_age = opts.minAge;
    if (opts.maxAge) params.max_age = opts.maxAge;
    if (opts.sortBy) params.sort_by = opts.sortBy;
    if (opts.order) params.order = opts.order;

    try {
      const response = await apiRequest({
        method: "get",
        path: "/api/profiles/export",
        params,
        responseType: "text",
        spinnerText: "Exporting CSV...",
      });

      const filename = `profiles_${Date.now()}.csv`;
      const destination = path.join(process.cwd(), filename);
      fs.writeFileSync(destination, response.data, "utf8");

      // eslint-disable-next-line no-console
      console.log(`Saved CSV to ${destination}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(getErrorMessage(error));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
