/**
 * Paste this into Extensions → Apps Script (from within the Google Sheet itself,
 * so it's bound to the spreadsheet and getActiveSpreadsheet() works).
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Copy the resulting /exec URL into SHEETS_WEBAPP_URL.
 */

var TABS = ["Projects", "Tasks", "Shopping"];

function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = {};
  TABS.forEach(function (name) {
    out[name.toLowerCase()] = readRows(ss, name);
  });
  return jsonResponse(out);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  TABS.forEach(function (name) {
    writeRows(ss, name, body[name.toLowerCase()] || []);
  });
  return jsonResponse({ ok: true });
}

function readRows(ss, name) {
  var sheet = ss.getSheetByName(name);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function writeRows(ss, name, rows) {
  var sheet = ss.getSheetByName(name);
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  if (rows.length > 0) {
    var numCols = rows[0].length;
    sheet.getRange(2, 1, rows.length, numCols).setValues(rows);
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
