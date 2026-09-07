# Minimal PHP runtime for local testing of the PHP edition.
# Adds the pdo_pgsql extension (curl, fileinfo, mbstring are already enabled in
# the official image). Not required in production if your host already has PHP.
FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
