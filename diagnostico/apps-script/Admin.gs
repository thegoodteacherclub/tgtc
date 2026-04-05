/**
 * Menú de administración visible al abrir la hoja.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Diagnóstico TGTC")
    .addItem("Preparar estructura (una sola vez)", "setupDiagnosticoSheetsOnce")
    .addItem("Generar códigos faltantes", "generarCodigosFaltantes")
    .addToUi();
}

/**
 * Genera código para filas de `accesos` que no tengan valor en la columna `codigo`.
 * También rellena valores base si faltan: `estado=activo`, `usado=FALSE`.
 */
function generarCodigosFaltantes() {
  const sheet = getSheetByName_(APP_CONFIG.SHEETS.ACCESOS);
  const headers = getHeaders_(sheet);
  const idx = indexByHeader_(headers);
  validateAccesosColumns_(idx);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getActive().toast("No hay filas para procesar en 'accesos'.", "Diagnóstico TGTC", 5);
    return;
  }

  const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
  const values = dataRange.getValues();
  const existingCodes = new Set();
  values.forEach((row) => {
    const current = String(row[idx.codigo] || "").trim();
    if (current) existingCodes.add(current);
  });

  let updated = 0;
  values.forEach((row) => {
    const email = String(row[idx.email] || "").trim();
    if (!email) return;

    const codigo = String(row[idx.codigo] || "").trim();
    if (!codigo) {
      row[idx.codigo] = createUniqueCode_(existingCodes, 8);
      updated += 1;
    }

    if (idx.estado >= 0 && !String(row[idx.estado] || "").trim()) {
      row[idx.estado] = "activo";
    }
    if (idx.usado >= 0 && !String(row[idx.usado] || "").trim()) {
      row[idx.usado] = "FALSE";
    }
  });

  dataRange.setValues(values);
  SpreadsheetApp.flush();
  SpreadsheetApp.getActive().toast(
    "Proceso completado. Códigos generados: " + updated,
    "Diagnóstico TGTC",
    6
  );
}

function indexByHeader_(headers) {
  const map = {};
  headers.forEach((h, i) => {
    map[h] = i;
  });
  return {
    email: map.email ?? -1,
    codigo: map.codigo ?? -1,
    estado: map.estado ?? -1,
    usado: map.usado ?? -1
  };
}

function validateAccesosColumns_(idx) {
  const required = ["email", "codigo"];
  const missing = required.filter((k) => idx[k] < 0);
  if (missing.length > 0) {
    throw new Error("Faltan columnas en 'accesos': " + missing.join(", "));
  }
}

function createUniqueCode_(existing, len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    let out = "";
    for (let i = 0; i < len; i += 1) {
      const pos = Math.floor(Math.random() * chars.length);
      out += chars.charAt(pos);
    }
    code = out;
  } while (existing.has(code));
  existing.add(code);
  return code;
}
