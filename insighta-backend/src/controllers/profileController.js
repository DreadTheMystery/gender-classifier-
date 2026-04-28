const { generateUuidV7 } = require("../utils/uuid");
const {
  findByName,
  findById,
  createProfile,
  listProfiles,
  exportProfiles,
  deleteProfile,
} = require("../models/profileModel");
const { fetchProfileData } = require("../services/externalApisService");
const { parseNaturalLanguageQuery } = require("../services/queryParser");

const ALLOWED_LIST_QUERY_KEYS = new Set([
  "gender",
  "age_group",
  "country_id",
  "min_age",
  "max_age",
  "min_gender_probability",
  "min_country_probability",
  "sort_by",
  "order",
  "page",
  "limit",
]);

function buildPaginationLinks(req, page, limit, totalPages) {
  const params = new URLSearchParams();

  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (key === "page" || key === "limit") return;
    params.set(key, String(value));
  });

  const createLink = (targetPage) => {
    const localParams = new URLSearchParams(params);
    localParams.set("page", String(targetPage));
    localParams.set("limit", String(limit));
    return `${req.path}?${localParams.toString()}`;
  };

  return {
    self: createLink(page),
    next: page < totalPages ? createLink(page + 1) : null,
    prev: page > 1 ? createLink(page - 1) : null,
  };
}

function invalidQueryParamsError() {
  return {
    statusCode: 422,
    body: {
      status: "error",
      message: "Invalid query parameters",
    },
  };
}

function parsePositiveInteger(value) {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(String(value))) return null;
  return Number(value);
}

function parseFloatValue(value) {
  if (value === undefined) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function parseAndValidatePagination(query) {
  const parsedPage = parsePositiveInteger(query.page);
  const parsedLimit = parsePositiveInteger(query.limit);

  if (parsedPage === null || parsedLimit === null) {
    return invalidQueryParamsError();
  }

  const page = parsedPage || 1;
  const limit = parsedLimit || 10;

  if (page < 1 || limit < 1 || limit > 50) {
    return invalidQueryParamsError();
  }

  return {
    page,
    limit,
  };
}

function parseAndValidateListQuery(query) {
  const queryKeys = Object.keys(query || {});
  if (queryKeys.some((key) => !ALLOWED_LIST_QUERY_KEYS.has(key))) {
    return invalidQueryParamsError();
  }

  const filters = {};
  const options = parseAndValidatePagination(query);
  if (options.statusCode) return options;

  if (query.gender !== undefined) {
    const gender = String(query.gender).trim().toLowerCase();
    if (!gender || !["male", "female"].includes(gender)) {
      return invalidQueryParamsError();
    }
    filters.gender = gender;
  }

  if (query.age_group !== undefined) {
    const ageGroup = String(query.age_group).trim().toLowerCase();
    if (
      !ageGroup ||
      !["child", "teenager", "adult", "senior"].includes(ageGroup)
    ) {
      return invalidQueryParamsError();
    }
    filters.age_group = ageGroup;
  }

  if (query.country_id !== undefined) {
    const countryId = String(query.country_id).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryId)) {
      return invalidQueryParamsError();
    }
    filters.country_id = countryId;
  }

  const minAge = parsePositiveInteger(query.min_age);
  const maxAge = parsePositiveInteger(query.max_age);
  if (minAge === null || maxAge === null) return invalidQueryParamsError();
  if (minAge !== undefined) filters.min_age = minAge;
  if (maxAge !== undefined) filters.max_age = maxAge;

  const minGenderProbability = parseFloatValue(query.min_gender_probability);
  if (minGenderProbability === null) return invalidQueryParamsError();
  if (minGenderProbability !== undefined) {
    if (minGenderProbability < 0 || minGenderProbability > 1) {
      return invalidQueryParamsError();
    }
    filters.min_gender_probability = minGenderProbability;
  }

  const minCountryProbability = parseFloatValue(query.min_country_probability);
  if (minCountryProbability === null) return invalidQueryParamsError();
  if (minCountryProbability !== undefined) {
    if (minCountryProbability < 0 || minCountryProbability > 1) {
      return invalidQueryParamsError();
    }
    filters.min_country_probability = minCountryProbability;
  }

  if (
    filters.min_age !== undefined &&
    filters.max_age !== undefined &&
    filters.min_age > filters.max_age
  ) {
    return invalidQueryParamsError();
  }

  const sortBy =
    query.sort_by !== undefined ? String(query.sort_by).trim() : "created_at";
  if (!["age", "created_at", "gender_probability"].includes(sortBy)) {
    return invalidQueryParamsError();
  }

  const order =
    query.order !== undefined
      ? String(query.order).trim().toLowerCase()
      : "asc";
  if (!["asc", "desc"].includes(order)) {
    return invalidQueryParamsError();
  }

  return {
    filters,
    options: {
      ...options,
      sort_by: sortBy,
      order,
    },
  };
}

function validateNameInput(name) {
  if (name === undefined || name === null || name === "") {
    return {
      isValid: false,
      statusCode: 400,
      message: "Missing or empty name",
    };
  }

  if (typeof name !== "string") {
    return {
      isValid: false,
      statusCode: 422,
      message: "Invalid type for name",
    };
  }

  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Missing or empty name",
    };
  }

  return {
    isValid: true,
    name: trimmed,
  };
}

async function createProfileHandler(req, res) {
  const validation = validateNameInput(req.body && req.body.name);

  if (!validation.isValid) {
    return res.status(validation.statusCode).json({
      status: "error",
      message: validation.message,
    });
  }

  const name = validation.name;

  try {
    const existing = await findByName(name);
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: existing,
      });
    }

    const data = await fetchProfileData(name);

    const id = generateUuidV7();
    const profile = await createProfile(id, name, data);

    return res.status(201).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("createProfileHandler error FULL:", error);

    if (error.statusCode === 502) {
      return res.status(502).json({
        status: "error",
        message: error.message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

async function getSingleProfileHandler(req, res) {
  try {
    const { id } = req.params;
    const profile = await findById(id);

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

async function getAllProfilesHandler(req, res) {
  const parsed = parseAndValidateListQuery(req.query || {});
  if (parsed.statusCode) {
    return res.status(parsed.statusCode).json(parsed.body);
  }

  try {
    const result = await listProfiles(parsed.filters, parsed.options);

    return res.status(200).json({
      status: "success",
      page: parsed.options.page,
      limit: parsed.options.limit,
      total: result.total,
      total_pages: Math.max(1, Math.ceil(result.total / parsed.options.limit)),
      links: buildPaginationLinks(
        req,
        parsed.options.page,
        parsed.options.limit,
        Math.max(1, Math.ceil(result.total / parsed.options.limit)),
      ),
      data: result.data,
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

async function searchProfilesHandler(req, res) {
  const queryText = req.query && req.query.q;
  if (
    queryText === undefined ||
    queryText === null ||
    !String(queryText).trim()
  ) {
    return res.status(400).json({
      status: "error",
      message: "Missing or empty parameter",
    });
  }

  const pagination = parseAndValidatePagination(req.query || {});
  if (pagination.statusCode) {
    return res.status(pagination.statusCode).json(pagination.body);
  }

  const filters = parseNaturalLanguageQuery(String(queryText));
  if (!filters) {
    return res.status(400).json({
      status: "error",
      message: "Unable to interpret query",
    });
  }

  try {
    const result = await listProfiles(filters, {
      page: pagination.page,
      limit: pagination.limit,
      sort_by: "created_at",
      order: "asc",
    });

    return res.status(200).json({
      status: "success",
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      total_pages: Math.max(1, Math.ceil(result.total / pagination.limit)),
      links: buildPaginationLinks(
        req,
        pagination.page,
        pagination.limit,
        Math.max(1, Math.ceil(result.total / pagination.limit)),
      ),
      data: result.data,
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

async function exportProfilesHandler(req, res) {
  const format = String((req.query && req.query.format) || "").toLowerCase();

  if (format !== "csv") {
    return res.status(422).json({
      status: "error",
      message: "Invalid query parameters",
    });
  }

  const parsed = parseAndValidateListQuery(req.query || {});
  if (parsed.statusCode) {
    return res.status(parsed.statusCode).json(parsed.body);
  }

  try {
    const data = await exportProfiles(parsed.filters, {
      sort_by: parsed.options.sort_by,
      order: parsed.options.order,
    });

    const headers = [
      "id",
      "name",
      "gender",
      "gender_probability",
      "age",
      "age_group",
      "country_id",
      "country_name",
      "country_probability",
      "created_at",
    ];

    const escapeCell = (value) => {
      const cell = String(value ?? "");
      if (cell.includes(",") || cell.includes("\n") || cell.includes('"')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    const rows = data.map((item) =>
      headers.map((h) => escapeCell(item[h])).join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="profiles_${Date.now()}.csv"`,
    );

    return res.status(200).send(csv);
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

async function deleteProfileHandler(req, res) {
  try {
    const { id } = req.params;

    const deleted = await deleteProfile(id);

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    return res.status(204).send();
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

module.exports = {
  createProfileHandler,
  getSingleProfileHandler,
  getAllProfilesHandler,
  searchProfilesHandler,
  exportProfilesHandler,
  deleteProfileHandler,
};
