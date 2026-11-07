FROM node:22-alpine AS webapp
WORKDIR /webapp
COPY webapp/package.json webapp/package-lock.json ./
RUN npm ci
COPY webapp/ ./
RUN npm run build

FROM mcr.microsoft.com/playwright/python:v1.58.0-noble
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
COPY --from=webapp /webapp/dist webapp/dist
RUN useradd --create-home bot && mkdir -p data && chown bot:bot data
USER bot
EXPOSE 8090
CMD ["python", "-m", "app"]
