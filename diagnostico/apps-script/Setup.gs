/**
 * Ejecuta esta función una sola vez para preparar la estructura del Spreadsheet.
 * Crea/actualiza hojas, cabeceras y formato básico.
 */
function setupDiagnosticoSheetsOnce() {
  const ss = SpreadsheetApp.openById(APP_CONFIG.SPREADSHEET_ID);

  const definitions = [
    {
      name: APP_CONFIG.SHEETS.ACCESOS,
      headers: ["email", "codigo", "nombre", "estado", "cohorte", "fecha_inicio", "fecha_fin", "un_solo_uso", "usado", "notas"]
    },
    {
      name: APP_CONFIG.SHEETS.SESIONES,
      headers: ["token", "email", "creado", "expira", "activo", "ip_opcional", "user_agent_opcional"]
    },
    {
      name: APP_CONFIG.SHEETS.RESPUESTAS,
      headers: ["email", "session_token", "bloque", "pregunta_id", "respuesta", "timestamp"]
    },
    {
      name: APP_CONFIG.SHEETS.RESULTADOS,
      headers: ["email", "session_token", "resultado_json", "resumen_texto", "fortalezas", "prioridades", "creado"]
    }
  ];

  definitions.forEach(function (def) {
    const sheet = ensureSheetWithHeaders_(ss, def.name, def.headers);
    formatSheetBasic_(sheet, def.headers.length);
    applyDateFormatsByHeader_(sheet, def.headers);
  });

  SpreadsheetApp.flush();
  Logger.log("Estructura de diagnóstico creada/actualizada correctamente.");
}

function ensureSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const currentLastCol = Math.max(sheet.getLastColumn(), headers.length);
  const currentHeaders = currentLastCol > 0
    ? sheet.getRange(1, 1, 1, currentLastCol).getValues()[0].map(String)
    : [];

  const sameHeaders = headers.every(function (h, i) {
    return (currentHeaders[i] || "").trim() === h;
  }) && currentHeaders.length >= headers.length;

  if (!sameHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function formatSheetBasic_(sheet, headerCount) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headerCount)
    .setFontWeight("bold")
    .setBackground("#f2ebf8")
    .setFontColor("#261336");
  sheet.autoResizeColumns(1, headerCount);
}

function applyDateFormatsByHeader_(sheet, headers) {
  const dateHeaders = ["fecha_inicio", "fecha_fin"];
  const dateTimeHeaders = ["creado", "expira", "timestamp"];

  headers.forEach(function (header, idx) {
    const col = idx + 1;
    if (dateHeaders.indexOf(header) !== -1) {
      sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("yyyy-mm-dd");
    }
    if (dateTimeHeaders.indexOf(header) !== -1) {
      sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
    }
  });
}
