# VIE Group Website

Modern GitHub Pages remake of the VIE Group website.

## Local Preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Content

- Source of truth: `vie-group/vie-group-content`.
- `media/`: recovered files from the old `vie.group` site.
- `content-source.json`: content repository Pages URL configuration.

The website reads content from `https://vie-group.github.io/vie-group-content/` at runtime. The legacy Seminar page starts empty and renders the seminar archive in the browser after `seminars.json` loads.

## Maintenance

- Teacher publication editor: `admin.html#publication`
- Student seminar upload without token: `presentation/?manage=1` -> `(upload seminar...)` -> `vie-group-content` issue with image/PPT/PDF attachments -> workflow-localized files under `vie-group-content/assets/seminars/`
- Seminar edit without token: `presentation/?manage=1` row `EDIT` or `edit-seminar/?manage=1` -> `vie-group-content` issue with full replacement metadata/links/files
- Student seminar delete without token: `vie-group-content` issue template `Delete seminar submission` -> same-author ownership check -> content PR
- Admin direct seminar upload: `admin.html#seminar`
- RSS feed: `https://vie-group.github.io/vie-group-content/rss.xml`

Detailed operating notes are in `docs/maintenance.md`.

## Validation

```bash
npm run validate
```

The validation workflow also runs on pull requests and pushes to `main` / `wayback-20240414-1to1`.
