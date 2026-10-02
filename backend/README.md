# College SSG Voting System API

Laravel REST API for administering SSG elections and securely accepting student ballots. The React/Vite client is maintained separately in `../frontend`.

## Requirements

- PHP 8.2 or later
- Composer
- MySQL 8 or a compatible MariaDB release
- Postman or Newman for API verification

Docker support will be added after the local backend workflow is complete.

## Local setup

```powershell
Copy-Item .env.example .env
composer install
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve
```

Update the `DB_*` values in `.env` for your local MySQL installation before running migrations.

In `local` and `testing` environments, the default seeder calls `DevelopmentSeeder`, which creates the development administrator, students, active election, positions, and candidates required by the Postman suite. It does not seed these known credentials in production.

## Verification

Run the PHP checks:

```powershell
php artisan test
vendor\bin\pint --test
php artisan route:list --path=api
```

Run the complete Postman collection from a freshly seeded database:

```powershell
php artisan migrate:fresh --seed --force
npx --yes newman run postman\SSG_Voting_System.postman_collection.json
```

The collection is stateful and intentionally closes the seeded election. Reseed before every complete rerun.

## Security model

- Administrators authenticate with email and password.
- Students authenticate with student ID and full name.
- Only enrolled students can receive voter tokens.
- Laravel Sanctum bearer tokens are separated by admin and voter abilities.
- Voter participation is stored separately from anonymous ballot selections.
- Database unique constraints prevent duplicate participation and duplicate ballot selections.
- Backend validation enforces election state, candidate position, selection limits, and candidate photo rules.
