# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js 24.10.0 or higher (24.x.x) - [Download & Install Node.js](https://nodejs.org/en/download/).
- Docker - [Install Docker](https://docs.docker.com/engine/install/).
- Docker Hub account - [Create account](https://hub.docker.com/).

## Downloading

```
git clone {repository URL}
```

## Installing NPM modules

```
npm install
```

## Environment variables

Create local environment file from example:

```bash
cp .env.example .env
```

`.env` file must not be committed.

### Logging configuration

The application supports configurable logging via environment variables:

- `LOG_LEVEL` - minimum log level. Supported values: `log`, `debug`, `warn`, `error`, `verbose`. Default: `log`.
- `LOG_MAX_FILE_SIZE` - maximum size of `app.log` in kilobytes before rotation. Default: `1024`.

Logging behavior:
- In development mode logs are human-readable.
- In production mode logs are structured JSON.
- All incoming HTTP requests and outgoing HTTP responses are logged.
- Sensitive fields such as `password`, `token`, `accessToken`, and `refreshToken` are masked as `[REDACTED]`.
- Logs are written to stdout and to `app.log`.
- When `app.log` exceeds the configured size, it is rotated with a timestamp suffix.

Error handling:
- The application uses a global exception filter for HTTP error responses.
- Custom application errors are supported for validation, unauthorized, forbidden, and not found cases.
- Process-level handlers are registered for `uncaughtException` and `unhandledRejection` with graceful shutdown.

## Running application

```
npm start
```

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

## Running with Docker Compose

Build and start containers:

```bash
docker compose up -d --build
```

Run Adminer (optional debug profile):

```bash
docker compose --profile debug up -d --build
```

On each app container start:
- Prisma migrations are applied automatically with `prisma migrate deploy`.
- Seed runs only when database is empty.

If you keep `postgres-data` volume, seed is skipped on subsequent restarts.
To reseed from scratch, remove volumes first:

```bash
docker compose down -v
```

After startup:
- API: http://localhost:4000/
- Swagger: http://localhost:4000/doc/
- PostgreSQL: localhost:5432
- Adminer (debug profile): http://localhost:8080/

Application data is stored in PostgreSQL via Prisma.

## Prisma and Database

Generate Prisma Client:

```bash
npm run prisma:generate
```

Create and apply migrations:

```bash
npm run prisma:migrate:dev -- --name init
```

Seed database with initial data:

```bash
npx prisma db seed
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

## Docker Hub image

Published image link:

https://hub.docker.com/r/skylive/knowledge-hub-api

## Testing

Available test commands:

Run all tests:

```bash
npm run test
```

Run unit tests only:

```bash
npm run test:unit
```

Run all e2e tests:

```bash
npm run test:e2e
```

Run auth-related e2e tests:

```bash
npm run test:auth
```

Run refresh token e2e tests:

```bash
npm run test:refresh
```

Run RBAC e2e tests:

```bash
npm run test:rbac
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### Auth/RBAC test mode notes

`npm run test:e2e` now starts the API automatically for the test run.

Behavior:
- API is started with `TEST_MODE=auth` and `DISABLE_THROTTLE_FOR_TESTS=true`.
- E2E runs on isolated port `4010` to avoid collisions with a locally running dev server on `4000`.
- After Jest completes, the temporary API process is stopped automatically.

For auth/refresh/rbac-only scripts (`test:auth`, `test:refresh`, `test:rbac`), ensure the API is running in auth test mode before starting those commands.

Notes:
- TEST_MODE=auth enables authorization behavior expected by e2e suites.
- DISABLE_THROTTLE_FOR_TESTS=true disables auth endpoint rate limiting only for test runs to avoid flaky 429 errors.
- npm run test runs unit tests first and then the full e2e suite.

### Auto-fix and format

```
npm run lint
```

```
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging

---

## AI Integration (Google Gemini)

The API exposes three AI-powered endpoints for article summarization, translation, and content analysis, powered by the Google Gemini API (free tier).

### Obtaining a Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Sign in with a Google account.
3. Click **Get API key** → **Create API key** → select or create a Google Cloud project.
4. Copy the generated key (starts with `AIza…`).
5. Paste it into your `.env` file as `GEMINI_API_KEY=<your-key>`.

> **Regional availability**: Google AI Studio may be restricted in some countries. If the page does not load, try a VPN. API calls work from any server once the key is created.

### Model used

`gemini-2.0-flash` — fast, low-latency model from the Gemini 2.0 family.  
Override with the `GEMINI_MODEL` environment variable if needed.

### Environment variables for AI

Add these to your `.env` (they are already present in `.env.example`):

```dotenv
GEMINI_API_KEY=your-gemini-api-key          # required
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.0-flash
AI_RATE_LIMIT_RPM=20           # max AI requests per minute per IP (default: 20)
AI_CACHE_TTL_SEC=300           # cache TTL for summarize/translate (default: 300)
AI_HTTP_TIMEOUT_MS=15000       # Gemini HTTP timeout in ms (default: 15000)
AI_RETRY_COUNT=3               # max retries for transient errors (default: 3)
AI_RETRY_BASE_DELAY_MS=300     # initial retry delay in ms (default: 300)
```

### Setup after clone

```bash
git clone <repository-url>
cd Nest.js-Knowledge-Hub-API
npm install
cp .env.example .env
# Open .env and paste your Gemini API key into GEMINI_API_KEY=
npm run prisma:migrate:dev
npm start
```

### Testing AI endpoints

All AI endpoints require a valid JWT bearer token (same as other protected routes). Obtain a token first:

```bash
# 1. Sign up (or log in)
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"Test1234!"}'

# 2. Log in and copy the accessToken
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"Test1234!"}'
```

**Summarize an article** (`POST /ai/articles/:articleId/summarize`):

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/summarize \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"maxLength":"short"}'
```

**Translate an article** (`POST /ai/articles/:articleId/translate`):

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/translate \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage":"ru","sourceLanguage":"en"}'
```

**Analyze an article** (`POST /ai/articles/:articleId/analyze`):

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/analyze \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"task":"review"}'
```

### Known limitations (free tier)

| Constraint | Value |
|---|---|
| Free-tier RPM (requests per minute) | 15 RPM (model-dependent) |
| Free-tier RPD (requests per day) | 1 500 RPD |
| Context window | 1 M tokens (gemini-2.0-flash) |
| Response latency | 1–10 s depending on prompt size |
| Regional availability | Not available in EU/EEA without VPN during key creation |

- Responses are cached in memory for `AI_CACHE_TTL_SEC` seconds (default 5 min) per article version to reduce API calls.
- Transient upstream errors (5xx, 429) are retried up to `AI_RETRY_COUNT` times with exponential back-off.
- Free-tier rate limits from Google's side are distinct from the application-level `AI_RATE_LIMIT_RPM` limiter.
- If the Gemini key is missing or invalid, the AI endpoints return `500` without exposing the key in error messages.
