# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    libgomp1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all model files
COPY . .

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Set environment variables for Chrome
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_PATH=/usr/bin/google-chrome

# Environment variables for Google Cloud credentials
ENV GOOGLE_SERVICE_ACCOUNT_TYPE="service_account"
ENV GOOGLE_PROJECT_ID=""
ENV GOOGLE_PRIVATE_KEY=""
ENV GOOGLE_CLIENT_EMAIL=""
ENV GOOGLE_PRIVATE_KEY_ID=""
ENV GOOGLE_CLIENT_ID=""
ENV GOOGLE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
ENV GOOGLE_TOKEN_URI="https://oauth2.googleapis.com/token"
ENV GOOGLE_AUTH_PROVIDER_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
ENV GOOGLE_CLIENT_CERT_URL=""
ENV GOOGLE_UNIVERSE_DOMAIN="googleapis.com"

# Expose the port the app runs on
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/ || exit 1

# Start the application with Waitress
CMD ["python", "api.py"]