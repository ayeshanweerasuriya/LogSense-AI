from fastapi import FastAPI

from app.api.routes import health


app = FastAPI(
    title="LogSense AI",
    description="Intelligent log analysis and incident diagnosis service",
    version="1.0.0"
)

app.include_router(health.router)
