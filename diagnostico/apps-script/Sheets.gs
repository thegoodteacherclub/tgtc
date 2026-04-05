function getSpreadsheet_() {
  return SpreadsheetApp.openById(APP_CONFIG.SPREADSHEET_ID);
}

function getSheetByName_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw new Error("No existe la hoja: " + name);
  }
  return sheet;
}

function getHeaders_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.map((h) => String(h || "").trim());
}

function readRows_(sheetName) {
  const sheet = getSheetByName_(sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return rows.map((values, idx) => {
    const obj = { __row: idx + 2 };
    headers.forEach((h, i) => {
      obj[h] = values[i];
    });
    return obj;
  });
}

function appendRow_(sheetName, record) {
  const sheet = getSheetByName_(sheetName);
  const headers = getHeaders_(sheet);
  const row = headers.map((h) => (record[h] !== undefined ? record[h] : ""));
  sheet.appendRow(row);
}

function updateRow_(sheetName, rowNumber, record) {
  const sheet = getSheetByName_(sheetName);
  const headers = getHeaders_(sheet);
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const next = headers.map((h, i) => (record[h] !== undefined ? record[h] : values[i]));
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([next]);
}

function findFirst_(sheetName, predicate) {
  const rows = readRows_(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (predicate(rows[i])) {
      return rows[i];
    }
  }
  return null;
}
