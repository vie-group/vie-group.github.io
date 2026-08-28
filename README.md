# VIE Group Website

Modern GitHub Pages remake of the VIE Group website.

## Local Preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Content

- `data/site.json`: lab profile and research highlights.
- `data/news.json`: homepage news.
- `data/team.json`: faculty, current members, alumni.
- `data/publications.json`: publication list.
- `data/seminars.json`: group seminar materials.
- `data/activities.json`: activity archive.
- `media/`: recovered files from the old `vie.group` site.

The public website renders these JSON files directly. No build step is required.

## Maintenance

- Teacher publication editor: `admin.html#publication`
- Student seminar upload: `admin.html#seminar`
- Student issue submission: `.github/ISSUE_TEMPLATE/seminar-submission.yml` -> `.github/workflows/seminar-issue-to-pr.yml`
- Fallback workflows:
  - `.github/workflows/add-publication.yml`
  - `.github/workflows/add-seminar.yml`

Detailed operating notes are in `docs/maintenance.md`.

## Validation

```bash
npm run validate
```

The validation workflow also runs on pull requests and pushes to `main`.

To retry archived-file recovery:

```bash
npm run download:wayback
```
