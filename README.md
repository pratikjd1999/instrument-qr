# Instrument QR Lookup

A QR code is stuck on each instrument in the plant. A technician scans it with
any phone and a web page opens showing that instrument's details — calibration
due date, maintenance due date, fault history, usage.

An admin page adds new instruments and generates the QR code to print and stick
on. **Add-only** — no editing or deleting in this version.

React + Vite, no backend. Data lives in `public/machines.json`. Hosted free on
GitHub Pages.

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL it prints (`http://localhost:5173/instrument-qr/`).

- `#/` — index of all instruments, searchable, most urgent first
- `#/i/3087` — detail page, what a QR opens
- `#/admin` — add instruments, set the QR base URL, export
- `#/admin/qr/3087` — QR preview and PNG download

> **Note on npm:** this project ships an `.npmrc` pinning the public registry.
> If your machine's global `~/.npmrc` points at a private work registry, that
> would otherwise break both `npm install` here and `npm ci` in CI.

---

## How data actually moves

This behaves differently locally and deployed, and that difference is the whole
workflow.

### Locally — the real path

The Vite dev server runs on Node, so it has filesystem access. A small handler
in `vite.config.js` accepts the admin form's submission and **writes
`public/machines.json` on disk for real**.

```
npm run dev
  → open #/admin, add instrument
  → public/machines.json is written on disk
  → git add . && git commit && git push
  → GitHub Actions builds
  → live in ~60 seconds
```

### On GitHub Pages — read-only

Pages is static. There is no server, so the write handler does not exist. The
admin page detects this, says so plainly, and falls back to saving in the
browser with a **Download machines.json** button as an escape hatch.

**All real data entry happens locally, then gets pushed.** The deployed admin
page is a convenience, not the main path.

---

## Deployment

One-time setup:

1. Create a **public** repo on GitHub.
2. Set `REPO_NAME` at the top of `vite.config.js` to the repo name.
3. Push to `main`.
4. **Settings → Pages → Source: GitHub Actions**.
5. Wait ~60s. The site is live at `https://<user>.github.io/<repo>/`.
6. Open `#/admin` and set the **QR base URL** to that address.

After that, every push to `main` redeploys automatically.

### Set the QR base URL before printing anything

A QR encoding `localhost` is a dead sticker on a real instrument. The QR page
warns when the target is a local address. Set the base URL to the deployed
address first, then generate and print.

---

## Adding or changing a field

Edit **`src/lib/schema.js`**. That is the whole change.

The admin form and the detail page both render from that list, so a new field
appears in both without touching any component. Each entry declares its label,
input type, whether it is required, and how to display the value.

---

## Project layout

```
.github/workflows/deploy.yml   builds and publishes to Pages on push to main
vite.config.js                 base path + the dev-server disk-write hook
public/machines.json           the database, seeded with 3 dummy records
src/lib/schema.js              THE file to edit when fields change
src/lib/api.js                 load / add / export — swap this to add a backend
src/lib/dates.js               due-date maths and DD-MM-YYYY formatting
src/lib/qr.js                  QR target URL construction
src/components/                Nameplate, DueBadge, SpecGrid
src/pages/                     Home, InstrumentDetail, Admin, QrPage
```

---

## Data model

Six fields:

```json
{
  "code": "3087",
  "name": "Distance Meter",
  "calibrationDueDate": "2027-08-13",
  "maintenanceDueDate": "2027-02-25",
  "faultHistory": "Battery Cover Loose",
  "usagePercent": 90
}
```

- `code` is the Unique Code — what the QR encodes and what the URL looks up.
  Duplicates are rejected, on the client and again by the write handler.
- Dates are stored ISO (`YYYY-MM-DD`) so sorting works, and **displayed
  `DD-MM-YYYY`** to match the existing spreadsheet.
- `usagePercent` displays as a plain number. No colour, no threshold — we don't
  know whether high is good or bad, so nothing implies either.
- `faultHistory` is a single text field, not a log.
- Seeded demo records carry `"sample": true` so **Clear sample data** can remove
  exactly those and nothing else.

Colour carries meaning in one place only: the two due-date countdowns. Green
beyond 30 days, amber inside 30, red overdue.

---

## Known limitations

Stated plainly so nothing is a surprise later.

- **The repo must be public** on a free GitHub account. Pages from a private
  repo needs Pro. If that becomes a problem, Cloudflare Pages serves private
  repos free and is a drop-in swap.
- **No concurrent editing.** If two people add instruments from different
  machines, whoever pushes second wins. Fine for one admin.
- **No edit or delete** of existing instruments, by design, this version.
- **The deployed admin can't save permanently.** Static host, no server.
- **Data is public.** Acceptable here — it's instrument specs.
- **A password on a static site is cosmetic.** We're not adding one. If we ever
  do, it stops casual snooping and nothing more.

---

## When to outgrow this

The moment any of these is true, move to Cloudflare Pages + D1 (also free, no
inactivity pause):

- More than one person adding instruments
- Editing or deleting existing records is needed
- Data shouldn't be publicly readable
- Non-technical staff need to add instruments without a `git push`

`src/lib/api.js` is the only file that changes. Everything else stays.
