
# LogSense AI

**Intelligent Log Monitoring & Incident Diagnosis Platform**

LogSense AI is a portfolio project focused on building an AI-powered log monitoring and incident diagnosis platform.

The goal is to collect application logs, identify unusual patterns, detect potential incidents, correlate related errors, and use AI to explain problems and recommend troubleshooting actions.

> **Project status:** Initial development and environment setup.

## Objectives

- Centralize application log collection and processing.
- Detect anomalies and unusual application behaviour.
- Identify and group related errors into incidents.
- Use AI to explain detected incidents.
- Generate actionable troubleshooting recommendations.
- Provide a dashboard for monitoring logs and incidents.
- Automate testing, containerization, deployment, and infrastructure management.

## Planned Technology Stack

| Area | Technology |
|---|---|
| Frontend | Next.js, TypeScript |
| Backend API | Node.js, Express |
| AI Service | Python, FastAPI |
| AI Models | Ollama and external LLM APIs |
| Data Processing | Python |
| Cache / Incident State | Redis |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes |
| Infrastructure as Code | Terraform |
| CI/CD | Jenkins |
| Monitoring | Prometheus, Grafana |
| Version Control | Git, GitHub |
| Cloud Platform | AWS |

## Architecture Overview

The planned platform consists of the following components:

1. **Log-producing applications** – Generate application and system logs.
2. **Log ingestion backend** – Receives and processes incoming logs.
3. **AI service** – Performs anomaly detection, incident analysis, and AI-assisted diagnosis.
4. **Redis** – Supports caching and incident state management.
5. **Frontend dashboard** – Displays logs, anomalies, incidents, and diagnostic results.
6. **DevOps infrastructure** – Supports automated builds, deployments, orchestration, and monitoring.

## Project Structure

```text
LogSense-AI/
├── frontend/          # Next.js dashboard
├── backend/           # Node.js API and log ingestion
├── ai-service/        # Python AI and diagnosis service
├── sample-app/        # Applications for generating sample logs
├── infrastructure/    # Infrastructure as Code
├── tests/             # Automated tests
├── docs/              # Technical documentation
├── README.md
└── .gitignore
```

## Development Approach

Development will begin locally using Docker and Docker Compose. Components will be implemented incrementally, tested independently, and integrated into the overall platform.

The longer-term objective is to introduce Kubernetes, CI/CD automation, infrastructure provisioning, cloud deployment, and monitoring.

## Project Goals

LogSense AI aims to demonstrate practical skills in:

- AI engineering and LLM integration
- Backend and API development
- Log processing and anomaly detection
- Microservices architecture
- Docker and Kubernetes
- CI/CD automation
- Infrastructure as Code
- Cloud computing and observability
