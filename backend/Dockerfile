FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV RENDER 1

# Install system dependencies
# We removed libgl1-mesa-glx because we are using opencv-python-headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    tesseract-ocr \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Step 1: Install Torch (CPU version only)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install remaining requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use the dynamic PORT assigned by Render
EXPOSE 1001

# Start the app using main:app
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-1001}
