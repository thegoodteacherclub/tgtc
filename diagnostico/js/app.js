import { CONFIG } from "./config.js";
import { BLOCKS, SCALE_OPTIONS } from "./questions.js";
import { getLevelLabel, getLevelMeaning, normalizeResult } from "./scoring.js";
import {
  validarAcceso,
  validarSesion,
  guardarRespuesta,
  enviarDiagnosticoFinal,
  obtenerResultado,
  logoutSesion
} from "./api.js";

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
const resultRoot = document.querySelector("[data-resultado]");

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

function renderField(question) {
  const value = state.answers[question.id];
  const required = question.required ? "required" : "";
  if (question.type === "text") {
    return `
      <label class="diag-field">
        <span>${question.label}</span>
        <input type="text" name="${question.id}" ${required} value="${escapeHtml(value || "")}">
      </label>
    `;
  }
  if (question.type === "textarea") {
    return `
      <label class="diag-field">
        <span>${question.label}</span>
        <textarea name="${question.id}" ${required}>${escapeHtml(value || "")}</textarea>
      </label>
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
  for (const question of block.questions) {
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
  return { payload, blockId: block.id };
}

async function saveStepAndContinue() {
  const current = readStepData();
  if (!current || current.error) {
    setAlert(wizardAlert, current?.error || "Revisa este bloque.");
    return;
  }

  Object.assign(state.answers, current.payload);
  persistLocalDraft();

  try {
    showLoader("Guardando progreso...");
    await guardarRespuesta(state.token, current.blockId, current.payload);
  } finally {
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
  try {
    showLoader("Generando devolución final...");
    await enviarDiagnosticoFinal(state.token, state.answers);
    const resultResponse = await obtenerResultado(state.token);
    state.finalResult = normalizeResult(resultResponse.resultado);
    renderResult(state.finalResult);
    showScreen("resultado");
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
  const meaning = getLevelMeaning(dim.score || 0);
  return `
    <article class="diag-result-card">
      <h3>${name}</h3>
      <p><strong>Nivel:</strong> ${level}</p>
      <p><strong>Qué significa:</strong> ${meaning}</p>
      <p><strong>Por qué importa:</strong> ${dim.importancia || ""}</p>
      <p><strong>Ajuste inicial recomendado:</strong> ${dim.ajuste || ""}</p>
    </article>
  `;
}

function renderResult(result) {
  const dimensionesHtml = Object.entries(result.dimensiones || {})
    .map(([name, data]) => renderDimensionCard(name, data))
    .join("");

  resultRoot.innerHTML = `
    <article class="diag-result-card">
      <h3>1. Resumen general</h3>
      <p>${result.resumen}</p>
    </article>
    <article class="diag-result-card">
      <h3>2. Lo que ya sostienes bien</h3>
      <ul>${(result.fortalezas || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    </article>
    <article class="diag-result-card">
      <h3>3. Lo que hoy está frenando más la calidad</h3>
      <ul>${(result.frenos || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    </article>
    <article class="diag-result-card">
      <h3>4. Lectura por dimensiones</h3>
      <div class="diag-result">${dimensionesHtml}</div>
    </article>
    <article class="diag-result-card">
      <h3>5. Tus 3 prioridades de mejora</h3>
      <ul>${(result.prioridades || []).slice(0, 3).map((item) => `<li>${item}</li>`).join("")}</ul>
    </article>
    <article class="diag-result-card">
      <h3>6. Tu siguiente paso recomendado</h3>
      <p>${result.primerPaso}</p>
      <p>${result.cierre}</p>
    </article>
  `;
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
    showScreen("intro");
  } catch (error) {
    setAlert(accesoAlert, error.message || "No se ha podido validar el acceso.");
  } finally {
    hideLoader();
  }
});

startButton.addEventListener("click", () => {
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

logoutButtons.forEach((btn) => btn.addEventListener("click", handleLogout));

if (app) {
  bootstrapSessionIfExists();
}
