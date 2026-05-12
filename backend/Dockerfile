FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade setuptools \
    && python -c "import pkg_resources; print('pkg_resources ready')"

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
