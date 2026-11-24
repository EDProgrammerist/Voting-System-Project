#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is required. Set the existing application's key in Render environment variables." >&2
    exit 1
fi

port="${PORT:-10000}"
case "$port" in
    ''|*[!0-9]*) echo "PORT must be a number." >&2; exit 1 ;;
esac
sed -i "s/^Listen 80$/Listen $port/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$port>/" /etc/apache2/sites-available/000-default.conf

php artisan optimize
php artisan migrate --force --no-interaction
php artisan storage:link --force --no-interaction
exec apache2-foreground
