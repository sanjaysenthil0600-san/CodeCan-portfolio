/**
 * CodeCanvas – Google Apps Script backend
 *
 * Attach this script to a Google Sheet (Extensions > Apps Script),
 * then deploy it as a Web App (Deploy > New deployment > Web app).
 *
 * doPost(e) -> receives form submissions (action "create") and
 *              "mark as read" updates (action "update")
 * doGet(e)  -> returns all saved responses as JSON (needs ADMIN_KEY)
 */

// 1. Name of the tab that stores the messages (created automatically)
var SHEET_NAME = "Responses";

// 2. Secret key. It MUST match ADMIN_KEY in portfolio/script.js
var ADMIN_KEY = "change-this-secret-key";

// 3. Column headings, in order
var HEADERS = ["ID", "Name", "Email", "Subject", "Message", "Timestamp", "Read"];

var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Return the "Responses" sheet, creating it with headings if needed. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange("A:G").setNumberFormat("@"); // plain text, so Sheets keeps our timestamps as written
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

/** Build a JSON response. */
function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

/** POST: create a response or update one. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // avoids two people writing at exactly the same moment
    var body = JSON.parse(e.postData.contents);

    if (body.action === "create") return json_(createResponse_(body));
    if (body.action === "update") return json_(updateResponse_(body));
    return json_({ success: false, error: "Unknown action." });
  } catch (error) {
    return json_({ success: false, error: String(error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/** Save a new contact message as a new row. */
function createResponse_(body) {
  var name = String(body.name || "").trim();
  var email = String(body.email || "").trim();
  var subject = String(body.subject || "").trim();
  var message = String(body.message || "").trim();

  // Always validate on the server too – never trust the browser alone
  if (!name || !email || !subject || !message) {
    return { success: false, error: "All fields are required." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: "Invalid email address." };
  }
  if (message.length > 5000 || name.length > 200 || subject.length > 300) {
    return { success: false, error: "Message is too long." };
  }

  var id = Utilities.getUuid();
  var timestamp = new Date().toISOString();
  getSheet_().appendRow([id, name, email, subject, message, timestamp, "false"]);
  return { success: true, data: { id: id, timestamp: timestamp } };
}

/** Mark a response as read (admin only). */
function updateResponse_(body) {
  if (body.key !== ADMIN_KEY) return { success: false, error: "Not authorised." };

  var sheet = getSheet_();
  var ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(body.id)) {
      if (body.changes && body.changes.read !== undefined) {
        sheet.getRange(i + 2, 7).setValue(String(body.changes.read));
      }
      return { success: true, data: { id: body.id } };
    }
  }
  return { success: false, error: "Response not found." };
}

/** GET: return every response (admin only). */
function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== ADMIN_KEY) {
    return json_({ success: false, error: "Not authorised." });
  }
  var sheet = getSheet_();
  var rows = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
    : [];

  var data = rows.map(function (row) {
    return {
      id: String(row[0]),
      name: String(row[1]),
      email: String(row[2]),
      subject: String(row[3]),
      message: String(row[4]),
      timestamp: String(row[5]),
      read: String(row[6]) === "true"
    };
  });
  return json_({ success: true, data: data });
}
