# Backend Dockerfile for AerialCast API and MQTT listener

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (for psycopg2, etc.)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libpq-dev \
       libpango-1.0-0 \
       libpangoft2-1.0-0 \
       libcairo2 \
       libgdk-pixbuf-2.0-0 \
       libffi-dev \
       shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copy application code
COPY aerialcast_api ./aerialcast_api
COPY db ./db

# Default environment (can be overridden by Coolify)
ENV AERIALCAST_ENV=production \
    FLASK_ENV=production

EXPOSE 8000

# Default command: run API via gunicorn
# Coolify can override this command for the MQTT listener service, e.g.:
#   python -m aerialcast_api.tasks.mqtt_listener
CMD ["gunicorn", "aerialcast_api:create_app()", "-b", "0.0.0.0:8000"]
