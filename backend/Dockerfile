# Use Python 3.10 slim for smaller image size
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV RENDER 1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    tesseract-ocr \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose the port (Render will use $PORT, but we specify a default)
EXPOSE 1001

# Command to run the application
# We use uvicorn directly for production stability
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "1001"]
