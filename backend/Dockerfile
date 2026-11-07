FROM mcr.microsoft.com/playwright/python:v1.58.0-noble
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY alembic.ini ./
COPY migrations/ migrations/
COPY app/ app/
RUN useradd --create-home bot
USER bot
EXPOSE 8090
CMD ["sh", "-c", "alembic upgrade head && python -m app"]
