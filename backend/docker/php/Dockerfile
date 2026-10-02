FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
        git \
        icu-libs \
        libzip \
        oniguruma \
        unzip \
    && apk add --no-cache --virtual .build-dependencies \
        $PHPIZE_DEPS \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        mbstring \
        opcache \
        pdo_mysql \
        zip \
    && apk del .build-dependencies

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-ssg.ini
COPY docker/php/zz-www.conf /usr/local/etc/php-fpm.d/zz-www.conf

WORKDIR /var/www

CMD ["php-fpm"]
