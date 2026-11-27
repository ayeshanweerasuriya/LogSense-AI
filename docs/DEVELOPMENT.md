# LogSense AI – Development Guide

This document explains how to set up, run, test, and develop LogSense AI locally.

It covers the currently implemented components: the Node.js backend, PostgreSQL database, Docker configuration, and sample log-producing application.

As development progresses, instructions for the AI service, frontend, Kubernetes, CI/CD, and other components will be added.

## 1. Prerequisites

Install the following tools before starting development.

| Tool | Purpose |
|---|---|
| Git | Source control and repository management |
| Docker Desktop | Containerization and container management |
| Docker Compose | Running multiple services |
| Node.js 22 | Backend and sample application runtime |
| npm | Node.js package management |
| VS Code | Recommended development environment |
| WSL 2 with Ubuntu | Recommended Linux development environment |

Verify your installations:

```bash
git --version
node --version
npm --version
docker --version
docker compose version
```

Docker Desktop must be running before executing Docker commands.

## 2. Clone the Repository

Clone the project from GitHub:

```bash
git clone git@github.com:ayeshanweerasuriya/LogSense-AI.git
```

Alternatively, use HTTPS:

```bash
git clone https://github.com/ayeshanweerasuriya/LogSense-AI.git
```

Navigate into the project:

```bash
cd LogSense-AI
```

Open the project in VS Code:

```bash
code .
```

## 3. Environment Configuration

The project uses environment variables to configure database credentials and application settings.

Create a local environment file from the example:

```bash
cp .env.example .env
```

Open `.env`:

```bash
code .env
```

Configure your local PostgreSQL password:

```env
POSTGRES_PASSWORD=your_strong_local_password
```

Replace the placeholder with a strong local password.

**Important:**

- Never commit `.env` to Git.
- Do not share database credentials publicly.
- The `.env.example` file contains placeholders and can safely be committed.
- Docker Compose reads the root `.env` file automatically.

### Test Database Configuration

The backend integration tests use a separate database to avoid modifying development data.

Create a root-level `.env.test` file:

```bash
touch .env.test
```

Add:

```env
POSTGRES_DB=logsense_test
```

The test command loads `.env` first and `.env.test` second, allowing the test database setting to override the development database name.

The `.env.test` file should remain untracked by Git.

## 4. Start the Application with Docker Compose

The current Docker Compose configuration manages:

- PostgreSQL database
- Node.js Express backend

From the project root, build and start both services:

```bash
docker compose up -d --build
```

Check the container status:

```bash
docker compose ps
```

Both services should eventually report a healthy status.

### Verify Backend Health

Check the backend health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "logsense-backend",
  "timestamp": "..."
}
```

Check database connectivity through the backend:

```bash
curl http://localhost:3000/ready
```

Expected response:

```json
{
  "status": "ready",
  "service": "logsense-backend",
  "database": "connected",
  "timestamp": "..."
}
```

### View Container Logs

Backend:

```bash
docker logs logsense-backend
```

PostgreSQL:

```bash
docker logs logsense-postgres
```

Follow logs continuously:

```bash
docker compose logs -f
```

## 5. Backend Development

The backend is built using Node.js and Express.

### Backend Structure

```text
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── database/
│   │   └── schema.sql
│   ├── middleware/
│   │   └── error.middleware.js
│   ├── routes/
│   │   └── log.routes.js
│   ├── services/
│   │   └── log.service.js
│   ├── utils/
│   │   ├── api-response.js
│   │   └── log.validator.js
│   ├── app.js
│   └── server.js
├── tests/
│   ├── api.integration.test.js
│   └── log.validator.test.js
├── Dockerfile
└── package.json
```

### Install Dependencies

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm ci
```

### Run the Backend Locally

Make sure PostgreSQL is running first:

```bash
docker compose up -d postgres
```

Start the backend development server:

```bash
npm run dev
```

The backend will be available at:

```text
http://localhost:3000
```

Nodemon automatically restarts the backend when source files change.

**Important:** When running the backend locally, do not start the Dockerized backend at the same time because both use port 3000.

You can stop the Dockerized backend while retaining PostgreSQL:

```bash
docker compose stop backend
```

Start it again when needed:

```bash
docker compose start backend
```

## 6. Database Management

LogSense AI uses PostgreSQL for persistent log storage.

### Database Configuration

The database is configured through environment variables.

| Variable | Default value |
|---|---|
| POSTGRES_HOST | localhost (local development) |
| POSTGRES_PORT | 5432 |
| POSTGRES_DB | logsense |
| POSTGRES_USER | logsense_user |
| POSTGRES_PASSWORD | Configured in `.env` |

Inside Docker Compose, the backend uses `postgres` as the database hostname.

### Database Schema

The database schema is maintained in:

```text
backend/src/database/schema.sql
```

The schema defines the `logs` table and indexes used for log retrieval and filtering.

PostgreSQL initializes the database when its persistent volume is first created.

### Access PostgreSQL

Connect to the development database:

```bash
docker exec -it logsense-postgres psql -U logsense_user -d logsense
```

List tables:

```sql
\dt
```

Inspect the logs table:

```sql
\d logs
```

Check the number of stored logs:

```sql
SELECT COUNT(*) FROM logs;
```

Exit PostgreSQL:

```sql
\q
```

### Create the Test Database

The test database must be created separately the first time the project is set up.

From the project root:

```bash
docker exec logsense-postgres psql -U logsense_user -d postgres -c "CREATE DATABASE logsense_test;"
```

Initialize its schema:

```bash
docker exec -i logsense-postgres psql -U logsense_user -d logsense_test < backend/src/database/schema.sql
```

The development and test databases are separate. Backend integration tests should use `logsense_test`.

## 7. Automated Testing

The backend uses Node.js's built-in test runner and assertion library.

No additional testing framework is required.

### Test Categories

| Test file | Purpose |
|---|---|
| `tests/log.validator.test.js` | Unit tests for log validation |
| `tests/api.integration.test.js` | Integration tests for API endpoints and database operations |

### Run All Tests

From the backend directory:

```bash
npm test
```

The test command loads `.env` and `.env.test` and runs the Node.js test runner.

### Current Test Coverage

The backend currently has 38 automated tests.

| Area | Tests |
|---|---:|
| Health and readiness endpoints | 2 |
| Single and batch log ingestion | 5 |
| Log retrieval and filtering | 5 |
| Statistics | 1 |
| Pagination | 2 |
| API error handling | 3 |
| Log validation | 20 |
| **Total** | **38** |

### Test Database Isolation

Integration tests use the `logsense_test` database rather than the development database.

Before running the tests, ensure:

1. Docker Desktop is running.
2. The PostgreSQL container is running.
3. The `logsense_test` database exists.
4. The test database has the required schema.
5. The root `.env.test` file is configured correctly.

## 8. Sample Application

The sample application generates structured e-commerce application logs.

Its source code is located in:

```text
sample-app/src/index.js
```

It simulates application events such as:

- User login
- Product views
- Order creation
- Payment processing
- Database connection failures
- API rate limiting
- Payment failures

### Start the Sample Application

Make sure the backend is running first.

Navigate to the sample application:

```bash
cd sample-app
```

Start it:

```bash
npm start
```

The application generates structured JSON logs and sends them to:

```text
http://localhost:3000/api/logs
```

Press `Ctrl+C` to stop the application.

The sample application currently uses Node.js built-in functionality and does not require additional npm dependencies.

## 9. Docker Commands

Common commands used during development:

| Command | Purpose |
|---|---|
| `docker compose up -d` | Start services |
| `docker compose up -d --build` | Rebuild and start services |
| `docker compose down` | Stop and remove containers and networks |
| `docker compose stop` | Stop services without removing containers |
| `docker compose start` | Start existing stopped containers |
| `docker compose ps` | Display service status |
| `docker compose logs -f` | Follow service logs |
| `docker compose restart backend` | Restart backend |
| `docker compose build backend` | Build backend image |
| `docker compose exec backend sh` | Open a shell inside the backend container |
| `docker volume ls` | List Docker volumes |

**Database persistence:** The PostgreSQL database uses the `logsense_postgres_data` Docker volume. Running `docker compose down` preserves this volume.

Avoid using:

```bash
docker compose down -v
```

unless you intentionally want to delete the database volume and its stored data.

## 10. Troubleshooting

### PostgreSQL Connection Refused

If the backend cannot connect to PostgreSQL, check:

```bash
docker compose ps
```

Check PostgreSQL logs:

```bash
docker logs logsense-postgres
```

Verify PostgreSQL is accepting connections:

```bash
docker exec logsense-postgres pg_isready -U logsense_user -d logsense
```

### Backend Container Is Unhealthy

Check its logs:

```bash
docker logs logsense-backend
```

Verify the health endpoint:

```bash
curl http://localhost:3000/health
```

### Port 3000 Already in Use

Check whether the backend is already running locally or inside Docker.

Avoid running both instances simultaneously on the same host port.

### Test Database Does Not Exist

Create the database and initialize its schema using the instructions in the Database Management section.

### Environment Variables Are Missing

Verify that:

- `.env` exists in the project root.
- `POSTGRES_PASSWORD` is configured.
- `.env.test` exists when running tests.
- `POSTGRES_DB=logsense_test` is configured in `.env.test`.

## 11. Development Workflow

The recommended development workflow is:

1. Pull the latest changes from GitHub.
2. Create a feature branch when working on a new feature.
3. Implement the changes.
4. Run relevant automated tests.
5. Verify the application locally.
6. Review the Git changes.
7. Commit with a meaningful commit message.
8. Push changes to GitHub.

Example:

```bash
git pull origin main

git switch -c feature/your-feature-name

# Implement changes and run tests.

git add .
git commit -m "feat: describe your changes"

git push -u origin feature/your-feature-name
```

## 12. Future Development

The following development areas will be documented as they are implemented:

- Python FastAPI AI service
- Anomaly detection and incident correlation
- LLM integration and diagnosis
- Redis integration
- Next.js frontend
- Docker Compose integration for all components
- Kubernetes deployment
- Jenkins CI/CD pipeline
- Terraform infrastructure provisioning
- AWS deployment
- Prometheus and Grafana monitoring

---

For an overview of the project, architecture, objectives, and technology stack, see the main [README](../README.md).