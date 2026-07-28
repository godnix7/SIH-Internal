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

# Run migrations, auto-seed admin if env vars set, then start the server
# Render provides the PORT env var; uvicorn binds to it
CMD alembic upgrade head && \
    python -c "\
import os, sys; \
email = os.environ.get('SEED_ADMIN_EMAIL', ''); \
password = os.environ.get('SEED_ADMIN_PASSWORD', ''); \
role = os.environ.get('SEED_ADMIN_ROLE', 'sys_admin'); \
exec('if email and password:\n    import asyncio\n    sys.path.insert(0, \"/app\")\n    from scripts.seed_admin import seed_admin\n    asyncio.run(seed_admin(email, password, role))\n    print(f\"Admin seeded: {email}\")\nelse:\n    print(\"No SEED_ADMIN_EMAIL/PASSWORD set, skipping admin seed.\")')" && \
    python -m uvicorn app.main:socket_app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1
