# Stage 0 (Backend) API Integration & Data Processing Assessment

This project provides a GET endpoint at `/api/classify` that integrates with the Genderize API and returns processed output (not raw upstream data).

## Public API Base URL

Set your deployed base URL here before submission:

`https://gender-classifier-yhda.vercel.app`

Local base URL:

`http://localhost:3000`

---

## Endpoint

### `GET /api/classify?name=<name>`

Calls the external Genderize API and returns processed data.

## Success Response (`200`)

```json
{
  "status": "success",
  "data": {
    "name": "john",
    "gender": "male",
    "probability": 1,
    "sample_size": 2692560,
    "is_confident": true,
    "processed_at": "2026-04-10T13:27:15.494Z"
  }
}
```

---

## Processing Rules Implemented

- Extract `gender`, `probability`, and `count` from Genderize response.
- Rename `count` to `sample_size`.
- Compute `is_confident` using:
  - `probability >= 0.7` **AND**
  - `sample_size >= 100`
- Generate `processed_at` dynamically for every request using UTC ISO 8601:
  - `new Date().toISOString()`

---

## Validation Rules Implemented

- Missing `name` query param -> `400 Bad Request`
- Empty `name` query param -> `400 Bad Request`
- Non-string style input (e.g. repeated query array / numeric-only) -> `422 Unprocessable Entity`

Error body format:

```json
{
  "status": "error",
  "message": "<error message>"
}
```

---

## Genderize Edge Case Implemented

If Genderize responds with either:

- `gender: null`, or
- `count: 0`

the API returns:

```json
{
  "status": "error",
  "message": "No prediction available for the provided name"
}
```

(Currently returned with `422`.)

---

## External API Integration

Upstream endpoint used:

`https://api.genderize.io?name=<name>`

Implementation details:

- Uses Node.js `https` in the service layer, forced to IPv4 for stable outbound requests.
- Includes request timeout.
- Handles upstream/network failure with `502` and standard error format.

---

## CORS

CORS is enabled globally with:

- `Access-Control-Allow-Origin: *`

This allows external grading scripts to access the API.

---

## Project Structure (MVC)

- `app.js` -> app bootstrap, middleware, route mounting
- `routes/classifyRoutes.js` -> route mapping
- `controllers/classifyController.js` -> request orchestration
- `services/genderizeService.js` -> external API call (Genderize)
- `models/classifyModel.js` -> validation + response transformation logic

---

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
npm start
```

3. Test endpoint:

```bash
curl "http://localhost:3000/api/classify?name=john"
```

---

## Quick Test Cases

Success:

```bash
curl -i "http://localhost:3000/api/classify?name=john"
```

Missing name:

```bash
curl -i "http://localhost:3000/api/classify"
```

Empty name:

```bash
curl -i "http://localhost:3000/api/classify?name="
```

Numeric-only:

```bash
curl -i "http://localhost:3000/api/classify?name=123"
```

No prediction edge case:

```bash
curl -i "http://localhost:3000/api/classify?name=xqzqzq"
```

---

## Notes

- Response processing is done server-side before returning output.
- Timestamp is generated per-request and never hardcoded.
- Error responses consistently follow the required `{ status, message }` format.
