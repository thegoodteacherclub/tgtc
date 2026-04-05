import { CONFIG } from "./config.js";

async function request(action, payload = {}) {
  const params = new URLSearchParams();
  params.set("action", action);
  params.set("payload", JSON.stringify(payload));

  const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: "POST",
    body: params
  });

  if (!response.ok) {
    throw new Error("No hemos podido conectar con el servicio.");
  }

  const data = await response.json();
  if (!data.ok) {
    const message = data.message || "No se ha podido completar la acción.";
    const error = new Error(message);
    error.code = data.code || "UNKNOWN_ERROR";
    throw error;
  }
  return data;
}

export function validarAcceso(email, codigo) {
  return request("validarAcceso", { email, codigo });
}

export function validarSesion(token) {
  return request("validarSesion", { token });
}

export function guardarRespuesta(token, bloque, respuestas) {
  return request("guardarRespuesta", { token, bloque, respuestas });
}

export function enviarDiagnosticoFinal(token, respuestas) {
  return request("enviarDiagnosticoFinal", { token, respuestas });
}

export function obtenerResultado(token) {
  return request("obtenerResultado", { token });
}

export function logoutSesion(token) {
  return request("logoutSesion", { token });
}
