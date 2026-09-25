FROM python:3.12-slim

# Install git and ca-certificates (required for repository cloning and HTTPS calls)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy dependency definitions
COPY pyproject.toml uv.lock ./

# Install dependencies into system environment
RUN uv sync --frozen --no-dev

# Copy application source
COPY app ./app

# Expose standard FastAPI port
EXPOSE 8000

ENV PYTHONUNBUFFERED=1

# Run with uvicorn
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
