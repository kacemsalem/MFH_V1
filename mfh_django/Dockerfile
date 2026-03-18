FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collectstatic au build (pas besoin de DB)
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Migrations puis démarrage gunicorn (Railway injecte $PORT)
CMD sh -c "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"
