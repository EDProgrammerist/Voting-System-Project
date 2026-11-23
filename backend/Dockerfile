FROM php:8.4-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
        libfreetype6-dev libjpeg62-turbo-dev libpng-dev libzip-dev \
        libicu-dev libonig-dev libpq-dev unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" gd bcmath intl mbstring opcache pdo_mysql pdo_pgsql zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
ENV COMPOSER_ALLOW_SUPERUSER=1 APP_ENV=production APP_DEBUG=false \
    LOG_CHANNEL=stderr CACHE_STORE=file SESSION_DRIVER=file QUEUE_CONNECTION=sync
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --no-progress --prefer-dist --optimize-autoloader
COPY . .
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-voting.ini
COPY docker/render/apache.conf /etc/apache2/sites-available/000-default.conf
RUN mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer dump-autoload --no-dev --optimize \
    && chown -R www-data:www-data storage bootstrap/cache \
    && sed -i 's/\r$//' docker/render/start.sh
EXPOSE 10000
CMD ["sh", "docker/render/start.sh"]
