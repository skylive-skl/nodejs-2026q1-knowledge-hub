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
docker-compose up --build
```

Run Adminer (optional debug profile):

```bash
docker-compose --profile debug up --build
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

After application running open new terminal and enter:

To run all tests without authorization

```
npm run test
```

To run only one of all test suites

```
npm run test -- <path to suite>
```

To run all test with authorization

```
npm run test:auth
```

To run only specific test suite with authorization

```
npm run test:auth -- <path to suite>
```

To run refresh token tests

```
npm run test:refresh
```

To run RBAC (role-based access control) tests

```
npm run test:rbac
```

### Auth/RBAC test mode notes

Auth-related e2e suites in this project call a running API instance on localhost:4000.

Before running auth/refresh/rbac tests, start the API with auth test mode enabled:

```bash
TEST_MODE=auth DISABLE_THROTTLE_FOR_TESTS=true npm start
```

Then run tests in a separate terminal.

Notes:
- TEST_MODE=auth enables authorization behavior expected by e2e suites.
- DISABLE_THROTTLE_FOR_TESTS=true disables auth endpoint rate limiting only for test runs to avoid flaky 429 errors.

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
