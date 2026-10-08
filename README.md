# CodeCanvas – Personal Portfolio & React Component Showcase

A beginner-friendly full project: a responsive portfolio with a contact form, an admin inbox backed by Google Sheets, and two small React apps.

## Features
- Sticky, responsive navbar with smooth scrolling and active-section highlight
- Sections: Home, About, Skills, Education, Projects, Resume, Contact
- Contact form with JavaScript validation, loading, success and error states (no page reload)
- Messages saved to Google Sheets, with localStorage as a fallback/demo mode
- Admin login that shows or hides the responses dashboard (newest first, mark as read)
- Light/dark theme saved in localStorage
- React Contact Cards app (form, list, reusable cards, delete, dark mode)
- React Like/Unlike app (props + `useState`)

## Technologies
HTML5, CSS3 (variables, Grid, Flexbox), JavaScript (ES6, fetch, localStorage), React 18, Vite, Google Sheets, Google Apps Script, GitHub Pages.

## Folder structure
```
CodeCanvas/
├── .github/workflows/deploy.yml     # publishes /portfolio to GitHub Pages
├── portfolio/                       # index.html, style.css, script.js, assets/
├── google-apps-script/Code.gs       # backend for Google Sheets
├── react-contact-cards/             # Vite + React SPA
├── react-like-card/                 # Vite + React mini project
└── README.md
```

## Run locally
**Portfolio:** open `portfolio/index.html` in Chrome, or run `python -m http.server 8000` inside `portfolio/`.

**React projects** (Node.js 18+ required):
```bash
cd react-contact-cards      # or react-like-card
npm install
npm run dev
```
Open the address that appears (usually http://localhost:5173).

## Google Sheets and Apps Script setup
1. Go to https://sheets.google.com and create a blank spreadsheet named **CodeCanvas Responses**.
2. Choose **Extensions → Apps Script**.
3. Delete the sample code and paste all of `google-apps-script/Code.gs`.
4. Change `ADMIN_KEY` to your own secret text.
5. Click **Save**, then choose **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, approve the permissions, and copy the **Web app URL** (ends in `/exec`).
7. In `portfolio/script.js` set `SCRIPT_URL` to that URL and `ADMIN_KEY` to the same secret as step 4.
8. Submit the contact form, then check the **Responses** tab in your sheet.

If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**, otherwise the old code keeps running.

> Security note: the admin password and key sit in front-end code, so anyone who views the source can read them. That is fine for learning. A real site needs server-side login.

## Deploy the portfolio to GitHub Pages
1. Create a repository on GitHub and push this project (see below).
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` publishes the `portfolio` folder.
4. Your site appears at `https://YOUR-USERNAME.github.io/REPO-NAME/`.
5. Update the "Live demo" and "GitHub" links in the Projects section.

## Upload to GitHub
```bash
git init
git add .
git commit -m "Initial commit: CodeCanvas"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/CodeCanvas.git
git push -u origin main
```

## Screenshots
_Add screenshots here: `![Home](screenshots/home.png)`_

## Future improvements
- Real authentication (Firebase Auth or a server) instead of a demo password
- Email notification when a message arrives
- Save React contacts to a database
- Project filters and a blog section
- Automated tests
