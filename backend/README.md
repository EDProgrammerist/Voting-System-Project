# College SSG Voting System API

Laravel REST API for administering SSG elections and securely accepting student ballots. The React/Vite client is maintained separately in `../frontend`.

## Requirements

- PHP 8.2 or later
- Composer
- MySQL 8 or a compatible MariaDB release
- Postman or Newman for API verification

## Docker development setup

Run the complete backend stack from this `backend` directory:

```powershell
docker compose up --detach --build
docker compose exec app php artisan migrate:fresh --seed --force
docker compose exec app php artisan storage:link
```

The API is available at `http://localhost:8000/api`. Docker MySQL is exposed to the host on port `3308` and is reached by Laravel containers through `db:3306`.

Composer dependencies are stored in a native Docker volume so PHP does not repeatedly read the large `vendor` tree through the Windows bind mount. Rebuild the app image after changing `composer.json` or `composer.lock`:

```powershell
docker compose build app
docker compose up --detach
```

Stop the containers without deleting database data:

```powershell
docker compose down
```

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

Windows does not support multiple workers in PHP's built-in server. For the concurrent-vote Postman test, start two single-worker servers in separate terminals:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
php artisan serve --host=127.0.0.1 --port=8001
```

In `local` and `testing` environments, the default seeder calls `DevelopmentSeeder`, which creates the development administrator, students, active election, positions, and candidates required by the Postman suite. It does not seed these known credentials in production.

## Verification

Run the PHP checks:

```powershell
php artisan test
vendor\bin\pint --test
php artisan route:list --path=api
```

The automated suite uses an in-memory SQLite database. It does not reset or modify the Docker development MySQL database.

Run the complete Postman collection from a freshly seeded database:

```powershell
php artisan migrate:fresh --seed --force
npx --yes newman run postman\SSG_Voting_System.postman_collection.json
```

The collection is stateful and intentionally closes the seeded election. Reseed before every complete rerun.

## Admin management additions

- `GET /api/admin/students?election_id={id}` returns `course`, `has_voted`, and `voting_status` without exposing ballot selections.
- `DELETE /api/admin/candidates/{studentId}` accepts `election_id` in the JSON body and removes only the draft-election candidacy.
- `PUT /api/admin/positions/reorder` accepts the complete position order for one draft election and saves it in a database transaction.
- Every unauthenticated `/api/*` request returns JSON `401`, even when the request omits the `Accept` header.

## Security model

- Administrators authenticate with email and password.
- Students authenticate with student ID and full name.
- Only enrolled students can receive voter tokens.
- Laravel Sanctum bearer tokens are separated by admin and voter abilities.
- Voter participation is stored separately from anonymous ballot selections.
- Database unique constraints prevent duplicate participation and duplicate ballot selections.
- Backend validation enforces election state, candidate position, selection limits, and candidate photo rules.
