FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn eventlet

COPY aerialcast_api ./aerialcast_api
COPY db ./db
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

ENV FLASK_APP=aerialcast_api:create_app
EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "aerialcast_api:create_app()"]
