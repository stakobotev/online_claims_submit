# Minimal PHP runtime for local testing of the PHP edition.
# Adds the pdo_mysql extension (curl, fileinfo, mbstring are already enabled in
# the official image). Not required in production if your host already has PHP.
FROM php:8.3-cli

RUN docker-php-ext-install pdo_mysql

WORKDIR /app
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
