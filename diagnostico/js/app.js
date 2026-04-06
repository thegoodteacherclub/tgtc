import { CONFIG } from "./config.js?v=20260405i";
import { BLOCKS, SCALE_OPTIONS } from "./questions.js?v=20260405i";
import { getLevelLabel, normalizeResult } from "./scoring.js?v=20260405i";
import {
  validarAcceso,
  validarSesion,
  guardarRespuesta,
  subirActividad,
  enviarDiagnosticoFinal,
  analizarActividadIA,
  obtenerResultado,
  logoutSesion
} from "./api.js?v=20260405i";

const app = document.querySelector("[data-app]");
const screens = Array.from(document.querySelectorAll("[data-screen]"));
const loader = document.querySelector("[data-loader]");
const loaderText = document.querySelector("[data-loader-text]");
const logoutButtons = [document.querySelector("[data-logout]"), document.querySelector("[data-logout-2]")].filter(Boolean);

const formAcceso = document.querySelector("[data-form-acceso]");
const accesoAlert = document.querySelector("[data-acceso-alert]");
const startButton = document.querySelector("[data-start]");
const wizardAlert = document.querySelector("[data-wizard-alert]");
const wizardRoot = document.querySelector("[data-wizard-content]");
const progressText = document.querySelector("[data-progress-text]");
const progressFill = document.querySelector("[data-progress-fill]");
const nextButton = document.querySelector("[data-next]");
const prevButton = document.querySelector("[data-prev]");
const reviewButton = document.querySelector("[data-review]");
const downloadPdfButton = document.querySelector("[data-download-pdf]");
const resultRoot = document.querySelector("[data-resultado]");
const debugParams = new URLSearchParams(window.location.search);
const DEBUG_MODE = debugParams.get("debug") === "1";

const state = {
  token: null,
  email: "",
  step: 0,
  answers: loadLocalDraft(),
  finalResult: null
};

function showLoader(text = "Procesando...") {
  loaderText.textContent = text;
  loader.hidden = false;
}

function hideLoader() {
  loader.hidden = true;
}

function setAlert(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

function showScreen(id) {
  screens.forEach((screen) => {
    screen.hidden = screen.dataset.screen !== id;
  });
}

function setSession(token) {
  state.token = token;
  sessionStorage.setItem(CONFIG.SESSION_KEY, token);
  logoutButtons.forEach((btn) => { btn.hidden = false; });
}

function clearSession() {
  state.token = null;
  sessionStorage.removeItem(CONFIG.SESSION_KEY);
  logoutButtons.forEach((btn) => { btn.hidden = true; });
}

function loadLocalDraft() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.DRAFT_KEY) || "{}");
  } catch (_) {
    return {};
  }
}

function persistLocalDraft() {
  localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(state.answers));
}

function prefillDebugAnswers() {
  BLOCKS.forEach((block) => {
    block.questions.forEach((question) => {
      if (!question.required || state.answers[question.id] !== undefined) {
        return;
      }
      if (question.type === "text") {
        state.answers[question.id] = "Respuesta de prueba";
        return;
      }
      if (question.type === "textarea") {
        state.answers[question.id] = "Texto de prueba para validación rápida.";
        return;
      }
      if (question.type === "select" || question.type === "single") {
        state.answers[question.id] = (question.options && question.options[0]) || "";
        return;
      }
      if (question.type === "multi") {
        state.answers[question.id] = (question.options && question.options[0]) ? [question.options[0]] : [];
        return;
      }
      if (question.type === "scale") {
        state.answers[question.id] = SCALE_OPTIONS[0]?.value || 1;
      }
    });
  });

  const debugFileId = String(debugParams.get("fileId") || "").trim();
  if (debugFileId) {
    state.answers.u_archivo_file_id = debugFileId;
    state.answers.u_archivo_nombre = state.answers.u_archivo_nombre || "archivo-debug";
  }
}

function getDebugStep() {
  const raw = String(debugParams.get("step") || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "last") return BLOCKS.length - 1;
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= BLOCKS.length) {
    return asNumber - 1;
  }
  const idx = BLOCKS.findIndex((b) => String(b.id || "").toLowerCase() === raw);
  return idx >= 0 ? idx : null;
}

function applyDebugNavigationOptions() {
  if (!(DEBUG_MODE && debugParams.get("autostart") === "1")) {
    return;
  }

  if (debugParams.get("autofill") === "1") {
    prefillDebugAnswers();
    persistLocalDraft();
  }

  const forcedStep = getDebugStep();
  if (forcedStep !== null) {
    state.step = forcedStep;
  }

  showScreen("wizard");
  renderWizardStep();

  if (debugParams.get("autorun") === "1" && state.step === BLOCKS.length - 1) {
    finishDiagnostic();
  }
}

function renderField(question) {
  const value = state.answers[question.id];
  const required = question.required ? "required" : "";
  if (question.type === "text") {
    return `
      <label class="diag-field">
        <span>${question.label}</span>
        <input type="text" name="${question.id}" ${required} value="${escapeHtml(value || "")}">
      </label>
      ${renderQuestionHelp(question)}
    `;
  }
  if (question.type === "textarea") {
    return `
      <label class="diag-field">
        <span>${question.label}</span>
        <textarea name="${question.id}" ${required}>${escapeHtml(value || "")}</textarea>
      </label>
      ${renderQuestionHelp(question)}
    `;
  }
  if (question.type === "file") {
    const uploadedName = state.answers[`${question.id}_nombre`] || "";
    const accept = question.accept ? `accept="${question.accept}"` : "";
    return `
      <label class="diag-field">
        <span>${question.label}</span>
        <input type="file" name="${question.id}" ${accept}>
      </label>
      ${uploadedName ? `<p class="diag-help">Archivo actual: <strong>${escapeHtml(uploadedName)}</strong></p>` : ""}
    `;
  }
  if (question.type === "select") {
    const options = question.options.map((option) => {
      const selected = value === option ? "selected" : "";
      return `<option value="${escapeHtml(option)}" ${selected}>${option}</option>`;
    }).join("");
    return `
      <label class="diag-field">
        <span>${question.label}</span>
        <select name="${question.id}" ${required}>
          <option value="">Selecciona una opción</option>
          ${options}
        </select>
      </label>
    `;
  }
  if (question.type === "single") {
    return `
      <div class="diag-question">
        <label class="diag-label">${question.label}</label>
        <div class="diag-options">
          ${question.options.map((option, idx) => {
            const checked = value === option ? "checked" : "";
            const id = `${question.id}_${idx}`;
            return `
              <div class="diag-option">
                <input id="${id}" type="radio" name="${question.id}" value="${escapeHtml(option)}" ${checked} ${required}>
                <label for="${id}">${option}</label>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
  if (question.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return `
      <div class="diag-question">
        <label class="diag-label">${question.label}</label>
        <div class="diag-options compact">
          ${question.options.map((option, idx) => {
            const checked = selected.includes(option) ? "checked" : "";
            const id = `${question.id}_${idx}`;
            return `
              <div class="diag-option">
                <input id="${id}" type="checkbox" name="${question.id}" value="${escapeHtml(option)}" ${checked}>
                <label for="${id}">${option}</label>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
  if (question.type === "scale") {
    const numeric = Number(value) || 0;
    return `
      <div class="diag-question diag-scale-row">
        <label class="diag-label">${question.dimension}. ${question.label}</label>
        <div class="diag-scale-grid">
          ${SCALE_OPTIONS.map((opt) => {
            const id = `${question.id}_${opt.value}`;
            const checked = numeric === opt.value ? "checked" : "";
            return `
              <div class="diag-option">
                <input id="${id}" type="radio" name="${question.id}" value="${opt.value}" ${checked} ${required}>
                <label for="${id}">
                  <strong>${opt.label}</strong>
                </label>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
  return "";
}

function renderQuestionHelp(question) {
  const helpText = question.help || getDefaultHelpText(question);
  return `
    <details class="diag-help-toggle" title="Ayuda">
      <summary aria-label="Ayuda para completar este campo">i</summary>
      <p><strong>Ayuda</strong><br>${escapeHtml(helpText)}</p>
    </details>
  `;
}

function getDefaultHelpText(question) {
  if (question.type === "file") {
    return "Sube una actividad real que uses en clase. Puede ser una ficha, guía, tarea o secuencia breve. No hace falta que esté perfecta: buscamos material real para orientar mejor la devolución.";
  }
  if (question.type === "textarea") {
    return "Escribe una respuesta breve y concreta (3-6 líneas). Describe lo que haces realmente en el aula, evitando respuestas genéricas o ideales.";
  }
  if (question.type === "text") {
    return "Escribe una respuesta corta y específica. Si puedes, usa ejemplos concretos de tu actividad para que la lectura final sea más útil.";
  }
  if (question.type === "select" || question.type === "single") {
    return "Selecciona la opción que mejor describa tu práctica habitual, no la situación ideal ni una excepción puntual.";
  }
  if (question.type === "multi") {
    return "Marca todas las opciones que te representen de forma frecuente. No hace falta marcar muchas: prioriza las que más impacto tienen en tu actividad.";
  }
  if (question.type === "scale") {
    return "Valora esta dimensión según lo que ocurre en tu actividad real. Si dudas entre dos niveles, elige el nivel más conservador.";
  }
  return "Responde desde tu práctica real para que el diagnóstico sea preciso y accionable.";
}

function renderWizardStep() {
  const block = BLOCKS[state.step];
  const step = state.step + 1;
  const total = BLOCKS.length;
  progressText.textContent = `Paso ${step} de ${total}`;
  progressFill.style.width = `${(step / total) * 100}%`;
  prevButton.hidden = state.step === 0;
  nextButton.textContent = state.step === total - 1 ? "Generar resultado" : "Guardar y continuar";
  setAlert(wizardAlert, "");

  wizardRoot.innerHTML = `
    <section>
      <h3 class="diag-block-title">${block.title}</h3>
      <p class="diag-block-sub">${block.subtitle}</p>
      <form class="diag-form" data-wizard-form>
        ${block.questions.map(renderField).join("")}
      </form>
    </section>
  `;
}

function readStepData() {
  const block = BLOCKS[state.step];
  const form = wizardRoot.querySelector("[data-wizard-form]");
  if (!form) {
    return null;
  }
  const payload = {};
  const files = [];
  for (const question of block.questions) {
    if (question.type === "file") {
      const input = form.querySelector(`[name="${question.id}"]`);
      const file = input && input.files ? input.files[0] : null;
      const existingFileId = state.answers[`${question.id}_file_id`];
      if (question.required && !file && !existingFileId) {
        return { error: `Completa "${question.label}".` };
      }
      if (file) {
        files.push({
          questionId: question.id,
          file
        });
      }
      continue;
    }
    if (question.type === "multi") {
      const values = Array.from(form.querySelectorAll(`input[name="${question.id}"]:checked`)).map((el) => el.value);
      if (question.required && values.length === 0) {
        return { error: `Completa "${question.label}".` };
      }
      payload[question.id] = values;
      continue;
    }
    const field = form.querySelector(`[name="${question.id}"]:checked`) || form.querySelector(`[name="${question.id}"]`);
    const value = field ? String(field.value || "").trim() : "";
    if (question.required && !value) {
      return { error: `Completa "${question.label}".` };
    }
    payload[question.id] = question.type === "scale" ? Number(value || 0) : value;
  }
  return { payload, files, blockId: block.id };
}

async function saveStepAndContinue() {
  const current = readStepData();
  if (!current || current.error) {
    setAlert(wizardAlert, current?.error || "Revisa este bloque.");
    return;
  }

  Object.assign(state.answers, current.payload);
  try {
    showLoader("Guardando progreso...");

    if (current.files.length > 0) {
      for (const f of current.files) {
        const base64 = await readFileAsBase64(f.file);
        const uploaded = await subirActividad(state.token, {
          file_name: f.file.name,
          file_mime: f.file.type || "application/octet-stream",
          file_base64: base64
        });
        state.answers[`${f.questionId}_file_id`] = uploaded.file_id;
        state.answers[`${f.questionId}_nombre`] = uploaded.nombre;
        state.answers[`${f.questionId}_uploaded`] = true;
        current.payload[`${f.questionId}_file_id`] = uploaded.file_id;
        current.payload[`${f.questionId}_nombre`] = uploaded.nombre;
        current.payload[`${f.questionId}_uploaded`] = true;
      }
    }
    await guardarRespuesta(state.token, current.blockId, current.payload);
  } catch (error) {
    if (error.code === "SESSION_INVALID") {
      await forceLogout("La sesión ha caducado. Vuelve a acceder.");
      return;
    }
    setAlert(wizardAlert, error.message || "No se ha podido guardar este paso.");
    return;
  } finally {
    persistLocalDraft();
    hideLoader();
  }

  if (state.step === BLOCKS.length - 1) {
    await finishDiagnostic();
    return;
  }

  state.step += 1;
  renderWizardStep();
}

async function finishDiagnostic() {
  let iaWarning = "";
  try {
    showLoader("Generando devolución final...");
    await enviarDiagnosticoFinal(state.token, state.answers);
    if (state.answers.u_archivo_file_id) {
      try {
        showLoader("Analizando actividad con IA...");
        await analizarActividadIA(state.token);
      } catch (error) {
        iaWarning = error?.message || "No se ha podido completar el análisis con IA en este momento.";
      }
    }
    const resultResponse = await obtenerResultado(state.token);
    state.finalResult = normalizeResult(resultResponse.resultado);
    renderResult(state.finalResult);
    showScreen("resultado");
    if (iaWarning) {
      setAlert(accesoAlert, "");
      setAlert(wizardAlert, "");
      // Mostramos aviso no bloqueante en la pantalla de resultado.
      resultRoot.insertAdjacentHTML(
        "afterbegin",
        `<p class="diag-alert">Se ha generado tu resultado base. ${escapeHtml(iaWarning)}</p>`
      );
    }
  } catch (error) {
    if (error.code === "SESSION_INVALID") {
      await forceLogout("La sesión ha caducado. Vuelve a acceder.");
      return;
    }
    setAlert(wizardAlert, error.message || "No se ha podido generar el resultado.");
  } finally {
    hideLoader();
  }
}

function renderDimensionCard(name, dim) {
  const level = getLevelLabel(dim.score || 0);
  const levelClass = getPriorityClass(dim.score || 0);
  return `
    <article class="diag-result-card">
      <h3 class="diag-dim-title">${name} <span class="diag-badge ${levelClass}">${level}</span></h3>
      <p><strong>Por qué importa:</strong> ${dim.importancia || ""}</p>
      <p><strong>Ajuste inicial recomendado:</strong> ${dim.ajuste || ""}</p>
    </article>
  `;
}

function toScorePercent(score) {
  const numeric = Number(score) || 0;
  return Math.max(0, Math.min(100, (numeric / 4) * 100));
}

function shortList(list, max = 3) {
  return (Array.isArray(list) ? list : []).slice(0, max);
}

function renderSimpleList(items) {
  const safeItems = shortList(items, 3);
  if (!safeItems.length) return "";
  return `<ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function normalizeLecturaDocumento(ia) {
  if (Array.isArray(ia?.lectura_documento_ia) && ia.lectura_documento_ia.length) {
    return ia.lectura_documento_ia
      .map((item) => ({
        cita: String(item?.cita || "").trim(),
        interpretacion: String(item?.interpretacion || "").trim(),
        impacto: String(item?.impacto || "").trim()
      }))
      .filter((item) => item.cita || item.interpretacion || item.impacto)
      .slice(0, 5);
  }

  if (Array.isArray(ia?.evidencias_documento_ia) && ia.evidencias_documento_ia.length) {
    return ia.evidencias_documento_ia.slice(0, 5).map((item) => ({
      cita: String(item || "").trim(),
      interpretacion: "",
      impacto: ""
    }));
  }

  return [];
}

function normalizeAjustesPrioritarios(ia) {
  if (!Array.isArray(ia?.ajustes_prioritarios_ia)) return [];
  return ia.ajustes_prioritarios_ia
    .map((item) => ({
      problema: String(item?.problema_detectado || "").trim(),
      evidencia: String(item?.evidencia || "").trim(),
      cambio: String(item?.cambio_recomendado || "").trim(),
      paso: String(item?.paso_clase_siguiente || "").trim()
    }))
    .filter((item) => item.problema || item.evidencia || item.cambio || item.paso)
    .slice(0, 4);
}

function removeScoreMentions(text) {
  return String(text || "")
    .replace(/\bscore\s*[:=]?\s*\d+(\.\d+)?\b/gi, "")
    .replace(/\bpuntuaci[oó]n\s*[:=]?\s*\d+(\.\d+)?\b/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\s+;/g, ";")
    .trim();
}

function renderVisualSummary(result) {
  const dimensiones = Object.entries(result.dimensiones || {});
  const total = dimensiones.length || 1;
  const avgScore = dimensiones.reduce((acc, [, dim]) => acc + (Number(dim.score) || 0), 0) / total;
  const avgScoreRounded = Math.round(avgScore);
  const avgPct = toScorePercent(avgScore);
  const prioritario = dimensiones.filter(([, dim]) => (Number(dim.score) || 0) < 2).length;
  const solido = dimensiones.filter(([, dim]) => (Number(dim.score) || 0) >= 3).length;
  const barras = dimensiones.map(([name, dim]) => {
    const score = Number(dim.score) || 0;
    const scoreRounded = Math.round(score);
    return `
      <div class="diag-bar-row">
        <div class="diag-bar-head">
          <span>${escapeHtml(name)}</span>
          <span>${scoreRounded}/4</span>
        </div>
        <div class="diag-bar-track"><span style="width:${toScorePercent(score)}%"></span></div>
      </div>
    `;
  }).join("");

  return `
    <article class="diag-result-card diag-visual">
      <h3>0. Panel visual rápido</h3>
      <div class="diag-kpis">
        <div class="diag-kpi">
          <strong>${avgScoreRounded}/4</strong>
          <span>Nivel global</span>
          <div class="diag-kpi-track"><span style="width:${avgPct}%"></span></div>
        </div>
        <div class="diag-kpi">
          <strong>${prioritario}</strong>
          <span>Dimensiones prioritarias</span>
        </div>
        <div class="diag-kpi">
          <strong>${solido}</strong>
          <span>Dimensiones sólidas</span>
        </div>
      </div>
      <div class="diag-bars">${barras}</div>
    </article>
  `;
}

function renderResult(result) {
  const visualHtml = renderVisualSummary(result);
  const dimensionesHtml = Object.entries(result.dimensiones || {})
    .map(([name, data]) => renderDimensionCard(name, data))
    .join("");

  const ia = result.analisisIA || null;
  const lecturaDocumento = normalizeLecturaDocumento(ia);
  const ajustesPrioritarios = normalizeAjustesPrioritarios(ia);

  const lecturaDocHtml = lecturaDocumento.length ? `
    <article class="diag-result-card">
      <h3>6. Qué se ve en tu documento (evidencias reales)</h3>
      <div class="diag-evidence-grid">
        ${lecturaDocumento.map((item) => `
          <article class="diag-evidence-card">
            ${item.cita ? `<p class="diag-evidence-quote">"${escapeHtml(item.cita)}"</p>` : ""}
            ${item.interpretacion ? `<p><strong>Lectura didáctica:</strong> ${escapeHtml(item.interpretacion)}</p>` : ""}
            ${item.impacto ? `<p><strong>Impacto en aprendizaje:</strong> ${escapeHtml(item.impacto)}</p>` : ""}
          </article>
        `).join("")}
      </div>
    </article>
  ` : `
    <article class="diag-result-card">
      <h3>6. Evidencia de lectura del documento</h3>
      <p>No se han detectado citas legibles del archivo. Para un análisis más preciso, sube la actividad en formato texto, DOCX o Google Docs.</p>
    </article>
  `;

  const ajustesHtml = ajustesPrioritarios.length ? `
    <article class="diag-result-card">
      <h3>8. Ajustes prioritarios</h3>
      <div class="diag-adjust-grid">
        ${ajustesPrioritarios.map((item) => `
          <article class="diag-adjust-card">
            ${item.problema ? `<p><strong>Qué ajustar:</strong> ${escapeHtml(item.problema)}</p>` : ""}
            ${item.evidencia ? `<p><strong>Dónde se ve:</strong> ${escapeHtml(item.evidencia)}</p>` : ""}
            ${item.cambio ? `<p><strong>Cómo mejorarlo:</strong> ${escapeHtml(item.cambio)}</p>` : ""}
            ${item.paso ? `<p><strong>Qué hacer en la siguiente clase:</strong> ${escapeHtml(item.paso)}</p>` : ""}
          </article>
        `).join("")}
      </div>
    </article>
  ` : "";

  const matrizTgtcHtml = (ia?.matriz_tgtc_ia || [])
    .map((row) => {
      const criterio = escapeHtml(row?.criterio || "");
      const nivel = escapeHtml(row?.nivel || "");
      const evidencia = escapeHtml(removeScoreMentions(row?.evidencia || ""));
      const ajuste = escapeHtml(row?.ajuste || "");
      const nivelClass = getPriorityClassFromLabel(row?.nivel || "");
      return `
        <li class="diag-matrix-item">
          <p class="diag-matrix-title"><strong>${criterio}</strong> <span class="diag-badge ${nivelClass}">${nivel}</span></p>
          <p><strong>Evidencia:</strong> ${evidencia}</p>
          <p><strong>Ajuste:</strong> ${ajuste}</p>
        </li>
      `;
    })
    .join("");
  const docAnalysisHtml = ia ? `
    <section class="diag-section-group diag-doc-group">
      <article class="diag-result-card diag-section-head">
        <h3>Análisis del documento que has aportado</h3>
        <p>Este bloque se genera solo si has subido un documento.</p>
      </article>
      ${lecturaDocHtml}
      <article class="diag-result-card">
        <h3>7. Conclusión orientadora del análisis IA</h3>
        <p>${escapeHtml(ia.resumen_ia || "")}</p>
        ${renderSimpleList(ia.fortalezas_ia) ? `<p><strong>Fortalezas clave:</strong></p>${renderSimpleList(ia.fortalezas_ia)}` : ""}
        ${renderSimpleList(ia.riesgos_ia) ? `<p><strong>Riesgos que conviene atacar ya:</strong></p>${renderSimpleList(ia.riesgos_ia)}` : ""}
        ${renderSimpleList(ia.sugerencias_ia) ? `<p><strong>Sugerencias concretas:</strong></p>${renderSimpleList(ia.sugerencias_ia)}` : ""}
        <p><strong>Siguiente paso recomendado:</strong> ${escapeHtml(ia.siguiente_paso_ia || "")}</p>
      </article>
      ${ajustesHtml}
      ${matrizTgtcHtml ? `<article class="diag-result-card"><h3>9. Orientaciones para cada dimensión</h3><ul class="diag-matrix">${matrizTgtcHtml}</ul></article>` : ""}
    </section>
  ` : "";

  resultRoot.innerHTML = `
    ${visualHtml}
    <section class="diag-section-group">
      <article class="diag-result-card diag-section-head">
        <h3>Análisis de tus respuestas y contexto</h3>
      </article>
      <article class="diag-result-card">
        <h3>1. Resumen general</h3>
        <p>${escapeHtml(result.resumen || "")}</p>
      </article>
      <article class="diag-result-card">
        <h3>2. Lo que ya sostienes bien</h3>
        <ul>${shortList(result.fortalezas, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="diag-result-card">
        <h3>3. Lo que hoy está frenando más la calidad</h3>
        <ul>${shortList(result.frenos, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
      <article class="diag-result-card">
        <h3>4. Lectura por dimensiones</h3>
        <div class="diag-result">${dimensionesHtml}</div>
      </article>
      <article class="diag-result-card">
        <h3>5. Tus 3 prioridades de mejora</h3>
        <ul>${shortList(result.prioridades, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </section>
    ${docAnalysisHtml}
  `;
}

function downloadResultPdf() {
  const resultHtml = String(resultRoot?.innerHTML || "").trim();
  if (!resultHtml) {
    window.alert("Todavía no hay resultado generado para descargar.");
    return;
  }

  const generatedAt = new Date().toLocaleString("es-ES", {
    dateStyle: "long",
    timeStyle: "short"
  });
  const printHead = document.createElement("div");
  printHead.className = "diag-print-head";
  printHead.innerHTML = `
    <h1>Diagnóstico inicial · The Good Teacher Club</h1>
    <p>Generado el ${escapeHtml(generatedAt)}</p>
  `;
  resultRoot.prepend(printHead);
  document.body.classList.add("diag-print-mode");

  const cleanup = () => {
    document.body.classList.remove("diag-print-mode");
    if (printHead.parentNode) {
      printHead.parentNode.removeChild(printHead);
    }
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(() => {
    window.print();
  }, 80);
}

function getPriorityClass(score) {
  const s = Number(score) || 0;
  if (s < 2) return "diag-priority-high";
  if (s < 2.75) return "diag-priority-medium";
  if (s < 3.5) return "diag-priority-low";
  return "diag-priority-ok";
}

function getPriorityClassFromLabel(label) {
  const t = String(label || "").toLowerCase();
  if (t.includes("prioritario")) return "diag-priority-high";
  if (t.includes("desarrollo") || t.includes("estructura")) return "diag-priority-medium";
  if (t.includes("resuelto")) return "diag-priority-low";
  if (t.includes("sólido") || t.includes("solido")) return "diag-priority-ok";
  return "diag-priority-medium";
}

async function forceLogout(message = "") {
  clearSession();
  state.step = 0;
  state.answers = {};
  localStorage.removeItem(CONFIG.DRAFT_KEY);
  showScreen("acceso");
  setAlert(accesoAlert, message);
}

async function handleLogout() {
  try {
    showLoader("Cerrando sesión...");
    if (state.token) {
      await logoutSesion(state.token);
    }
  } catch (_) {
    // Silencioso: cerramos en cliente igualmente.
  } finally {
    hideLoader();
    await forceLogout();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se ha podido leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function bootstrapSessionIfExists() {
  const token = sessionStorage.getItem(CONFIG.SESSION_KEY);
  if (!token) {
    showScreen("acceso");
    return;
  }
  try {
    showLoader("Validando sesión...");
    const res = await validarSesion(token);
    setSession(token);
    state.email = res.email || "";
    showScreen("intro");
    applyDebugNavigationOptions();
  } catch (_) {
    clearSession();
    showScreen("acceso");
  } finally {
    hideLoader();
  }
}

formAcceso.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAlert(accesoAlert, "");
  const email = String(formAcceso.email.value || "").trim().toLowerCase();
  const codigo = String(formAcceso.codigo.value || "").trim();
  if (!email || !codigo) {
    setAlert(accesoAlert, "Introduce email y código para acceder.");
    return;
  }
  try {
    showLoader("Validando acceso...");
    const res = await validarAcceso(email, codigo);
    setSession(res.token);
    state.email = email;
    state.answers = {};
    persistLocalDraft();
    showScreen("intro");
  } catch (error) {
    setAlert(accesoAlert, error.message || "No se ha podido validar el acceso.");
  } finally {
    hideLoader();
  }
});

startButton.addEventListener("click", () => {
  if (DEBUG_MODE && debugParams.get("autofill") === "1") {
    prefillDebugAnswers();
    persistLocalDraft();
  }
  if (DEBUG_MODE) {
    const forcedStep = getDebugStep();
    if (forcedStep !== null) {
      state.step = forcedStep;
    }
  }
  showScreen("wizard");
  renderWizardStep();
});

nextButton.addEventListener("click", saveStepAndContinue);
prevButton.addEventListener("click", () => {
  if (state.step === 0) {
    return;
  }
  state.step -= 1;
  renderWizardStep();
});

reviewButton.addEventListener("click", () => {
  showScreen("wizard");
  renderWizardStep();
});

if (downloadPdfButton) {
  downloadPdfButton.addEventListener("click", downloadResultPdf);
}

logoutButtons.forEach((btn) => btn.addEventListener("click", handleLogout));

if (app) {
  if (DEBUG_MODE) {
    window.__diagDebug = {
      state,
      prefillDebugAnswers,
      finishDiagnostic,
      goToStep(step) {
        const n = Number(step);
        if (Number.isInteger(n) && n >= 1 && n <= BLOCKS.length) {
          state.step = n - 1;
          showScreen("wizard");
          renderWizardStep();
        }
      }
    };
  }
  bootstrapSessionIfExists();
}
