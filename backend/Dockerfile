FROM python:3.11-slim

# Install system dependencies for psycopg2 and PostGIS
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Render sets PORT env var)
EXPOSE 8000

# Run migrations then start the server
# Render provides the PORT env var; uvicorn binds to it
CMD alembic upgrade head && \
    python -m uvicorn app.main:socket_app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1
