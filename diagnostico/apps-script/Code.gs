function doGet(e) {
  return jsonResponse_({
    ok: true,
    service: "tgtc-diagnostico",
    now: new Date().toISOString(),
    hint: "Usa doPost con action."
  });
}

function doPost(e) {
  try {
    const req = parseRequest_(e);
    const action = req.action;
    const payload = req.payload || {};

    let result;
    switch (action) {
      case "validarAcceso":
        result = validarAcceso(payload.email, payload.codigo, e);
        break;
      case "validarSesion":
        result = validarSesion(payload.token);
        break;
      case "guardarRespuesta":
        result = guardarRespuesta(payload.token, {
          bloque: payload.bloque,
          respuestas: payload.respuestas
        });
        break;
      case "enviarDiagnosticoFinal":
        result = enviarDiagnosticoFinal(payload.token, payload.respuestas);
        break;
      case "obtenerResultado":
        result = obtenerResultado(payload.token);
        break;
      case "logoutSesion":
        result = logoutSesion(payload.token);
        break;
      default:
        throw appError_(ERROR_CODES.BAD_REQUEST, "Acción no válida.");
    }

    return jsonResponse_(Object.assign({ ok: true }, result || {}));
  } catch (error) {
    return jsonResponse_({
      ok: false,
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      message: error.message || "Error interno"
    });
  }
}

function validarAcceso(email, codigo, e) {
  const emailNorm = String(email || "").trim().toLowerCase();
  const codeNorm = String(codigo || "").trim();
  if (!emailNorm || !codeNorm) {
    throw appError_(ERROR_CODES.BAD_REQUEST, "Email y código son obligatorios.");
  }

  const row = findFirst_(APP_CONFIG.SHEETS.ACCESOS, function (r) {
    return String(r.email || "").trim().toLowerCase() === emailNorm;
  });
  if (!row) {
    throw appError_(ERROR_CODES.INVALID_CREDENTIALS, "No se ha podido validar el acceso.");
  }

  const storedCode = String(row.codigo || "").trim();
  if (storedCode !== codeNorm) {
    throw appError_(ERROR_CODES.INVALID_CREDENTIALS, "No se ha podido validar el acceso.");
  }

  const estado = String(row.estado || "").trim().toLowerCase();
  if (estado === "bloqueado") {
    throw appError_(ERROR_CODES.ACCESS_BLOCKED, "El acceso no está disponible.");
  }
  if (estado && estado !== "activo") {
    throw appError_(ERROR_CODES.ACCESS_INACTIVE, "El acceso no está activo.");
  }

  const now = new Date();
  const start = parseDate_(row.fecha_inicio);
  const end = parseDate_(row.fecha_fin);
  if (start && now < start) {
    throw appError_(ERROR_CODES.ACCESS_INACTIVE, "El acceso aún no está activo.");
  }
  if (end && now > end) {
    throw appError_(ERROR_CODES.ACCESS_EXPIRED, "El acceso ha caducado.");
  }

  const oneUse = truthy_(row.un_solo_uso);
  const used = truthy_(row.usado);
  if (oneUse && used) {
    throw appError_(ERROR_CODES.ACCESS_INACTIVE, "Este acceso ya fue utilizado.");
  }

  const session = crearSesion(emailNorm, e);
  if (oneUse) {
    updateRow_(APP_CONFIG.SHEETS.ACCESOS, row.__row, { usado: "TRUE" });
  }

  return {
    token: session.token,
    email: emailNorm
  };
}

function crearSesion(email, e) {
  const now = new Date();
  const expira = new Date(now.getTime() + APP_CONFIG.SESSION_HOURS * 60 * 60 * 1000);
  const token = Utilities.getUuid().replace(/-/g, "") + "_" + Utilities.getUuid().slice(0, 8);

  appendRow_(APP_CONFIG.SHEETS.SESIONES, {
    token: token,
    email: email,
    creado: now.toISOString(),
    expira: expira.toISOString(),
    activo: "TRUE",
    ip_opcional: getIp_(e),
    user_agent_opcional: getUserAgent_(e)
  });

  return { token: token, expira: expira.toISOString() };
}

function validarSesion(token) {
  const session = getSessionOrThrow_(token);
  return {
    token: session.token,
    email: session.email,
    expira: session.expira
  };
}

function guardarRespuesta(token, payload) {
  const session = getSessionOrThrow_(token);
  const bloque = String(payload.bloque || "").trim();
  const respuestas = payload.respuestas || {};
  if (!bloque) {
    throw appError_(ERROR_CODES.BAD_REQUEST, "Bloque obligatorio.");
  }

  Object.keys(respuestas).forEach(function (preguntaId) {
    const val = respuestas[preguntaId];
    appendRow_(APP_CONFIG.SHEETS.RESPUESTAS, {
      email: session.email,
      session_token: session.token,
      bloque: bloque,
      pregunta_id: preguntaId,
      respuesta: serialize_(val),
      timestamp: new Date().toISOString()
    });
  });

  return { saved: true };
}

function enviarDiagnosticoFinal(token, respuestas) {
  const session = getSessionOrThrow_(token);
  const merged = Object.assign({}, getLatestResponsesByToken_(session.token), respuestas || {});
  const result = buildDiagnosticResult_(merged);

  appendRow_(APP_CONFIG.SHEETS.RESULTADOS, {
    email: session.email,
    session_token: session.token,
    resultado_json: JSON.stringify(result),
    resumen_texto: result.resumen_texto,
    fortalezas: JSON.stringify(result.fortalezas),
    prioridades: JSON.stringify(result.prioridades),
    creado: new Date().toISOString()
  });

  return { generated: true, resultado: result };
}

function obtenerResultado(token) {
  const session = getSessionOrThrow_(token);
  const rows = readRows_(APP_CONFIG.SHEETS.RESULTADOS).filter(function (r) {
    return String(r.session_token || "") === session.token;
  });
  if (rows.length === 0) {
    throw appError_(ERROR_CODES.NOT_FOUND, "No existe resultado para esta sesión.");
  }
  const latest = rows[rows.length - 1];
  return { resultado: parseJsonSafe_(latest.resultado_json) };
}

function logoutSesion(token) {
  const session = getSessionOrThrow_(token);
  updateRow_(APP_CONFIG.SHEETS.SESIONES, session.__row, { activo: "FALSE" });
  return { logout: true };
}

function getSessionOrThrow_(token) {
  const tokenNorm = String(token || "").trim();
  if (!tokenNorm) {
    throw appError_(ERROR_CODES.SESSION_INVALID, "Sesión inválida.");
  }
  const row = findFirst_(APP_CONFIG.SHEETS.SESIONES, function (r) {
    return String(r.token || "") === tokenNorm;
  });
  if (!row) {
    throw appError_(ERROR_CODES.SESSION_INVALID, "Sesión inválida.");
  }
  if (!truthy_(row.activo)) {
    throw appError_(ERROR_CODES.SESSION_INVALID, "Sesión no activa.");
  }
  const exp = parseDate_(row.expira);
  if (exp && new Date() > exp) {
    updateRow_(APP_CONFIG.SHEETS.SESIONES, row.__row, { activo: "FALSE" });
    throw appError_(ERROR_CODES.SESSION_EXPIRED, "Sesión caducada.");
  }
  return row;
}

function getLatestResponsesByToken_(token) {
  const rows = readRows_(APP_CONFIG.SHEETS.RESPUESTAS).filter(function (r) {
    return String(r.session_token || "") === token;
  });
  const out = {};
  rows.forEach(function (r) {
    out[r.pregunta_id] = parseValue_(r.respuesta);
  });
  return out;
}

function parseRequest_(e) {
  const post = e && e.postData ? e.postData.contents : "";
  if (!post) {
    return { action: param_(e, "action"), payload: parseJsonSafe_(param_(e, "payload") || "{}") };
  }
  const contentType = (e.postData.type || "").toLowerCase();
  if (contentType.indexOf("application/json") >= 0) {
    const body = parseJsonSafe_(post);
    return { action: body.action, payload: body.payload || {} };
  }
  return { action: param_(e, "action"), payload: parseJsonSafe_(param_(e, "payload") || "{}") };
}

function param_(e, key) {
  if (!e || !e.parameter) return "";
  return e.parameter[key] || "";
}

function parseJsonSafe_(text) {
  try {
    return JSON.parse(String(text || "{}"));
  } catch (_) {
    return {};
  }
}

function parseDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]") return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

function serialize_(value) {
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value || "");
}

function parseValue_(value) {
  const v = String(value || "");
  if (!v) return "";
  if (v.charAt(0) === "[" || v.charAt(0) === "{") {
    return parseJsonSafe_(v);
  }
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

function truthy_(value) {
  const t = String(value || "").trim().toLowerCase();
  return t === "true" || t === "1" || t === "si" || t === "yes";
}

function getIp_(e) {
  try {
    return (e && e.contextPath) ? String(e.contextPath) : "";
  } catch (_) {
    return "";
  }
}

function getUserAgent_(e) {
  try {
    return (e && e.parameter && e.parameter.ua) ? String(e.parameter.ua) : "";
  } catch (_) {
    return "";
  }
}

function appError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
