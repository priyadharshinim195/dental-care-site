# Ajitha Dental Clinic — Full-Stack Migration (Phase A)

React + Vite frontend, Django REST backend, PostgreSQL, and a separate admin dashboard.
The original static site is preserved in `00-backup/`, and the original upload is untouched.

```
ajitha-migration/
  00-backup/        original site zip, logo, and case-study files (read-only reference)
  backend/          Django project (config/, apps/, tests/, seed_assets/)
  frontend/         Vite app: public site (index.html) and admin (admin.html)
  README.md
```

## 1. Prerequisites

- Python 3.12, Node.js 20+ and npm
- PostgreSQL 14+ (local install or Docker)

Start PostgreSQL with Docker (one option):

```bash
docker run --name ajitha-pg -e POSTGRES_USER=ajitha -e POSTGRES_PASSWORD='choose-a-db-password' \
  -e POSTGRES_DB=ajitha_clinic -p 5432:5432 -d postgres:16
```

Or with a local install: `sudo -u postgres createuser -P ajitha` and `sudo -u postgres createdb -O ajitha ajitha_clinic`.

## 2. Backend setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
- `DJANGO_SECRET_KEY`: generate one with `python -c "import secrets; print(secrets.token_urlsafe(50))"`
- `POSTGRES_PASSWORD`: the database password from step 1
- Leave `DJANGO_DEBUG` at `0` in production. For local development set `DJANGO_DEBUG=1`.

```bash
python manage.py migrate
python manage.py seed_site          # loads copy, contact config, logo, 6 hero images, gallery images, 4 draft cases
python manage.py createsuperuser    # creates the first administrator (you choose the username and password)
python manage.py runserver 127.0.0.1:8000
```

`seed_site` is safe to rerun. It never overwrites values you have edited. Use `--force-assets` only if images are missing.

### First administrator

`createsuperuser` prompts for a username, email, and password. Nothing is hardcoded. For unattended setup, set `DJANGO_SUPERUSER_PASSWORD` in the environment and run `python manage.py createsuperuser --noinput --username <name> --email <email>`.

### Additional staff

Create users at `/django-admin/` (superuser only), then add them to the **Editors** group (can change content) or the **Viewers** group (read-only).

### Backend tests

```bash
DJANGO_DEBUG=1 python manage.py test tests
```

Tests run against PostgreSQL and cover authentication, refresh rotation, roles, the consent and verification gate, upload validation, the hero cap, reordering, file cleanup, and the media library.

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev            # public site: http://localhost:5173   admin: http://localhost:5173/admin/login
npm test               # component tests
npm run build          # production build into dist/
```

The dev server proxies `/api` and `/media` to `http://127.0.0.1:8000`. To point elsewhere, set `VITE_API_TARGET`.

### Routes

| URL | What it is |
|---|---|
| `/` | Public website with database-managed content, visibility, and section order |
| Public navbar: **Admin** | Opens the sign-in page; an existing session is redirected to the dashboard |
| `/admin/login` | Admin sign-in |
| `/admin/dashboard` | Overview: counts, warnings for missing details, recent activity |
| `/admin/hero-images` | Slideshow: add, replace, show or hide, delete, drag-to-reorder, preview |
| `/admin/case-studies` | List of cases; drag to reorder; create a draft |
| `/admin/case-studies/:id` | Editor: text, consent and verification, images, publish, preview |
| `/admin/branding` | Logo and About image upload/replace/remove, alternative text, and brand name |
| `/admin/media` | Media library: upload, search, replace, delete, copy link |
| `/admin/website-content` | Contact details, SEO, social links, section visibility/order, website text, services, testimonials, gallery |
| `/admin/settings` | Account details and password management |
| `/admin/content`, `/admin/account` | Backward-compatible redirects to the current routes |

## 4. Production deployment (outline)

1. Build the frontend with `npm run build`. Serve `dist/` with a web server. Route `/api/` and `/media/` through the same browser origin; the current frontend uses relative API URLs and a same-site HttpOnly refresh cookie.
2. Serve `/admin` (and `/admin/*`) with `admin.html`, and everything else with `index.html`. For nginx:
   ```
   location /admin { try_files /admin.html =404; }
   location / { try_files $uri /index.html; }
   ```
3. Configure `DJANGO_DEBUG=0`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, and `POSTGRES_PORT`. Use a managed PostgreSQL instance and a restricted database role.
4. Mount durable storage for uploads and set `MEDIA_ROOT` to its absolute mount path. The production settings reject an unset or relative `MEDIA_ROOT`; an ephemeral application container filesystem is not persistent storage.
5. Apply `python manage.py migrate`, then run `python manage.py seed_site` to add missing starter content/assets without overwriting existing admin edits. Run `python manage.py collectstatic`, then start Django with `gunicorn config.wsgi:application --bind 127.0.0.1:8000`.
6. Proxy `/api/` to Django and serve `/media/` from the same persistent `MEDIA_ROOT` volume (directly through the web server or through Django-aware storage). Back up the media volume along with PostgreSQL; database backups do not contain uploaded file bytes.
7. Set `CORS_ALLOWED_ORIGINS` for any trusted cross-origin API clients, and set `SECURE_COOKIES=1` when using HTTPS.

## 5. Security model

- Access tokens (15 minutes) are kept in memory only. They are never written to local or session storage.
- Refresh tokens (7 days) are HttpOnly, SameSite=Strict cookies scoped to `/api/auth/`. They rotate on use, and old ones are blacklisted. Changing a password signs out other sessions.
- Login is rate-limited (5 attempts per minute). Failed logins return the same message whatever the reason, so accounts can't be enumerated.
- Uploads are checked by content (Pillow decoding for images, file signatures for video), size, and extension. SVG is not accepted. Duplicate files are rejected by SHA-256 checksum.
- Every admin change is recorded in the activity log, visible on the dashboard and in `/django-admin/`.
- Case studies stay hidden until consent and clinic verification are both confirmed. The database enforces this, so it can't be bypassed through the API.

## 6. Content behaviour

- **Public copy:** every heading and paragraph comes from the database. A blank field shows the original wording (its "default_value").
- **Services:** service records, uploaded images, visibility, and ordering are managed in Website content and stored in PostgreSQL/media storage.
- **About section:** copy is editable as website text; the image and its alternative text are managed in Branding.
- **Section display:** visibility and order are persisted in site settings and applied to the public page and navigation.
- **Gallery:** gallery images are seeded from the existing site assets and can be uploaded, replaced, hidden, deleted, and reordered. Published images appear on the public page. Run `python manage.py seed_site` after migration to populate an existing database.
- **Testimonials:** drafts remain private. Publishing requires written consent and clinic verification, enforced by the database and API.
- **Case studies:** the public page shows only published cases with separate Before and After images. Composite-only legacy entries and unpublished cases are not shown; no sample cases are fabricated when none are ready.
- **Hero slideshow:** cycles through active images in order, crossfading with a subtle scale. The interval (1.2–10 s) and fade (0.2–2 s) are set in Website & contact. If the API is unreachable or the slideshow is empty, the six development images are shown.
- **Preloader:** shows the logo once per page load. It leaves when the first slide has loaded and the content is ready, or after five seconds at most.
- **Contact links:** WhatsApp and call links stay disabled until their numbers are entered. Directions and the map appear only when an address or Maps link exists.

## 7. Pending items (as agreed)

| Item | Status |
|---|---|
| Logo | Current file has a checkerboard baked into its pixels. Replace it in Branding when the transparent PNG/SVG arrives. Not modified. |
| Case studies | Existing entries are drafts with legacy composite uploads. Add separate Before and After images and clinic-approved titles and copy before publishing. Publishing requires consent and verification. |
| Hero images | The six files are 626–735 px wide and will look soft full-screen. Replace them with 1920 px or larger. The clinic must confirm usage rights. |
| Contact details | Left empty, as in `config.js`. Enter them in Website & contact. |
| Brand name | "AJITHA DENTAL CARE" is the current default; the admin-managed brand name is reflected in the header, footer, preloader, and alternative text. |

## 8. Known limitations

- Case studies use a responsive before-and-after comparison slider. Existing composite and process uploads remain available to admins as legacy media but are not rendered publicly.
- The hero limit is hardcoded to six in the dashboard. The server limit comes from `HERO_MAX_IMAGES`, so keep the two in step.
- Images are stored at original quality with no generated thumbnails or WebP variants.
- User management uses Django's admin rather than a custom screen.
- Browser validation covered desktop pointer dragging and mobile overflow/layout for the new case comparison section.

## 9. Verification performed

- Backend: run the documented Django test command against PostgreSQL after applying migrations.
- Frontend: run `npm test` and `npm run build` from `frontend/`.

## 10. Cleanup note

If `frontend/node_modules/` still exists in this folder, delete it. It is a leftover from an interrupted install, and it is excluded by `.gitignore`. Run `npm install` to create a clean one.
