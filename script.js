/* ==========================================================
   CodeCanvas Portfolio – script.js
   Sections:
   1. Settings            5. Contact form
   2. Theme toggle        6. Storage (localStorage + Google Sheets)
   3. Navigation          7. Admin login & dashboard
   4. Small helpers
   ========================================================== */

/* ---------- 1. SETTINGS ---------- */
const CONFIG = {
  // Paste your Google Apps Script Web App URL here (it ends with /exec).
  // Leave it EMPTY to use localStorage only (demo / fallback mode).
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycby5Uj2diHe6V-rXG177DGQaJshstBfIfIl6kbaScgkIUPMK4qWDySiHtidKfTdxveXytA/exec"
  // Must match ADMIN_KEY in google-apps-script/Code.gs
  ADMIN_KEY: "change-this-secret-key",

  // Demo admin login. NOTE: front-end passwords are visible to anyone
  // who views the source, so this is for learning only.
  ADMIN_USER: "admin",
  ADMIN_EMAIL: "admin@codecanvas.com",
  ADMIN_PASSWORD: "admin123",
};

// Keys used in localStorage / sessionStorage
const KEYS = {
  responses: "codecanvas_responses",
  theme: "codecanvas_theme",
  session: "codecanvas_admin_session",
};

// True when a Google Apps Script URL has been provided
const usingSheets = () => CONFIG.SCRIPT_URL.trim() !== "";

/* ---------- 4. SMALL HELPERS ---------- */
const $ = (selector) => document.querySelector(selector);

// Create an element safely (textContent prevents HTML injection)
function createEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Show a message inside a ".status" element
function setStatus(element, message, type) {
  element.textContent = message;
  element.className = "status" + (type ? " " + type : "");
}

// Create a reasonably unique id, e.g. "lq3k9x2a7b"
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- 2. THEME TOGGLE ---------- */
const themeToggle = $("#themeToggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // The button shows the theme you will switch TO
  themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem(KEYS.theme, next); } catch (e) { /* storage blocked */ }
});

// Restore the saved theme (the tiny script in <head> already set the attribute)
applyTheme(document.documentElement.getAttribute("data-theme") || "light");

/* ---------- 3. NAVIGATION ---------- */
const navToggle = $("#navToggle");
const navMenu = $("#navMenu");
const navLinks = document.querySelectorAll(".nav-link");

function closeMenu() {
  navMenu.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open menu");
}

// Hamburger menu on mobile
navToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

// Close the mobile menu after choosing a link
navLinks.forEach((link) => link.addEventListener("click", closeMenu));

// Highlight the link of the section currently in view
const sections = document.querySelectorAll("main section[id]");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
        });
      }
    });
  },
  { rootMargin: "-40% 0px -55% 0px" } // a thin band near the middle of the screen
);
sections.forEach((section) => observer.observe(section));

$("#year").textContent = new Date().getFullYear();

/* ---------- 6. STORAGE ---------- */
/* --- 6a. localStorage (demo / fallback database) --- */

// RETRIEVE: read all responses from localStorage
function getLocalResponses() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.responses)) || [];
  } catch (e) {
    return [];
  }
}

// SAVE: add one response to localStorage
function saveLocalResponse(data) {
  const responses = getLocalResponses();
  const response = {
    id: generateId(),
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    timestamp: new Date().toISOString(),
    read: false,
  };
  responses.push(response);
  localStorage.setItem(KEYS.responses, JSON.stringify(responses));
  return response;
}

// UPDATE: change fields of one response (for example read: true)
function updateLocalResponse(id, changes) {
  const responses = getLocalResponses().map((item) =>
    item.id === id ? { ...item, ...changes } : item
  );
  localStorage.setItem(KEYS.responses, JSON.stringify(responses));
}

/* --- 6b. Google Sheets through Apps Script --- */
// We send "text/plain" so the browser skips the CORS preflight request,
// which Apps Script cannot answer.
async function postToSheet(payload) {
  const res = await fetch(CONFIG.SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "The server rejected the request.");
  return json.data;
}

async function getFromSheet() {
  const url = CONFIG.SCRIPT_URL + "?key=" + encodeURIComponent(CONFIG.ADMIN_KEY);
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Could not load responses.");
  return json.data;
}

/* --- 6c. One set of functions the rest of the app uses --- */
// SAVE: Google Sheets first; if it fails, keep the message in localStorage
async function saveResponse(data) {
  if (usingSheets()) {
    try {
      await postToSheet({ action: "create", ...data });
      return { savedTo: "sheet" };
    } catch (error) {
      console.warn("Google Sheets save failed, using localStorage:", error);
      saveLocalResponse(data);
      return { savedTo: "local" };
    }
  }
  saveLocalResponse(data);
  return { savedTo: "local" };
}

// RETRIEVE: newest first
async function getResponses() {
  const list = usingSheets() ? await getFromSheet() : getLocalResponses();
  return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// UPDATE: mark a response as read
async function updateResponse(id, changes) {
  if (usingSheets()) {
    await postToSheet({ action: "update", key: CONFIG.ADMIN_KEY, id, changes });
  } else {
    updateLocalResponse(id, changes);
  }
}

/* ---------- 5. CONTACT FORM ---------- */
const contactForm = $("#contactForm");
const submitBtn = $("#submitBtn");
const formStatus = $("#formStatus");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Return an object of error messages (empty object = valid)
function validateContact(values) {
  const errors = {};
  if (!values.name) errors.name = "Please enter your name.";
  if (!values.email) errors.email = "Please enter your email.";
  else if (!EMAIL_PATTERN.test(values.email)) errors.email = "Enter a valid email, like name@example.com.";
  if (!values.subject) errors.subject = "Please enter a subject.";
  if (!values.message) errors.message = "Please write a message.";
  else if (values.message.length < 10) errors.message = "Write at least 10 characters.";
  return errors;
}

function showFieldErrors(errors) {
  ["name", "email", "subject", "message"].forEach((field) => {
    const input = $("#" + field);
    const errorBox = document.querySelector(`[data-error-for="${field}"]`);
    errorBox.textContent = errors[field] || "";
    input.classList.toggle("invalid", Boolean(errors[field]));
    input.setAttribute("aria-invalid", errors[field] ? "true" : "false");
  });
}

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the page from reloading

  const values = {
    name: $("#name").value.trim(),
    email: $("#email").value.trim(),
    subject: $("#subject").value.trim(),
    message: $("#message").value.trim(),
  };

  const errors = validateContact(values);
  showFieldErrors(errors);
  if (Object.keys(errors).length > 0) {
    setStatus(formStatus, "Please fix the highlighted fields.", "error-msg");
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";
  setStatus(formStatus, "Sending your message...", "");

  try {
    const result = await saveResponse(values);
    contactForm.reset();
    setStatus(
      formStatus,
      result.savedTo === "sheet"
        ? "Thanks! Your message was sent."
        : "Thanks! Your message was saved in this browser (demo mode).",
      "success"
    );
  } catch (error) {
    setStatus(formStatus, "Something went wrong. Please try again.", "error-msg");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send message";
  }
});

// Clear a field's error as soon as the visitor edits it
contactForm.addEventListener("input", (event) => {
  const field = event.target;
  if (field.classList.contains("invalid")) {
    field.classList.remove("invalid");
    document.querySelector(`[data-error-for="${field.id}"]`).textContent = "";
  }
});

/* ---------- 7. ADMIN LOGIN & DASHBOARD ---------- */
const loginSection = $("#loginSection");
const responsesSection = $("#responsesSection");
const loginForm = $("#loginForm");
const loginStatus = $("#loginStatus");
const dashStatus = $("#dashStatus");
const responsesList = $("#responsesList");

// Show/hide the two admin panels with the "hidden" CSS class
function showDashboard(isLoggedIn) {
  loginSection.classList.toggle("hidden", isLoggedIn);
  responsesSection.classList.toggle("hidden", !isLoggedIn);
  if (isLoggedIn) displayResponses();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = $("#adminUser").value.trim().toLowerCase();
  const pass = $("#adminPass").value;

  const userOk = user === CONFIG.ADMIN_USER || user === CONFIG.ADMIN_EMAIL;
  if (!user || !pass) {
    setStatus(loginStatus, "Enter your username and password.", "error-msg");
  } else if (userOk && pass === CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem(KEYS.session, "true"); // stays logged in until the tab closes
    loginForm.reset();
    setStatus(loginStatus, "", "");
    showDashboard(true);
  } else {
    setStatus(loginStatus, "Wrong username or password.", "error-msg");
  }
});

$("#logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(KEYS.session);
  responsesList.replaceChildren();
  setStatus(dashStatus, "", "");
  showDashboard(false);
});

$("#refreshBtn").addEventListener("click", displayResponses);

// Build one response card
function buildResponseCard(item) {
  const date = new Date(item.timestamp);
  const card = createEl("article", "response" + (item.read ? " is-read" : ""));

  card.append(createEl("h3", "", item.subject));
  card.append(createEl("p", "from", `${item.name} (${item.email})`));
  card.append(createEl("p", "body", item.message));

  const foot = createEl("div", "foot");
  foot.append(
    createEl("span", "", `Date: ${date.toLocaleDateString()}`),
    createEl("span", "", `Time: ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`)
  );

  if (!item.read) {
    const readBtn = createEl("button", "btn btn-small btn-outline", "Mark as read");
    readBtn.type = "button";
    readBtn.addEventListener("click", async () => {
      readBtn.disabled = true;
      try {
        await updateResponse(item.id, { read: true });
        displayResponses();
      } catch (error) {
        readBtn.disabled = false;
        setStatus(dashStatus, "Could not update: " + error.message, "error-msg");
      }
    });
    foot.append(readBtn);
  }

  card.append(foot);
  return card;
}

// DISPLAY: load responses and draw them (newest first)
async function displayResponses() {
  $("#sourceLabel").textContent = usingSheets()
    ? "Data source: Google Sheets"
    : "Data source: this browser (localStorage demo)";
  setStatus(dashStatus, "Loading responses...", "");
  responsesList.replaceChildren();

  let list;
  try {
    list = await getResponses();
    setStatus(dashStatus, "", "");
  } catch (error) {
    // Google Sheets failed: show the local backup and explain
    setStatus(dashStatus, "Could not reach Google Sheets (" + error.message + "). Showing local backup.", "error-msg");
    list = getLocalResponses().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  if (list.length === 0) {
    responsesList.append(createEl("p", "lead", "No messages yet. Send one from the contact form above."));
    return;
  }
  list.forEach((item) => responsesList.append(buildResponseCard(item)));
}

// On page load: restore the admin session if there is one
showDashboard(sessionStorage.getItem(KEYS.session) === "true");
