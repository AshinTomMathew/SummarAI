FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV RENDER 1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    tesseract-ocr \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cloud build: Skip Torch/Transformers for faster deployment
# We rely on Groq/Gemini APIs in the cloud
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use the dynamic PORT assigned by Render
EXPOSE 1001

# Start the app using main:app
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-1001}
