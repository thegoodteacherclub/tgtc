const STORAGE_KEY = "tgtc-static-form-v1";
const API_PROXY_URL = "https://actividades.thegoodteacherclub.workers.dev";

const STAGE_OPTIONS = ["Primaria / básica", "Secundaria / media", "Otra etapa"];
const SUBJECT_OPTIONS = [
  "Lengua y literatura",
  "Ciencias sociales / geografía / historia",
  "Ciencias naturales",
  "Matemáticas",
  "Tecnología / informática",
  "Educación artística",
  "Idioma extranjero",
  "Ciudadanía / valores / ética",
  "Tutoría / orientación",
  "Otra"
];
const COUNTRY_OPTIONS = ["España", "México", "Colombia", "Argentina", "Perú", "Chile", "Ecuador", "Honduras", "Uruguay", "Otros"];
const ACTIVITY_TYPE_OPTIONS = [
  "Presentación didáctica breve",
  "Dossier de actividades",
  "Secuencia completa de aula",
  "Debate o análisis guiado",
  "Reto o mini proyecto"
];
const LOADING_STEPS = [
  "Analizando la base informativa",
  "Diseñando la secuencia",
  "Ajustando apoyos y gradación",
  "Preparando la propuesta final"
];
const TABS = [
  { key: "student", label: "Cuaderno del alumnado" },
  { key: "teacher", label: "Cuaderno docente" },
  { key: "sequence", label: "Secuencia en aula" },
  { key: "assessment", label: "Evaluación" },
  { key: "dimensions", label: "Dimensiones metodológicas" }
];

const INITIAL_STATE = {
  stage: "Primaria / básica",
  stageOther: "",
  age: "",
  country: "España",
  countryOther: "",
  subject: "Lengua y literatura",
  subjectOther: "",
  activityType: "Secuencia completa de aula",
  sessionEstimate: "",
  teacherNotes: "",
  eventDescription: "",
  eventUrl: "",
  articlePreview: null
};

const nodes = {
  stage: document.getElementById("stage"),
  stageOther: document.getElementById("stageOther"),
  stageOtherWrap: document.getElementById("stageOtherWrap"),
  age: document.getElementById("age"),
  country: document.getElementById("country"),
  countryOther: document.getElementById("countryOther"),
  countryOtherWrap: document.getElementById("countryOtherWrap"),
  subject: document.getElementById("subject"),
  subjectOther: document.getElementById("subjectOther"),
  subjectOtherWrap: document.getElementById("subjectOtherWrap"),
  eventDescription: document.getElementById("eventDescription"),
  eventUrl: document.getElementById("eventUrl"),
  analyzeUrlBtn: document.getElementById("analyzeUrlBtn"),
  extractNotice: document.getElementById("extractNotice"),
  articlePreview: document.getElementById("articlePreview"),
  previewTitle: document.getElementById("previewTitle"),
  previewSource: document.getElementById("previewSource"),
  previewDate: document.getElementById("previewDate"),
  previewSummary: document.getElementById("previewSummary"),
  previewContent: document.getElementById("previewContent"),
  activityType: document.getElementById("activityType"),
  sessionEstimate: document.getElementById("sessionEstimate"),
  teacherNotes: document.getElementById("teacherNotes"),
  generalError: document.getElementById("generalError"),
  coherenceWarning: document.getElementById("coherenceWarning"),
  generateBtn: document.getElementById("generateBtn"),
  resetBtn: document.getElementById("resetBtn"),
  loadingText: document.getElementById("loadingText"),
  resultSection: document.getElementById("resultSection"),
  resultTitle: document.getElementById("resultTitle"),
  resultSubtitle: document.getElementById("resultSubtitle"),
  resultChips: document.getElementById("resultChips"),
  copyAllBtn: document.getElementById("copyAllBtn"),
  copySequenceBtn: document.getElementById("copySequenceBtn"),
  copyDimensionsBtn: document.getElementById("copyDimensionsBtn"),
  exportStudentDocxBtn: document.getElementById("exportStudentDocxBtn"),
  exportTeacherDocxBtn: document.getElementById("exportTeacherDocxBtn"),
  exportStudentPdfBtn: document.getElementById("exportStudentPdfBtn"),
  exportTeacherPdfBtn: document.getElementById("exportTeacherPdfBtn"),
  printViewBtn: document.getElementById("printViewBtn"),
  regenerateBtn: document.getElementById("regenerateBtn"),
  copyFeedback: document.getElementById("copyFeedback"),
  tabs: document.getElementById("tabs"),
  tabContent: document.getElementById("tabContent")
};

let state = loadState();
let loadingTimer = null;
let lastResult = null;
let activeTab = "student";
let pendingQualityWarning = "";

bootstrap();

function bootstrap() {
  hydrateSelect(nodes.stage, STAGE_OPTIONS);
  hydrateSelect(nodes.country, COUNTRY_OPTIONS);
  hydrateSelect(nodes.subject, SUBJECT_OPTIONS);
  hydrateSelect(nodes.activityType, ACTIVITY_TYPE_OPTIONS);

  syncFormToUI();
  setupListeners();
  updateConditionalFields();
}

function hydrateSelect(selectNode, options) {
  selectNode.innerHTML = options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
}

function setupListeners() {
  [
    "stage",
    "stageOther",
    "age",
    "country",
    "countryOther",
    "subject",
    "subjectOther",
    "eventDescription",
    "eventUrl",
    "activityType",
    "sessionEstimate",
    "teacherNotes"
  ].forEach((key) => {
    const el = nodes[key];
    el.addEventListener("input", () => {
      state[key] = el.value;
      clearError(key);
      hideGeneralError();
      hideCoherenceWarning();
      if (key === "stage" || key === "country" || key === "subject") {
        updateConditionalFields();
      }
      persistState();
    });
  });

  nodes.previewTitle.addEventListener("input", previewListener("title"));
  nodes.previewSource.addEventListener("input", previewListener("source"));
  nodes.previewDate.addEventListener("input", previewListener("publishedAt"));
  nodes.previewSummary.addEventListener("input", previewListener("summary"));
  nodes.previewContent.addEventListener("input", previewListener("content"));

  nodes.analyzeUrlBtn.addEventListener("click", analyzeUrl);
  nodes.generateBtn.addEventListener("click", generateActivity);

  nodes.copyAllBtn.addEventListener("click", () => copyBlock(JSON.stringify(lastResult, null, 2), "Resultado completo copiado"));
  nodes.copySequenceBtn.addEventListener("click", () => copyBlock(JSON.stringify(lastResult?.sequence || [], null, 2), "Secuencia copiada"));
  nodes.copyDimensionsBtn.addEventListener("click", () =>
    copyBlock(JSON.stringify(lastResult?.dimensionsSummary || [], null, 2), "Bloque de dimensiones copiado")
  );
  nodes.exportStudentDocxBtn.addEventListener("click", exportStudentDocx);
  nodes.exportTeacherDocxBtn.addEventListener("click", exportTeacherDocx);
  nodes.exportStudentPdfBtn.addEventListener("click", exportStudentPdf);
  nodes.exportTeacherPdfBtn.addEventListener("click", exportTeacherPdf);
  nodes.printViewBtn.addEventListener("click", printCurrentView);
  nodes.regenerateBtn.addEventListener("click", generateActivity);
  nodes.resetBtn.addEventListener("click", resetForm);
}

function previewListener(field) {
  return (event) => {
    if (!state.articlePreview) {
      return;
    }

    state.articlePreview[field] = event.target.value;
    persistState();
  };
}

function updateConditionalFields() {
  toggleHidden(nodes.stageOtherWrap, state.stage !== "Otra etapa");
  toggleHidden(nodes.countryOtherWrap, state.country !== "Otros");
  toggleHidden(nodes.subjectOtherWrap, state.subject !== "Otra");
}

function syncFormToUI() {
  Object.keys(INITIAL_STATE).forEach((key) => {
    if (key === "articlePreview") {
      return;
    }
    if (nodes[key]) {
      nodes[key].value = state[key] || "";
    }
  });

  if (state.articlePreview) {
    renderPreview(state.articlePreview);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...INITIAL_STATE };
    }
    return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...INITIAL_STATE };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function validateForm() {
  clearAllErrors();
  let valid = true;

  if (!state.age || Number.isNaN(Number(state.age))) {
    setError("age", "Indica la edad del alumnado.");
    valid = false;
  } else {
    const ageNum = Number(state.age);
    if (ageNum < 4 || ageNum > 99) {
      setError("age", "La edad debe estar entre 4 y 99.");
      valid = false;
    }
  }

  if (state.stage === "Otra etapa" && !state.stageOther.trim()) {
    setError("stageOther", "Indica la etapa educativa.");
    valid = false;
  }

  if (state.country === "Otros" && !state.countryOther.trim()) {
    setError("countryOther", "Indica el país.");
    valid = false;
  }

  if (state.subject === "Otra" && !state.subjectOther.trim()) {
    setError("subjectOther", "Indica la asignatura.");
    valid = false;
  }

  const hasText = state.eventDescription.trim().length > 0;
  const hasUrl = state.eventUrl.trim().length > 0;
  if (!hasText && !hasUrl) {
    setError("eventDescription", "Describe la noticia o pega un enlace.");
    setError("eventUrl", "Describe la noticia o pega un enlace.");
    valid = false;
  }

  if (hasUrl && !isValidUrl(state.eventUrl.trim())) {
    setError("eventUrl", "Introduce una URL válida que empiece por http:// o https://");
    valid = false;
  }

  if (!API_PROXY_URL || API_PROXY_URL === "PEGA_AQUI_TU_URL_DE_WORKER") {
    showGeneralError("Configura la constante API_PROXY_URL en app.js con la URL de tu Cloudflare Worker.");
    valid = false;
  }

  return valid;
}

async function analyzeUrl() {
  const url = state.eventUrl.trim();
  hideNotice();
  clearError("eventUrl");

  if (!isValidUrl(url)) {
    setError("eventUrl", "Introduce una URL válida para analizar el artículo.");
    return;
  }

  nodes.analyzeUrlBtn.disabled = true;
  nodes.analyzeUrlBtn.textContent = "Analizando...";

  try {
    const article = await extractArticle(url);
    state.articlePreview = article;
    persistState();
    renderPreview(article);
    showNotice("Enlace analizado correctamente. Revisa y edita la vista previa si lo necesitas.");
  } catch (error) {
    state.articlePreview = {
      url,
      title: "Referencia de enlace",
      source: new URL(url).hostname.replace(/^www\./, ""),
      publishedAt: "",
      summary: "No se pudo extraer el contenido automáticamente.",
      content: state.eventDescription || "Puedes añadir un resumen manual antes de generar la propuesta."
    };
    persistState();
    renderPreview(state.articlePreview);
    showNotice(
      (error && error.message) ||
        "No fue posible extraer el enlace. Puedes continuar con el texto manual o completar esta referencia mínima."
    );
  } finally {
    nodes.analyzeUrlBtn.disabled = false;
    nodes.analyzeUrlBtn.textContent = "Analizar enlace";
  }
}

async function extractArticle(url) {
  const parsed = new URL(url);
  const pathNoProtocol = `${parsed.hostname}${parsed.pathname}${parsed.search || ""}${parsed.hash || ""}`;
  const endpoint = `https://r.jina.ai/http://${pathNoProtocol}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);

  const response = await fetch(endpoint, { signal: controller.signal });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error("No hemos podido extraer el artículo desde ese enlace.");
  }

  const text = await response.text();
  if (!text || text.trim().length < 80) {
    throw new Error("No se ha encontrado contenido suficiente en el enlace.");
  }

  return parseExtractedText(url, text);
}

function parseExtractedText(url, text) {
  const clean = text.replace(/\r/g, "").trim();
  const titleMatch = clean.match(/^Title:\s*(.+)$/m) || clean.match(/^#\s+(.+)$/m);
  const dateMatch = clean.match(/^(Published Time|Date):\s*(.+)$/m);
  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("URL Source:") && !line.startsWith("Markdown Content:"));

  const likelyBody = lines.slice(2).join(" ");
  const body = likelyBody.length > 6000 ? `${likelyBody.slice(0, 6000)}...` : likelyBody;
  const summary = body.length > 440 ? `${body.slice(0, 437)}...` : body;

  return {
    url,
    title: titleMatch ? titleMatch[1].trim() : "Noticia sin título",
    source: new URL(url).hostname.replace(/^www\./, ""),
    publishedAt: dateMatch ? dateMatch[2].trim() : "",
    summary: summary || "Resumen no disponible.",
    content: body || clean.slice(0, 1600)
  };
}

function renderPreview(article) {
  nodes.previewTitle.value = article.title || "";
  nodes.previewSource.value = article.source || "";
  nodes.previewDate.value = article.publishedAt || "";
  nodes.previewSummary.value = article.summary || "";
  nodes.previewContent.value = article.content || "";
  toggleHidden(nodes.articlePreview, false);
}

async function generateActivity() {
  hideGeneralError();
  hideCoherenceWarning();
  if (!validateForm()) {
    return;
  }

  setLoading(true);

  try {
    const payload = buildPayload();
    let result = await callOpenAI(payload);
    validateOutput(result);
    result = await enforceRequestedConceptCoverage(result, payload);
    validateOutput(result);
    result = await enforceTeacherInstructionAlignment(result, payload);
    validateOutput(result);
    result = await enforceCurriculumAlignment(result, payload);
    validateOutput(result);
    result = await enforceInternalConsistency(result, payload);
    result = await enforceExampleAnchoring(result, payload);
    result = await enforceExamplePedagogyQuality(result, payload);
    validateOutput(result);
    await enrichVisualAssets(result);
    lastResult = result;
    renderResult(result);
    if (pendingQualityWarning) {
      showCoherenceWarning(pendingQualityWarning);
      pendingQualityWarning = "";
    }
    evaluateAndShowCoherenceWarning(result);
  } catch (error) {
    showGeneralError(
      (error && error.message) || "Ha ocurrido un problema al generar la actividad. Revisa la clave API y vuelve a intentarlo."
    );
  } finally {
    setLoading(false);
  }
}

function buildPayload() {
  const requestedConcepts = extractRequestedConcepts(
    [state.teacherNotes, state.eventDescription].filter(Boolean).join(" ")
  );

  return {
    stage: state.stage === "Otra etapa" ? state.stageOther.trim() : state.stage,
    age: Number(state.age),
    country: state.country === "Otros" ? state.countryOther.trim() : state.country,
    subject: state.subject === "Otra" ? state.subjectOther.trim() : state.subject,
    activityType: state.activityType,
    sessionEstimate: state.sessionEstimate.trim(),
    teacherNotes: state.teacherNotes.trim(),
    teacherRequirements: extractTeacherRequirements(state.teacherNotes),
    requestedConcepts,
    curriculumContext: buildCurriculumContext({
      stage: state.stage === "Otra etapa" ? state.stageOther.trim() : state.stage,
      age: Number(state.age),
      country: state.country === "Otros" ? state.countryOther.trim() : state.country,
      subject: state.subject === "Otra" ? state.subjectOther.trim() : state.subject
    }),
    eventDescription: state.eventDescription.trim(),
    eventUrl: state.eventUrl.trim(),
    articlePreview: state.articlePreview
  };
}

function buildCurriculumContext({ stage, age, country, subject }) {
  const resolvedCountry = resolveCurriculumCountry(country);
  const resolvedCountryLabel = curriculumCountryLabel(resolvedCountry);
  const educationalBand = inferEducationalBandByAge(age);
  const subjectFocus = inferSubjectFocus(subject, age);
  const usesSpainFallback = resolvedCountry !== normalizeCurriculumCountry(country);

  return {
    requestedCountry: country,
    curriculumCountry: resolvedCountry,
    curriculumCountryLabel: resolvedCountryLabel,
    usesSpainFallback,
    stage,
    age,
    educationalBand,
    subjectFocus
  };
}

function normalizeCurriculumCountry(country) {
  return String(country || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveCurriculumCountry(country) {
  const normalized = normalizeCurriculumCountry(country);
  const supported = new Set(["espana", "mexico", "colombia", "argentina", "peru", "chile", "ecuador", "honduras", "uruguay"]);
  return supported.has(normalized) ? normalized : "espana";
}

function curriculumCountryLabel(normalizedCountry) {
  const map = {
    espana: "España",
    mexico: "México",
    colombia: "Colombia",
    argentina: "Argentina",
    peru: "Perú",
    chile: "Chile",
    ecuador: "Ecuador",
    honduras: "Honduras",
    uruguay: "Uruguay"
  };
  return map[normalizedCountry] || "España";
}

function inferEducationalBandByAge(age) {
  const value = Number(age);
  if (value <= 7) return "primer ciclo (aprox. 1º-2º primaria)";
  if (value <= 9) return "ciclo medio (aprox. 3º-4º primaria)";
  if (value <= 11) return "ciclo superior (aprox. 5º-6º primaria)";
  if (value <= 13) return "primer tramo de secundaria";
  if (value <= 15) return "tramo intermedio de secundaria";
  if (value <= 18) return "tramo final de secundaria/bachillerato";
  return "educación de personas jóvenes/adultas";
}

function inferSubjectFocus(subject, age) {
  const normalized = normalizeSupportLabel(subject);
  const isEarly = Number(age) <= 9;

  if (normalized.includes("lengua")) {
    return isEarly
      ? "comprensión lectora literal, vocabulario básico, escritura guiada de frases y párrafos breves"
      : "comprensión inferencial y crítica, argumentación escrita, síntesis y uso de evidencias";
  }
  if (normalized.includes("matemat")) {
    return isEarly
      ? "sentido numérico, operaciones básicas, resolución de problemas en contexto cercano"
      : "modelización de datos, razonamiento proporcional y justificación de procedimientos";
  }
  if (normalized.includes("social") || normalized.includes("historia") || normalized.includes("geografia")) {
    return isEarly
      ? "nociones de comunidad, tiempo y espacio cercano con lectura básica de fuentes simples"
      : "análisis de fuentes, causalidad histórica, perspectiva geográfica y ciudadanía crítica";
  }
  if (normalized.includes("naturales")) {
    return isEarly
      ? "observación guiada, clasificación simple y explicación de fenómenos cotidianos"
      : "indagación científica, formulación de hipótesis y análisis de evidencias";
  }
  if (normalized.includes("tecnologia") || normalized.includes("informatica")) {
    return isEarly
      ? "pensamiento computacional inicial, secuencias, uso seguro y responsable"
      : "resolución de problemas con herramientas digitales, análisis de información y ética digital";
  }
  if (normalized.includes("idioma")) {
    return isEarly
      ? "comprensión y producción de mensajes simples en contextos cotidianos"
      : "interacción funcional, comprensión global y producción guiada con propósito comunicativo";
  }
  return "competencias clave de la materia ajustadas al tramo de edad con progresión clara de dificultad";
}

function outputTypeInstruction(type) {
  if (type === "Presentación didáctica breve") {
    return "En outputSpecificAssets incluye cada diapositiva con texto completo listo para proyectar/copiar: consigna exacta, contenido de la diapositiva, pregunta al alumnado y cierre de esa diapositiva.";
  }
  if (type === "Dossier de actividades") {
    return "En outputSpecificAssets entrega páginas completas de dossier, cada una con enunciado literal para alumnado, material, pasos y respuesta o evidencia esperada.";
  }
  if (type === "Secuencia completa de aula") {
    return "En outputSpecificAssets entrega la secuencia completa con tareas cerradas por fase, listas para ejecutar en clase sin rediseño adicional.";
  }
  if (type === "Debate o análisis guiado") {
    return "En outputSpecificAssets incluye guion de debate completo: preguntas literales, turnos, normas, apoyos y texto de síntesis final listo para usar.";
  }
  return "En outputSpecificAssets entrega un mini proyecto cerrado: encargo literal, fases con tareas concretas, entregable final y rúbrica breve ya redactada.";
}

function buildPrompts(payload) {
  const sourcePriority = payload.eventUrl ? "URL principal y texto manual como matiz" : "Texto manual";

  const system = `Eres un diseñador didáctico experto alineado con The Good Teacher Club.

Diseña con intención, estructura y criterio.
Evita propuestas huecas, genéricas, decorativas o superficiales.
No conviertas la actividad en entretenimiento sin propósito.
No inventes normativa específica del país.
No hables de IA como protagonista.
No copies la noticia: transfórmala didácticamente.

La actividad debe respetar:
- objetivo claro
- secuencia progresiva
- apoyos y gradación
- aplicación significativa
- cierre y evaluación

La secuencia operativa debe incluir exactamente estas fases:
- Activación
- Presentación clara
- Modelado
- Práctica guiada
- Práctica autónoma
- Reto o producto final
- Cierre

Dimensiones finales obligatorias:
1. Objetivos de aprendizaje
2. Secuencia
3. Apoyos y gradación
4. Diseño del material
5. Procesos de pensamiento
6. Cierre y evaluación

Regla clave de formato didáctico:
- Debes entregar actividad cerrada y lista para usar en clase.
- No des instrucciones al docente sobre cómo diseñarla: entrégala ya diseñada.
- El docente debe poder copiar/pegar tareas y aplicarlas directamente.
- El material de alumnado debe estar separado del material de docente.
- En "studentMaterial" escribe cuaderno del alumnado ya redactado (consignas literales, tareas cerradas, pasos y formato de respuesta).
- En "studentMaterial.visualAssets" incluye todos los apoyos visuales que mencionas en las tareas (imágenes y tablas).
- Nunca pidas "observa esta imagen/gráfico" si no incluyes ese recurso en "studentMaterial.visualAssets".
- Si una actividad incluye "supportMaterial", ese material debe existir realmente dentro de la propuesta (visualAssets o recurso textual explícito).
- En "teacherGuide" incluye solo consulta docente (apoyos, decisiones metodológicas, criterios y justificación).
- En "outputSpecificAssets" no des sugerencias generales: escribe piezas completas de actividad (enunciados, consignas, preguntas, materiales y productos esperados).
- En "scaffolds" explica apoyos YA integrados en la propuesta (qué apoyo, dónde aparece y cómo gradúa).
- En "dimensionsSummary" justifica por qué lo que entregaste cumple cada dimensión, con evidencia concreta de tu propia propuesta.

Regla crítica de precisión:
- Si el docente pide conceptos o temas explícitos, TODAS las tareas centrales deben trabajarlos de forma visible y concreta.
- No aceptes ambigüedad: cada concepto obligatorio debe aparecer en enunciados, pasos, evidencias y producto final.
- Está prohibido desalinear la propuesta con el encargo docente.
- Si el docente menciona ejemplos, materiales, pasos o acciones concretas, debes incluirlos explícitamente en el cuaderno del alumnado (no como promesa futura).
- Está prohibido escribir frases tipo "el docente dará ejemplos" sin incluir esos ejemplos de forma literal en la propuesta.
- Si una actividad dice "sigue/lee/revisa el ejemplo", el ejemplo resuelto debe aparecer escrito dentro de esa misma actividad (en enunciado, pasos o instrucciones del bloque).
- Si se piden varios conceptos a la vez, incluye actividades que los combinen explícitamente en la misma tarea.

Regla crítica de modelado por ejemplo:
- Si la propuesta usa "ejemplo resuelto", "modelo", "resolución guiada" o "aprendizaje por ejemplo", debes incluir:
  1) situación/contexto del problema,
  2) datos iniciales,
  3) qué se pide,
  4) resolución modelada paso a paso (datos, estrategia/procedimiento, aplicación, resultado, comprobación),
  5) un nuevo ejercicio del mismo tipo para el alumno con datos distintos.
- El ejercicio posterior no puede venir completamente resuelto; puede incluir pistas, pero no la solución final.
- El ejemplo resuelto y el ejercicio posterior deben entrenar exactamente la misma habilidad o procedimiento.

Regla crítica de imágenes:
- Si propones imágenes, deben ser coherentes con la noticia base y el contexto real.
- No inventes países, fronteras, actores geopolíticos o hechos no presentes en la base informativa.
- Si no hay suficiente certeza factual, usa visuales neutrales y no afirmaciones geopolíticas específicas.

Regla crítica curricular:
- La propuesta debe estar alineada al currículo esperado del país, materia y edad indicados.
- Ajusta objetivos, dificultad cognitiva, vocabulario y evidencias al tramo real de edad.
- Si no hay suficiente certeza curricular del país solicitado, usa como referencia curricular España y decláralo en la guía docente.

Responde solo JSON válido.`;

  const user = `Contexto:
- Etapa: ${payload.stage}
- Edad: ${payload.age}
- País: ${payload.country}
- Asignatura: ${payload.subject}
- Tipo de propuesta: ${payload.activityType}
- Duración/sesiones: ${payload.sessionEstimate || "No indicada"}
- Indicaciones del docente: ${payload.teacherNotes || "No indicadas"}
- Alineación curricular obligatoria:
  - País solicitado: ${payload.curriculumContext?.requestedCountry || payload.country}
  - País de referencia curricular: ${payload.curriculumContext?.curriculumCountryLabel || "España"}
  - ¿Fallback a España?: ${payload.curriculumContext?.usesSpainFallback ? "Sí" : "No"}
  - Tramo educativo esperado por edad: ${payload.curriculumContext?.educationalBand || "No definido"}
  - Foco curricular de materia esperado: ${payload.curriculumContext?.subjectFocus || "No definido"}

Base informativa:
- Prioridad: ${sourcePriority}
- Descripción manual: ${payload.eventDescription || "No aportada"}
- URL: ${payload.eventUrl || "No aportada"}
${
  payload.articlePreview
    ? `- Vista previa extraída:
  - Título: ${payload.articlePreview.title}
  - Fuente: ${payload.articlePreview.source}
  - Fecha: ${payload.articlePreview.publishedAt || "No disponible"}
  - Resumen: ${payload.articlePreview.summary}
  - Contenido principal: ${payload.articlePreview.content}`
    : "- Vista previa extraída: No disponible"
}

Instrucción específica por tipo:
${outputTypeInstruction(payload.activityType)}

Conceptos obligatorios solicitados por docente (si existen):
${payload.requestedConcepts?.length ? payload.requestedConcepts.join(", ") : "No detectado"}

Requisitos literales detectados en indicaciones docentes (si existen):
${payload.teacherRequirements?.length ? payload.teacherRequirements.join(" | ") : "No detectado"}

Calidad obligatoria:
- Evita objetivos vagos y secuencias sin progresión.
- Incluye relevancia real de la noticia para el alumnado.
- Formula preguntas que hagan pensar.
- Incluye apoyos concretos y gradación.
- Asegura coherencia entre objetivo, tareas y evidencia final.
- Cuida claridad visual y textual de los materiales.
- Entrega un cuaderno del alumnado final y usable sin rediseño.
- Si una tarea menciona imágenes, gráficos o tablas, debes proporcionar el recurso visual completo en visualAssets.
- Si una tarea declara "Material de apoyo incluido", ese material debe aparecer realmente en la salida final.
- Si una tarea menciona un ejemplo, incluye el ejemplo literal y resuelto en esa tarea (no remitir a material inexistente).
- Si hay ejemplo/modelo/resolución guiada, incluye también un ejercicio equivalente para el alumno (misma habilidad, datos distintos, sin solución final).
- Entrega tareas completas redactadas para copiar/pegar, no solo ideas o orientaciones.`;

  return { system, user };
}

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "subtitle",
    "activityType",
    "stageLabel",
    "age",
    "country",
    "subject",
    "currentEventTitle",
    "currentEventSummary",
    "pedagogicalIntent",
    "learningObjectives",
    "essentialQuestion",
    "whyThisTopicMatters",
    "finalProduct",
    "sessionEstimate",
    "sequence",
    "scaffolds",
    "materialDesignGuidelines",
    "teacherNotes",
    "assessment",
    "adaptationNotes",
    "dimensionsSummary",
    "outputSpecificAssets",
    "studentMaterial",
    "teacherGuide"
  ],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    activityType: { type: "string" },
    stageLabel: { type: "string" },
    age: { type: "number" },
    country: { type: "string" },
    subject: { type: "string" },
    currentEventTitle: { type: "string" },
    currentEventSummary: { type: "string" },
    pedagogicalIntent: { type: "string" },
    learningObjectives: { type: "array", items: { type: "string" } },
    essentialQuestion: { type: "string" },
    whyThisTopicMatters: { type: "string" },
    finalProduct: { type: "string" },
    sessionEstimate: { type: "string" },
    sequence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["phase", "purpose", "teacherAction", "studentAction", "support", "expectedEvidence"],
        properties: {
          phase: { type: "string" },
          purpose: { type: "string" },
          teacherAction: { type: "string" },
          studentAction: { type: "string" },
          support: { type: "string" },
          expectedEvidence: { type: "string" }
        }
      }
    },
    scaffolds: { type: "array", items: { type: "string" } },
    materialDesignGuidelines: { type: "array", items: { type: "string" } },
    teacherNotes: { type: "string" },
    assessment: { type: "string" },
    adaptationNotes: { type: "string" },
    dimensionsSummary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "explanation"],
        properties: {
          title: { type: "string" },
          explanation: { type: "string" }
        }
      }
    },
    outputSpecificAssets: { type: "array", items: { type: "string" } },
    studentMaterial: {
      type: "object",
      additionalProperties: false,
      required: ["studentTitle", "studentIntro", "workbookPages", "finalSubmissionInstruction", "visualAssets"],
      properties: {
        studentTitle: { type: "string" },
        studentIntro: { type: "string" },
        finalSubmissionInstruction: { type: "string" },
        visualAssets: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "assetType",
              "title",
              "instruction",
              "imagePrompt",
              "tableColumns",
              "tableRows"
            ],
            properties: {
              assetType: { type: "string", enum: ["image", "table"] },
              title: { type: "string" },
              instruction: { type: "string" },
              imagePrompt: { type: "string" },
              tableColumns: { type: "array", items: { type: "string" } },
              tableRows: {
                type: "array",
                items: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        },
        workbookPages: {
          type: "array",
          minItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pageTitle", "studentInstructions", "activities"],
            properties: {
              pageTitle: { type: "string" },
              studentInstructions: { type: "array", items: { type: "string" } },
              activities: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["taskTitle", "statement", "steps", "expectedOutput", "supportMaterial"],
                  properties: {
                    taskTitle: { type: "string" },
                    statement: { type: "string" },
                    steps: { type: "array", items: { type: "string" } },
                    expectedOutput: { type: "string" },
                    supportMaterial: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    teacherGuide: {
      type: "object",
      additionalProperties: false,
      required: [
        "implementationSummary",
        "supportsApplied",
        "differentiation",
        "evaluationCriteria",
        "whyDesignWorks"
      ],
      properties: {
        implementationSummary: { type: "string" },
        supportsApplied: { type: "array", items: { type: "string" } },
        differentiation: { type: "array", items: { type: "string" } },
        evaluationCriteria: { type: "array", items: { type: "string" } },
        whyDesignWorks: { type: "string" }
      }
    }
  }
};

async function callOpenAI(payload) {
  const { system, user } = buildPrompts(payload);
  const response = await requestModel([
    { role: "system", content: system },
    { role: "user", content: user }
  ]);

  if (!response.ok) {
    const errorData = await safeJson(response);
    throw new Error(errorData?.error?.message || "Error de red o de API al generar la actividad.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("La respuesta del modelo llegó vacía. Prueba a regenerar.");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Respuesta del modelo mal formada. Intenta generar otra versión.");
  }
}

async function requestModel(messages) {
  return requestStructuredModel({
    messages,
    schemaName: "tgtc_activity",
    schema: JSON_SCHEMA,
    temperature: 0.6
  });
}

async function requestStructuredModel({ messages, schemaName, schema, temperature = 0.2 }) {
  try {
    return await fetch(API_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema
          }
        }
      })
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "No se pudo conectar con el Worker (Failed to fetch). Revisa que la URL del Worker esté activa y que CORS permita tu dominio en FRONTEND_ORIGIN."
      );
    }
    throw error;
  }
}

async function enrichVisualAssets(result) {
  const assets = result?.studentMaterial?.visualAssets;
  if (!Array.isArray(assets) || assets.length === 0) {
    return;
  }

  const imageAssets = assets.filter(
    (asset) => asset.assetType === "image" && typeof asset.imagePrompt === "string" && asset.imagePrompt.trim().length > 0
  );

  if (imageAssets.length === 0) {
    return;
  }

  nodes.loadingText.textContent = "Generando recursos visuales";

  await Promise.all(
    imageAssets.map(async (asset) => {
      try {
        const dataUrl = await requestGeneratedImage(asset.imagePrompt);
        asset.generatedImageUrl = dataUrl;
      } catch {
        asset.generatedImageUrl = "";
      }
    })
  );
}

async function requestGeneratedImage(prompt) {
  let response;
  try {
    response = await fetch(API_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        endpoint: "images",
        payload: {
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
          quality: "medium"
        }
      })
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el Worker para generar imágenes (Failed to fetch).");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error("No se pudo generar una imagen.");
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("La imagen no llegó en formato esperado.");
  }

  return `data:image/png;base64,${b64}`;
}

function validateOutput(result) {
  const required = [
    "title",
    "subtitle",
    "activityType",
    "stageLabel",
    "age",
    "country",
    "subject",
    "learningObjectives",
    "sequence",
    "dimensionsSummary",
    "studentMaterial",
    "teacherGuide"
  ];

  required.forEach((key) => {
    if (typeof result[key] === "undefined" || result[key] === null) {
      throw new Error("La propuesta llegó incompleta. Intenta generar otra versión.");
    }
  });

  if (!Array.isArray(result.sequence) || result.sequence.length === 0) {
    throw new Error("No se ha generado una secuencia válida.");
  }

  if (!Array.isArray(result.studentMaterial?.visualAssets)) {
    throw new Error("La propuesta llegó sin recursos visuales estructurados.");
  }
}

async function enforceInternalConsistency(result, payload) {
  const initialIssues = detectConsistencyIssues(result);
  if (initialIssues.length === 0) {
    return result;
  }

  nodes.loadingText.textContent = "Corrigiendo coherencia interna";

  try {
    const repaired = await repairConsistencyWithModel(result, payload, initialIssues);
    const remainingIssues = detectConsistencyIssues(repaired);
    if (remainingIssues.length > 0) {
      pendingQualityWarning =
        "Aviso de calidad: se han detectado referencias internas incompletas (ejercicios/problemas/recursos no presentes). Revisa antes de usar en aula.";
    }
    return repaired;
  } catch {
    pendingQualityWarning =
      "Aviso de calidad: no se pudo corregir automáticamente la coherencia interna de todos los elementos.";
    return result;
  }
}

async function enforceRequestedConceptCoverage(result, payload) {
  const concepts = payload.requestedConcepts || [];
  if (!Array.isArray(concepts) || concepts.length === 0) {
    return result;
  }

  const lexicalMissing = getMissingConceptsLexical(result, concepts);
  const audit = await auditConceptAlignment(result, concepts);
  const missing = Array.from(new Set([...(audit.missingConcepts || []), ...lexicalMissing]));

  if (missing.length === 0 && (audit.criticalIssues || []).length === 0) {
    return result;
  }

  nodes.loadingText.textContent = "Ajustando foco didáctico solicitado";

  const repaired = await repairConceptCoverageWithModel(result, payload, missing, audit.criticalIssues || []);
  const repairedAudit = await auditConceptAlignment(repaired, concepts);
  const stillMissing = getMissingConceptsLexical(repaired, concepts);
  const stillFailing = Array.from(new Set([...(repairedAudit.missingConcepts || []), ...stillMissing]));

  if (stillFailing.length > 0 || (repairedAudit.criticalIssues || []).length > 0) {
    const missingLabel = stillFailing.length > 0 ? stillFailing.join(", ") : "coherencia conceptual insuficiente";
    throw new Error(
      `La propuesta no cumple con coherencia extrema de conceptos solicitados (${missingLabel}). Vuelve a generar con más detalle.`
    );
  }

  return repaired;
}

async function enforceTeacherInstructionAlignment(result, payload) {
  const notes = String(payload.teacherNotes || "").trim();
  if (!notes) {
    return result;
  }

  const audit = await auditTeacherInstructionAlignment(result, payload);
  if (audit.isSatisfied && (audit.criticalIssues || []).length === 0) {
    return result;
  }

  nodes.loadingText.textContent = "Ajustando requisitos del docente";

  const repaired = await repairTeacherInstructionAlignmentWithModel(
    result,
    payload,
    audit.missingElements || [],
    audit.criticalIssues || []
  );
  const repairedAudit = await auditTeacherInstructionAlignment(repaired, payload);
  if (!repairedAudit.isSatisfied || (repairedAudit.criticalIssues || []).length > 0) {
    const missingLabel =
      (repairedAudit.missingElements || []).length > 0
        ? repairedAudit.missingElements.join(", ")
        : "requisitos docentes no materializados";
    throw new Error(
      `La propuesta no refleja fielmente las indicaciones del docente (${missingLabel}). Vuelve a generar con más detalle.`
    );
  }

  return repaired;
}

async function enforceCurriculumAlignment(result, payload) {
  const audit = await auditCurriculumAlignment(result, payload);
  if (audit.isAligned && (audit.criticalIssues || []).length === 0) {
    return result;
  }

  nodes.loadingText.textContent = "Ajustando alineación curricular";

  const repaired = await repairCurriculumAlignmentWithModel(
    result,
    payload,
    audit.missingElements || [],
    audit.criticalIssues || []
  );
  const repairedAudit = await auditCurriculumAlignment(repaired, payload);
  if (!repairedAudit.isAligned || (repairedAudit.criticalIssues || []).length > 0) {
    const missingLabel =
      (repairedAudit.missingElements || []).length > 0
        ? repairedAudit.missingElements.join(", ")
        : "desajuste curricular persistente";
    throw new Error(
      `La propuesta no quedó bien alineada con currículo por país/edad/materia (${missingLabel}). Vuelve a generar con más detalle.`
    );
  }

  return repaired;
}

async function auditCurriculumAlignment(result, payload) {
  const auditSchema = {
    type: "object",
    additionalProperties: false,
    required: ["isAligned", "missingElements", "criticalIssues"],
    properties: {
      isAligned: { type: "boolean" },
      missingElements: { type: "array", items: { type: "string" } },
      criticalIssues: { type: "array", items: { type: "string" } }
    }
  };

  const context = payload.curriculumContext || {};

  const response = await requestStructuredModel({
    schemaName: "tgtc_curriculum_alignment_audit",
    schema: auditSchema,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Eres auditor estricto de alineación curricular. Evalúa si la propuesta está realmente ajustada a país, edad y materia. Detecta desajustes de nivel cognitivo, objetivos impropios de edad y falta de referencia curricular."
      },
      {
        role: "user",
        content: `Contexto curricular obligatorio:
- País solicitado: ${context.requestedCountry || payload.country}
- País de referencia curricular: ${context.curriculumCountryLabel || "España"}
- Fallback a España: ${context.usesSpainFallback ? "sí" : "no"}
- Edad: ${payload.age}
- Tramo educativo esperado: ${context.educationalBand || "no definido"}
- Materia: ${payload.subject}
- Foco curricular esperado: ${context.subjectFocus || "no definido"}

JSON generado:
${JSON.stringify(result)}`
      }
    ]
  });

  if (!response.ok) {
    return {
      isAligned: false,
      missingElements: ["Alineación curricular no verificable"],
      criticalIssues: ["No se pudo auditar alineación curricular con el modelo."]
    };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return {
      isAligned: false,
      missingElements: ["Alineación curricular no verificable"],
      criticalIssues: ["La auditoría curricular devolvió contenido vacío."]
    };
  }

  try {
    return JSON.parse(content);
  } catch {
    return {
      isAligned: false,
      missingElements: ["Alineación curricular no verificable"],
      criticalIssues: ["La auditoría curricular devolvió JSON inválido."]
    };
  }
}

async function repairCurriculumAlignmentWithModel(originalResult, payload, missingElements, criticalIssues) {
  const context = payload.curriculumContext || {};
  const messages = [
    {
      role: "system",
      content:
        "Corrige una propuesta didáctica JSON para alinearla estrictamente con currículo por país, edad y materia. Ajusta nivel de complejidad, objetivos, tareas, evidencias y guía docente. Responde solo JSON válido con el mismo schema."
    },
    {
      role: "user",
      content: `Desajustes detectados: ${(missingElements || []).join(", ") || "ninguno"}.
Problemas críticos: ${(criticalIssues || []).join(" | ") || "ninguno"}.

Contexto curricular obligatorio:
- País solicitado: ${context.requestedCountry || payload.country}
- País de referencia curricular: ${context.curriculumCountryLabel || "España"}
- Fallback a España: ${context.usesSpainFallback ? "sí" : "no"}
- Edad: ${payload.age}
- Tramo educativo esperado: ${context.educationalBand || "no definido"}
- Materia: ${payload.subject}
- Foco curricular esperado: ${context.subjectFocus || "no definido"}

Reglas:
- Asegura que los objetivos y evidencias son apropiados para la edad.
- Ajusta vocabulario y carga cognitiva al tramo indicado.
- Si se usa fallback a España, deja constancia explícita en teacherGuide.implementationSummary.

JSON actual:
${JSON.stringify(originalResult)}`
    }
  ];

  const response = await requestModel(messages);
  if (!response.ok) {
    throw new Error("No se pudo corregir la alineación curricular.");
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía al corregir alineación curricular.");
  }
  return JSON.parse(content);
}

async function repairConceptCoverageWithModel(originalResult, payload, missing, criticalIssues) {
  const messages = [
    {
      role: "system",
      content:
        "Corrige una propuesta didáctica JSON para que cumpla exactamente los conceptos solicitados por el docente y elimine incoherencias. Responde solo JSON válido con el mismo schema."
    },
    {
      role: "user",
      content: `Conceptos faltantes detectados: ${missing.join(", ") || "ninguno"}.\nProblemas críticos detectados: ${
        (criticalIssues || []).join(" | ") || "ninguno"
      }.\n\nDebes reescribir tareas, secuencia, visualAssets y studentMaterial para que los conceptos obligatorios aparezcan de forma central, explícita y operativa en actividades concretas.\n\nContexto:\n${JSON.stringify(
        payload
      )}\n\nJSON actual:\n${JSON.stringify(originalResult)}\n\nRegla: no vale mencionar por encima; debe notarse en enunciados, pasos, evidencias y producto final.`
    }
  ];

  const response = await requestModel(messages);
  if (!response.ok) {
    throw new Error("No se pudo corregir la cobertura de conceptos solicitados.");
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía al corregir cobertura de conceptos.");
  }
  return JSON.parse(content);
}

async function auditTeacherInstructionAlignment(result, payload) {
  const auditSchema = {
    type: "object",
    additionalProperties: false,
    required: ["isSatisfied", "missingElements", "criticalIssues"],
    properties: {
      isSatisfied: { type: "boolean" },
      missingElements: { type: "array", items: { type: "string" } },
      criticalIssues: { type: "array", items: { type: "string" } }
    }
  };

  const response = await requestStructuredModel({
    schemaName: "tgtc_teacher_alignment_audit",
    schema: auditSchema,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Eres auditor estricto de fidelidad al encargo docente. Verifica que todo requisito explícito del docente esté materializado en la propuesta final, especialmente ejemplos concretos, materiales citados y acciones pedidas. Si el texto dice que el docente dará ejemplos, marca fallo si esos ejemplos no aparecen escritos en studentMaterial."
      },
      {
        role: "user",
        content: `Indicaciones del docente:\n${payload.teacherNotes || "No indicadas"}\n\nRequisitos detectados:\n${
          (payload.teacherRequirements || []).join(" | ") || "No detectados"
        }\n\nJSON generado:\n${JSON.stringify(result)}`
      }
    ]
  });

  if (!response.ok) {
    return {
      isSatisfied: false,
      missingElements: payload.teacherRequirements || [],
      criticalIssues: ["No se pudo auditar la fidelidad al encargo docente."]
    };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return {
      isSatisfied: false,
      missingElements: payload.teacherRequirements || [],
      criticalIssues: ["La auditoría de fidelidad docente devolvió contenido vacío."]
    };
  }

  try {
    return JSON.parse(content);
  } catch {
    return {
      isSatisfied: false,
      missingElements: payload.teacherRequirements || [],
      criticalIssues: ["La auditoría de fidelidad docente devolvió JSON inválido."]
    };
  }
}

async function repairTeacherInstructionAlignmentWithModel(originalResult, payload, missingElements, criticalIssues) {
  const messages = [
    {
      role: "system",
      content:
        "Corrige una propuesta didáctica JSON para que refleje literalmente las indicaciones del docente. No dejes referencias vacías ni promesas de material externo. Responde solo JSON válido con el mismo schema."
    },
    {
      role: "user",
      content: `Elementos docentes no reflejados: ${(missingElements || []).join(", ") || "ninguno"}.\nProblemas críticos: ${
        (criticalIssues || []).join(" | ") || "ninguno"
      }.\n\nDebes reescribir tareas, pasos, evidencias, visualAssets y materiales para que lo pedido por el docente esté explícito en el resultado. Si se habla de ejemplos, escribe los ejemplos completos.\n\nContexto:\n${JSON.stringify(
        payload
      )}\n\nJSON actual:\n${JSON.stringify(originalResult)}`
    }
  ];

  const response = await requestModel(messages);
  if (!response.ok) {
    throw new Error("No se pudo corregir la fidelidad al encargo docente.");
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía al corregir fidelidad al encargo docente.");
  }
  return JSON.parse(content);
}

function getMissingConceptsLexical(result, concepts) {
  const text = [
    result.title,
    result.subtitle,
    result.pedagogicalIntent,
    result.essentialQuestion,
    ...(result.learningObjectives || []),
    ...(result.sequence || []).flatMap((s) => [s.purpose, s.studentAction, s.expectedEvidence]),
    ...(result.studentMaterial?.workbookPages || []).flatMap((page) => [
      page.pageTitle,
      ...(page.studentInstructions || []),
      ...(page.activities || []).flatMap((a) => [a.taskTitle, a.statement, ...(a.steps || []), a.expectedOutput])
    ])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const missing = [];
  for (const concept of concepts) {
    const normalized = normalizeConcept(concept);
    if (!normalized) continue;

    if (!text.includes(normalized)) {
      missing.push(concept);
    }
  }
  return Array.from(new Set(missing));
}

async function auditConceptAlignment(result, concepts) {
  if (!Array.isArray(concepts) || concepts.length === 0) {
    return { isAligned: true, missingConcepts: [], criticalIssues: [] };
  }

  const auditSchema = {
    type: "object",
    additionalProperties: false,
    required: ["isAligned", "missingConcepts", "criticalIssues"],
    properties: {
      isAligned: { type: "boolean" },
      missingConcepts: { type: "array", items: { type: "string" } },
      criticalIssues: { type: "array", items: { type: "string" } }
    }
  };

  const response = await requestStructuredModel({
    schemaName: "tgtc_alignment_audit",
    schema: auditSchema,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Eres auditor estricto de calidad didáctica. Comprueba si los conceptos obligatorios aparecen de forma central, explícita y operativa en objetivos, tareas, pasos, evidencias y producto final. Si falta coherencia, marca missingConcepts y explica criticalIssues."
      },
      {
        role: "user",
        content: `Conceptos obligatorios:\n${concepts.map((item) => `- ${item}`).join("\n")}\n\nJSON generado:\n${JSON.stringify(result)}`
      }
    ]
  });

  if (!response.ok) {
    return {
      isAligned: false,
      missingConcepts: [...concepts],
      criticalIssues: ["No se pudo auditar la coherencia de conceptos con el modelo."]
    };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return {
      isAligned: false,
      missingConcepts: [...concepts],
      criticalIssues: ["La auditoría de coherencia devolvió contenido vacío."]
    };
  }

  try {
    return JSON.parse(content);
  } catch {
    return {
      isAligned: false,
      missingConcepts: [...concepts],
      criticalIssues: ["La auditoría de coherencia devolvió JSON inválido."]
    };
  }
}

function normalizeConcept(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTeacherRequirements(text) {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) {
    return [];
  }

  const items = [];
  const quotedMatches = raw.match(/["“”'«»]([^"“”'«»]{3,120})["“”'«»]/g) || [];
  quotedMatches.forEach((match) => {
    items.push(match.replace(/["“”'«»]/g, "").trim());
  });

  const actionMatches = Array.from(
    raw.matchAll(
      /\b(?:quiero(?: que)?|necesito(?: que)?|debe(?:n)?|tiene(?:n)? que|incluye|incluyan|usar|usa|trabajar|reforzar|practicar)\b[^.:\n]{0,120}/gi
    )
  );
  actionMatches.forEach((match) => {
    items.push(String(match[0] || "").trim());
  });

  if (/\bejemplos?\b/i.test(raw)) {
    items.push("Incluir ejemplos concretos y visibles en las actividades");
  }

  return Array.from(
    new Set(
      items
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter((item) => item.length >= 8 && item.length <= 140)
    )
  );
}

function detectConsistencyIssues(result) {
  const issues = [];
  const workbookPages = result.studentMaterial?.workbookPages || [];
  const visualAssets = result.studentMaterial?.visualAssets || [];
  const supportIndex = buildSupportAssetIndex(result);
  const sourceGeo = extractGeoEntities(
    [state.eventDescription, state.articlePreview?.title, state.articlePreview?.summary, state.articlePreview?.content].filter(Boolean).join(" ")
  );

  const activityCount = workbookPages.reduce((sum, page) => sum + (page.activities?.length || 0), 0);
  const tableCount = visualAssets.filter((a) => a.assetType === "table").length;
  const imageCount = visualAssets.filter((a) => a.assetType === "image").length;

  const texts = [
    result.studentMaterial?.studentIntro,
    result.studentMaterial?.finalSubmissionInstruction,
    ...(workbookPages || []).flatMap((page) => [
      page.pageTitle,
      ...(page.studentInstructions || []),
      ...(page.activities || []).flatMap((a) => [a.taskTitle, a.statement, ...(a.steps || [])])
    ]),
    ...(result.sequence || []).flatMap((s) => [s.studentAction, s.purpose])
  ]
    .filter(Boolean)
    .join(" ");

  const refs = Array.from(
    texts.matchAll(/\b(ejercicio|problema|actividad|tabla|imagen|grafico|gráfico)s?\s*(?:n[ºo]\s*)?(\d+)\b/gi)
  );

  for (const match of refs) {
    const type = (match[1] || "").toLowerCase();
    const num = Number(match[2]);
    if (Number.isNaN(num) || num < 1) continue;

    if ((type === "ejercicio" || type === "problema" || type === "actividad") && num > activityCount) {
      issues.push(`Se menciona ${match[0]} pero solo hay ${activityCount} actividades definidas.`);
    }
    if (type === "tabla" && num > tableCount) {
      issues.push(`Se menciona ${match[0]} pero solo hay ${tableCount} tablas definidas.`);
    }
    if ((type === "imagen" || type === "grafico" || type === "gráfico") && num > imageCount) {
      issues.push(`Se menciona ${match[0]} pero solo hay ${imageCount} imágenes definidas.`);
    }
  }

  workbookPages.forEach((page, pageIndex) => {
    (page.activities || []).forEach((activity, activityIndex) => {
      const exampleNeedsAnchor = activityHasDanglingExampleReference(activity, page, result);
      if (exampleNeedsAnchor) {
        issues.push(
          `Actividad ${activityIndex + 1} de la página ${pageIndex + 1}: se menciona un ejemplo que no está disponible para el alumnado.`
        );
      }

      const support = String(activity.supportMaterial || "").trim();
      if (!support || isNoSupportMaterial(support) || isInherentClassroomMaterial(support)) {
        return;
      }

      if (!isSupportMaterialBacked(support, supportIndex)) {
        issues.push(
          `Actividad ${activityIndex + 1} de la página ${pageIndex + 1}: el material de apoyo "${support}" no está realmente incluido en la propuesta.`
        );
      }
    });
  });

  const genericImageRef = /\b(observa|consulta|analiza)\s+(la|el|las|los)\s+(imagen|grafico|gráfico)\b/i.test(texts);
  const genericTableRef = /\b(observa|consulta|analiza)\s+(la|el|las|los)\s+tabla\b/i.test(texts);
  if (genericImageRef && imageCount === 0) {
    issues.push("La propuesta pide observar imágenes, pero no incluye ninguna imagen en visualAssets.");
  }
  if (genericTableRef && tableCount === 0) {
    issues.push("La propuesta pide observar tablas, pero no incluye ninguna tabla en visualAssets.");
  }

  const imageAssets = visualAssets.filter((a) => a.assetType === "image");
  imageAssets.forEach((asset) => {
    const imageGeo = extractGeoEntities(asset.imagePrompt || "");
    if (imageGeo.length === 0 || sourceGeo.length === 0) {
      return;
    }
    const overlap = imageGeo.filter((g) => sourceGeo.includes(g));
    if (overlap.length === 0) {
      issues.push(
        `La imagen "${asset.title || "sin título"}" parece introducir contexto geográfico no presente en la noticia base.`
      );
    }
  });

  return Array.from(new Set(issues));
}

function collectSupportExampleCorpus(result) {
  const visualAssets = result?.studentMaterial?.visualAssets || [];
  const outputAssets = result?.outputSpecificAssets || [];
  const visualParts = [];

  visualAssets.forEach((asset) => {
    visualParts.push(asset.title || "", asset.instruction || "", asset.imagePrompt || "");
    if (asset.assetType === "table") {
      visualParts.push(...(asset.tableColumns || []));
      (asset.tableRows || []).forEach((row) => visualParts.push(...(row || [])));
    }
  });

  return normalizeSupportLabel([...visualParts, ...outputAssets].filter(Boolean).join(" "));
}

function referencesExternalExample(text) {
  const value = normalizeSupportLabel(text);
  if (!value) return false;
  return (
    /\b(siguiendo|sigue|como|lee|revisa|consulta|basate|basandote|apoyate|guiate|segun)\b[^.:\n]{0,45}\bejemplo\b/.test(value) ||
    /\bejemplo\s+(mostrado|anterior|previo|adjunto|de referencia)\b/.test(value)
  );
}

function hasInlineExampleContent(text) {
  const raw = String(text || "");
  return /\bejemplo\s*:/i.test(raw) || /\bpor ejemplo\b/i.test(raw) || /\bejemplo resuelto\b/i.test(raw);
}

function activityHasDanglingExampleReference(activity, page, result) {
  const supportCorpus = collectSupportExampleCorpus(result);
  const activityTexts = [
    activity?.statement || "",
    ...(activity?.steps || []),
    activity?.expectedOutput || ""
  ].filter(Boolean);

  const mentionsExternal = activityTexts.some((text) => referencesExternalExample(text));
  if (!mentionsExternal) return false;

  const hasInlineExample = activityTexts.some((text) => hasInlineExampleContent(text));
  const pageHasInlineExample = (page?.studentInstructions || []).some((text) => hasInlineExampleContent(text));
  const supportHasExample = /\bejemplo\b/.test(supportCorpus) || /\bmodelo resuelto\b/.test(supportCorpus);

  return !hasInlineExample && !pageHasInlineExample && !supportHasExample;
}

function getMissingExampleAnchors(result) {
  const missing = [];
  const workbookPages = result?.studentMaterial?.workbookPages;
  if (!Array.isArray(workbookPages) || workbookPages.length === 0) {
    return missing;
  }

  workbookPages.forEach((page, pageIndex) => {
    (page.activities || []).forEach((activity, activityIndex) => {
      if (activityHasDanglingExampleReference(activity, page, result)) {
        missing.push({
          pageIndex,
          activityIndex,
          taskTitle: activity?.taskTitle || "",
          statement: activity?.statement || ""
        });
      }
    });
  });

  return missing;
}

function buildAutoResolvedExample(activity) {
  const task = String(activity?.taskTitle || "esta actividad").trim();
  return `Ejemplo resuelto (${task}): identifica los datos clave del enunciado, aplica el procedimiento en el mismo orden en que aparece y verifica el resultado final antes de resolver el resto de apartados.`;
}

function materializeMissingExamplesLocally(result, missingAnchors = null) {
  const workbookPages = result?.studentMaterial?.workbookPages;
  if (!Array.isArray(workbookPages) || workbookPages.length === 0) {
    return result;
  }

  const anchors = Array.isArray(missingAnchors) ? missingAnchors : getMissingExampleAnchors(result);
  anchors.forEach(({ pageIndex, activityIndex }) => {
    const page = workbookPages[pageIndex];
    const activity = page?.activities?.[activityIndex];
    if (!activity) return;

    const exampleLine = buildAutoResolvedExample(activity);
    const statement = String(activity.statement || "");
    if (!/ejemplo resuelto/i.test(statement)) {
      activity.statement = `${statement.trim()} ${exampleLine}`.trim();
    }

    if (!Array.isArray(activity.steps)) {
      activity.steps = [];
    }
    if (!activity.steps.some((step) => /ejemplo resuelto|por ejemplo|ejemplo:/i.test(String(step || "")))) {
      activity.steps.unshift(exampleLine);
    }
  });

  return result;
}

async function enforceExampleAnchoring(result, payload) {
  const missing = getMissingExampleAnchors(result);
  if (missing.length === 0) {
    return result;
  }

  nodes.loadingText.textContent = "Materializando ejemplos solicitados";

  try {
    const repaired = await repairExampleAnchoringWithModel(result, payload, missing);
    const stillMissing = getMissingExampleAnchors(repaired);
    if (stillMissing.length === 0) {
      return repaired;
    }
    pendingQualityWarning =
      "Aviso de calidad: se han insertado ejemplos de apoyo automáticamente para evitar referencias a ejemplos no visibles.";
    return materializeMissingExamplesLocally(repaired, stillMissing);
  } catch {
    pendingQualityWarning =
      "Aviso de calidad: no se pudo materializar con el modelo; se añadieron ejemplos de apoyo automáticos para mantener coherencia.";
    return materializeMissingExamplesLocally(result, missing);
  }
}

async function repairExampleAnchoringWithModel(originalResult, payload, missing) {
  const labels = missing.map((item) => `página ${item.pageIndex + 1}, actividad ${item.activityIndex + 1}`).join(" | ");
  const messages = [
    {
      role: "system",
      content:
        "Corrige una propuesta didáctica JSON para materializar ejemplos faltantes. Si una actividad menciona seguir/revisar un ejemplo, debes incluir un ejemplo resuelto literal dentro de esa misma actividad o en las instrucciones de su bloque. Responde solo JSON válido con el mismo schema."
    },
    {
      role: "user",
      content: `Actividades con ejemplo faltante: ${labels || "No especificadas"}.

Regla obligatoria:
- No elimines la referencia al ejemplo.
- Incluye el ejemplo resuelto de forma explícita y visible para el alumnado dentro de la actividad.
- Mantén coherencia con edad, materia y consigna original.

Contexto:
${JSON.stringify(payload)}

JSON actual:
${JSON.stringify(originalResult)}`
    }
  ];

  const response = await requestModel(messages);
  if (!response.ok) {
    throw new Error("No se pudo materializar ejemplos con el modelo.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía al materializar ejemplos.");
  }

  return JSON.parse(content);
}

function includesExampleSignal(text) {
  const value = normalizeSupportLabel(text);
  if (!value) return false;
  return (
    /\b(ejemplo resuelto|ejemplo guiado|modelo resuelto|resolucion guiada|aprendizaje por ejemplo)\b/.test(value) ||
    /\b(sigue|siguiendo|lee|revisa|consulta|guiate|basate|basandote)\b[^.:\n]{0,45}\bejemplo\b/.test(value) ||
    /\bejemplo\s+(mostrado|anterior|previo|adjunto|de referencia)\b/.test(value)
  );
}

function resultNeedsExamplePedagogy(result, payload) {
  const teacherNeed = includesExampleSignal(payload?.teacherNotes || "");
  if (teacherNeed) return true;

  return (result?.studentMaterial?.workbookPages || []).some((page) =>
    (page?.activities || []).some((activity) =>
      includesExampleSignal([activity?.taskTitle, activity?.statement, ...(activity?.steps || [])].join(" "))
    )
  );
}

function hasStepByStepModel(text) {
  const value = normalizeSupportLabel(text);
  return (
    /\b(datos|dato inicial|se pide|paso 1|paso a paso|procedimiento|estrategia|formula|resultado final|comprobacion|interpretacion)\b/.test(
      value
    ) && /\bresultado\b/.test(value)
  );
}

function hasTransferExercise(text) {
  const value = normalizeSupportLabel(text);
  return /\b(ahora tu|nuevo ejercicio|practica autonoma|intentalo|resuelve ahora)\b/.test(value);
}

function getExampleQualityGaps(result) {
  const gaps = [];
  const pages = result?.studentMaterial?.workbookPages || [];

  pages.forEach((page, pageIndex) => {
    (page.activities || []).forEach((activity, activityIndex) => {
      const merged = [activity?.taskTitle, activity?.statement, ...(activity?.steps || []), activity?.expectedOutput].filter(Boolean).join(" ");
      if (!includesExampleSignal(merged)) return;

      if (!hasStepByStepModel(merged)) {
        gaps.push(
          `página ${pageIndex + 1}, actividad ${activityIndex + 1}: falta modelo resuelto con pasos explícitos (datos, procedimiento, aplicación, resultado, comprobación).`
        );
      }
      if (!hasTransferExercise(merged)) {
        gaps.push(
          `página ${pageIndex + 1}, actividad ${activityIndex + 1}: falta ejercicio de transferencia para alumnado (misma habilidad, datos distintos, sin solución final).`
        );
      }
    });
  });

  return gaps;
}

function buildStructuredExampleBlock(activity, payload) {
  const subject = payload?.subject || "la materia";
  const task = String(activity?.taskTitle || "la actividad").trim();
  return [
    `Ejemplo resuelto (${task})`,
    `1) Situación: contexto breve vinculado a ${subject}.`,
    "2) Datos iniciales: identifica y anota todos los datos relevantes.",
    "3) Qué se pide: expresa con claridad el objetivo del problema.",
    "4) Resolución modelada paso a paso:",
    "   - identificación de datos",
    "   - estrategia/regla/procedimiento",
    "   - aplicación paso a paso",
    "   - resultado final",
    "   - comprobación o interpretación final",
    "5) Nuevo ejercicio para el alumnado (misma habilidad, datos distintos):",
    "   - resuélvelo siguiendo el mismo procedimiento",
    "   - puedes usar estas pistas: identifica datos, elige estrategia y verifica al final",
    "   - no incluyas la solución final en esta parte"
  ].join(" ");
}

function materializeExamplePedagogyLocally(result, payload) {
  const pages = result?.studentMaterial?.workbookPages || [];
  pages.forEach((page) => {
    (page.activities || []).forEach((activity) => {
      const merged = [activity?.taskTitle, activity?.statement, ...(activity?.steps || [])].filter(Boolean).join(" ");
      if (!includesExampleSignal(merged)) return;

      const block = buildStructuredExampleBlock(activity, payload);
      const statement = String(activity.statement || "");
      if (!/situacion|situación|datos iniciales|resolucion modelada|resolución modelada/i.test(statement)) {
        activity.statement = `${statement.trim()} ${block}`.trim();
      }
      if (!Array.isArray(activity.steps)) activity.steps = [];
      if (!activity.steps.some((step) => /nuevo ejercicio|ahora tu|ahora tú|misma habilidad/i.test(String(step || "")))) {
        activity.steps.push("Ahora tú: resuelve un nuevo ejercicio equivalente con datos distintos, aplicando el mismo procedimiento.");
      }
    });
  });
  return result;
}

async function enforceExamplePedagogyQuality(result, payload) {
  if (!resultNeedsExamplePedagogy(result, payload)) {
    return result;
  }

  const gaps = getExampleQualityGaps(result);
  if (gaps.length === 0) {
    return result;
  }

  nodes.loadingText.textContent = "Refinando modelado por ejemplo";

  try {
    const repaired = await repairExamplePedagogyWithModel(result, payload, gaps);
    const remaining = getExampleQualityGaps(repaired);
    if (remaining.length === 0) {
      return repaired;
    }
    pendingQualityWarning =
      "Aviso de calidad: se reforzó automáticamente la estructura de ejemplo resuelto + ejercicio de transferencia para mantener coherencia didáctica.";
    return materializeExamplePedagogyLocally(repaired, payload);
  } catch {
    pendingQualityWarning =
      "Aviso de calidad: no se pudo refinar con el modelo; se añadió estructura pedagógica local de modelado y transferencia.";
    return materializeExamplePedagogyLocally(result, payload);
  }
}

async function repairExamplePedagogyWithModel(originalResult, payload, gaps) {
  const messages = [
    {
      role: "system",
      content:
        "Corrige una propuesta didáctica JSON para aprendizaje por ejemplo. Cuando exista ejemplo/modelo/resolución guiada, incluye obligatoriamente un ejemplo resuelto completo y un ejercicio de transferencia del mismo tipo, sin dar la solución final del ejercicio del alumno. Responde solo JSON válido con el mismo schema."
    },
    {
      role: "user",
      content: `Deficiencias detectadas:
- ${gaps.join("\n- ")}

Estructura obligatoria:
1) contexto,
2) datos iniciales,
3) qué se pide,
4) resolución paso a paso (datos, estrategia, aplicación, resultado, comprobación),
5) nuevo ejercicio del mismo tipo con datos distintos.

Reglas:
- El nuevo ejercicio no debe venir totalmente resuelto.
- Puede incluir pistas, no solución final.
- Debe mantenerse la misma habilidad/procedimiento entre ejemplo y nuevo ejercicio.
- Mantén coherencia con edad, materia y contexto del usuario.

Contexto:
${JSON.stringify(payload)}

JSON actual:
${JSON.stringify(originalResult)}`
    }
  ];

  const response = await requestModel(messages);
  if (!response.ok) {
    throw new Error("No se pudo reforzar calidad de ejemplos.");
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía al reforzar ejemplos.");
  }
  return JSON.parse(content);
}

async function repairConsistencyWithModel(originalResult, payload, issues) {
  const messages = [
    {
      role: "system",
      content:
        "Corrige una propuesta didáctica JSON ya generada. Debes mantener calidad pedagógica y corregir referencias internas rotas. Responde solo JSON válido con el mismo schema."
    },
    {
      role: "user",
      content: `Corrige estas incoherencias detectadas:\n- ${issues.join("\n- ")}\n\nContexto original:\n${JSON.stringify(
        payload
      )}\n\nJSON actual a corregir:\n${JSON.stringify(originalResult)}\n\nRegla: si se menciona un ejercicio/problema/tabla/imagen, ese recurso debe existir realmente en la salida. Si una actividad declara "material de apoyo incluido", ese material también debe existir realmente dentro del JSON final. Si una actividad pide seguir o revisar un ejemplo, debes incluir el ejemplo resuelto de forma literal en esa actividad.`
    }
  ];

  const response = await requestModel(messages);
  if (!response.ok) {
    throw new Error("No se pudo corregir coherencia.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía en corrección.");
  }
  return JSON.parse(content);
}

function renderResult(result) {
  nodes.resultTitle.textContent = result.title;
  nodes.resultSubtitle.textContent = result.subtitle;

  nodes.resultChips.innerHTML = [result.activityType, result.stageLabel, `${result.age} años`, result.country, result.subject]
    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
    .join("");

  activeTab = "student";
  renderTabs();
  renderTabContent(result);
  toggleHidden(nodes.resultSection, false);
  nodes.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTabs() {
  nodes.tabs.innerHTML = TABS.map((tab) => `<button class="tab-btn ${activeTab === tab.key ? "active" : ""}" data-tab="${tab.key}">${tab.label}</button>`).join("");

  nodes.tabs.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderTabs();
      renderTabContent(lastResult);
    });
  });
}

function renderTabContent(result) {
  if (!result) {
    return;
  }

  if (activeTab === "student") {
    const activities = buildStudentWorkbookEntries(result);
    const visualAssets = result.studentMaterial?.visualAssets || [];
    nodes.tabContent.innerHTML = `
      ${renderVisualAssetsHtml(visualAssets)}
      <article class="student-doc">
        <h3>${escapeHtml(result.studentMaterial?.studentTitle || "Cuaderno del alumnado")}</h3>
        <p>${escapeHtml(result.studentMaterial?.studentIntro || "")}</p>
        <div class="student-box">
          <p class="student-box-title">Formato de entrega final (léelo antes de empezar)</p>
          <p>${escapeHtml(result.studentMaterial?.finalSubmissionInstruction || "")}</p>
        </div>
        ${
          activities.length === 0
            ? `<p class="muted">No se han encontrado actividades para el alumnado.</p>`
            : activities
                .map(
                  (entry, entryIndex) => `
                <section class="student-task">
                  <p class="student-task-kicker">Actividad ${entry.globalIndex}</p>
                  <div class="student-task-head">
                    <h5>${escapeHtml(entry.activity.taskTitle || "")}</h5>
                    <span class="activity-mode-chip">${escapeHtml(entry.modeLabel)}</span>
                  </div>
                  <div><strong>Enunciado:</strong><br>${formatStudentStatementHtml(entry)}</div>
                  ${
                    Array.isArray(entry.activity.steps) && entry.activity.steps.length > 0
                      ? `
                    <p><strong>Desarrollo de la actividad:</strong></p>
                    <ol>${entry.activity.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
                  `
                      : ""
                  }
                </section>
                ${entryIndex < activities.length - 1 ? '<hr class="activity-divider" />' : ""}
              `
                )
                .join("")
        }
        <div class="student-box">
          <p class="student-box-title">Recordatorio de entrega final</p>
          <p>${escapeHtml(result.studentMaterial?.finalSubmissionInstruction || "")}</p>
        </div>
      </article>
    `;
    return;
  }

  if (activeTab === "sequence") {
    nodes.tabContent.innerHTML = `
      <div class="block">
        <h3>Secuencia operativa para clase</h3>
        ${(result.sequence || [])
          .map(
            (block) => `
          <div class="sequence-phase">
            <h4>${escapeHtml(block.phase || "")}</h4>
            <p><strong>Objetivo de fase:</strong> ${escapeHtml(block.purpose || "")}</p>
            <p><strong>Tarea cerrada para alumnado:</strong> ${escapeHtml(block.studentAction || "")}</p>
            <p><strong>Evidencia que se recoge:</strong> ${escapeHtml(block.expectedEvidence || "")}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    return;
  }

  if (activeTab === "teacher") {
    const teacherActivities = buildTeacherWorkbookEntries(result);
    nodes.tabContent.innerHTML = `
      <article class="teacher-doc">
        <h3>Cuaderno docente (misma secuencia que el alumnado)</h3>
        <p>${escapeHtml(result.teacherGuide?.implementationSummary || result.teacherNotes || "")}</p>
        ${
          teacherActivities.length === 0
            ? `<p class="muted">No se han encontrado actividades para generar la guía docente.</p>`
            : teacherActivities
                .map(
                  (entry, idx) => `
                <section class="student-task">
                  <p class="student-task-kicker">Actividad ${entry.globalIndex}</p>
                  <h5>${escapeHtml(entry.activity.taskTitle || "")}</h5>
                  ${entry.pageTitle ? `<p><strong>Bloque:</strong> ${escapeHtml(entry.pageTitle)}</p>` : ""}
                  <p><strong>Consigna para alumnado:</strong> ${escapeHtml(entry.activity.statement || "")}</p>
                  ${
                    entry.pageInstructions?.length
                      ? `<p><strong>Indicaciones generales del bloque:</strong> ${escapeHtml(entry.pageInstructions.join(" | "))}</p>`
                      : ""
                  }
                  <p><strong>Pasos que seguirá el alumnado:</strong></p>
                  <ol>${(entry.activity.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
                  <p><strong>Producto esperado del alumnado:</strong> ${escapeHtml(entry.activity.expectedOutput || "")}</p>
                  <div class="teacher-guidance">
                    <p><strong>Intención didáctica:</strong> ${escapeHtml(entry.teacherPurpose)}</p>
                    <p><strong>Intervención docente:</strong> ${escapeHtml(entry.teacherAction)}</p>
                    <p><strong>Apoyos y materiales para esta actividad:</strong> ${escapeHtml(entry.teacherSupport)}</p>
                    <p><strong>Qué observar y evaluar:</strong> ${escapeHtml(entry.teacherEvidence)}</p>
                  </div>
                </section>
                ${idx < teacherActivities.length - 1 ? '<hr class="activity-divider" />' : ""}
              `
                )
                .join("")
        }
      </article>
      <div class="block">
        <h3>Apoyos docentes globales</h3>
        <ul>${(result.teacherGuide?.supportsApplied || result.scaffolds || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <h3>Diferenciación y ajustes</h3>
        <ul>${(result.teacherGuide?.differentiation || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <h3>Criterios de evaluación</h3>
        <ul>${(result.teacherGuide?.evaluationCriteria || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    `;
    return;
  }

  if (activeTab === "assessment") {
    nodes.tabContent.innerHTML = `
      <div class="block">
        <h3>Criterios de evaluación listos para usar</h3>
        <ul>${(result.teacherGuide?.evaluationCriteria || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <h3>Síntesis de evaluación</h3>
        <p>${escapeHtml(result.assessment || "")}</p>
      </div>
      <div class="block">
        <h3>Ajustes finales</h3>
        <p><strong>Adaptación:</strong> ${escapeHtml(result.adaptationNotes || "")}</p>
        <p><strong>Duración estimada:</strong> ${escapeHtml(result.sessionEstimate || "")}</p>
        <p><strong>Producto final:</strong> ${escapeHtml(result.finalProduct || "")}</p>
      </div>
    `;
    return;
  }

  nodes.tabContent.innerHTML = `
    <div class="block">
      <h3>Por qué esta propuesta es consistente con la metodología de The Good Teacher Club</h3>
      ${(result.dimensionsSummary || [])
        .map(
          (dimension) => `
        <div class="block" style="margin-top: 0.65rem;">
          <h4>${escapeHtml(dimension.title || "")}</h4>
          <p>${escapeHtml(dimension.explanation || "")}</p>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function flattenWorkbookActivities(result) {
  const pages = result?.studentMaterial?.workbookPages || [];
  const list = [];
  let globalIndex = 1;

  pages.forEach((page, pageIndex) => {
    const pageInstructions = page?.studentInstructions || [];
    (page?.activities || []).forEach((activity, activityIndex) => {
      list.push({
        globalIndex,
        pageIndex,
        activityIndex,
        pageTitle: page?.pageTitle || "",
        pageInstructions,
        activity
      });
      globalIndex += 1;
    });
  });

  return list;
}

function buildStudentWorkbookEntries(result) {
  const entries = flattenWorkbookActivities(result);
  const sequence = result?.sequence || [];

  return entries.map((entry, idx) => {
    const seq = sequence[idx % Math.max(1, sequence.length)] || {};
    const mode = classifyStudentMode(seq);
    return {
      ...entry,
      modeLabel: mode.label,
      modeNote: mode.note
    };
  });
}

function buildStudentStatementText(entry) {
  return String(entry?.activity?.statement || "").trim();
}

function splitQuestionsForReadability(text) {
  return String(text || "")
    .replace(/\s+(?=\d+\.\s*¿)/g, "\n")
    .replace(/\?\s*(?=\d+\.\s*¿)/g, "?\n")
    .replace(/([.:])\s+(?=¿)/g, "$1\n")
    .replace(/\?\s*(?=¿)/g, "?\n")
    .replace(/\?\s+(?=[A-ZÁÉÍÓÚÑ])/g, "?\n");
}

function splitExampleStatementSections(text) {
  const normalized = String(text || "")
    .replace(
      /\s+(?=(Contexto:|Datos iniciales:|Qué se pide:|Que se pide:|Resolución paso a paso:|Resolucion paso a paso:|Ejercicio de transferencia:|Ejercicio para el alumnado:|Ahora tú:|Ahora tu:))/gi,
      "\n"
    )
    .replace(/\s+(?=\d+\.\s)/g, "\n");

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = {
    intro: [],
    context: [],
    data: [],
    ask: [],
    resolution: [],
    transfer: []
  };

  let current = "intro";
  lines.forEach((line) => {
    const lowered = normalizeSupportLabel(line);
    if (lowered.startsWith("contexto:")) {
      current = "context";
      const content = line.replace(/^contexto:\s*/i, "").trim();
      if (content) sections.context.push(content);
      return;
    }
    if (lowered.startsWith("datos iniciales:")) {
      current = "data";
      const content = line.replace(/^datos iniciales:\s*/i, "").trim();
      if (content) sections.data.push(content);
      return;
    }
    if (lowered.startsWith("que se pide:") || lowered.startsWith("qué se pide:")) {
      current = "ask";
      const content = line.replace(/^qu[eé]\s+se\s+pide:\s*/i, "").trim();
      if (content) sections.ask.push(content);
      return;
    }
    if (lowered.startsWith("resolucion paso a paso:") || lowered.startsWith("resolución paso a paso:")) {
      current = "resolution";
      const content = line.replace(/^resoluci[oó]n\s+paso\s+a\s+paso:\s*/i, "").trim();
      if (content) sections.resolution.push(content);
      return;
    }
    if (
      lowered.startsWith("ejercicio de transferencia:") ||
      lowered.startsWith("ejercicio para el alumnado:") ||
      lowered.startsWith("ahora tu:") ||
      lowered.startsWith("ahora tú:")
    ) {
      current = "transfer";
      const content = line
        .replace(/^ejercicio\s+de\s+transferencia:\s*/i, "")
        .replace(/^ejercicio\s+para\s+el\s+alumnado:\s*/i, "")
        .replace(/^ahora\s+t[uú]:\s*/i, "")
        .trim();
      if (content) sections.transfer.push(content);
      return;
    }

    sections[current].push(line);
  });

  return sections;
}

function formatStructuredExampleStatementHtml(text) {
  const sections = splitExampleStatementSections(text);
  const renderParagraphs = (lines) => lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  const resolutionItems = sections.resolution
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  const resolutionHtml =
    resolutionItems.length > 0
      ? `<ol>${resolutionItems.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ol>`
      : "";

  return `
    <div class="example-model-card">
      ${sections.intro.length ? `<div class="example-model-block">${renderParagraphs(sections.intro)}</div>` : ""}
      ${sections.context.length ? `<div class="example-model-block"><p class="example-model-label">Contexto</p>${renderParagraphs(sections.context)}</div>` : ""}
      ${sections.data.length ? `<div class="example-model-block"><p class="example-model-label">Datos iniciales</p>${renderParagraphs(sections.data)}</div>` : ""}
      ${sections.ask.length ? `<div class="example-model-block"><p class="example-model-label">Qué se pide</p>${renderParagraphs(sections.ask)}</div>` : ""}
      ${
        sections.resolution.length
          ? `<div class="example-model-block"><p class="example-model-label">Resolución paso a paso</p>${resolutionHtml || renderParagraphs(
              sections.resolution
            )}</div>`
          : ""
      }
      ${sections.transfer.length ? `<div class="example-model-block"><p class="example-model-label">Ejercicio de transferencia</p>${renderParagraphs(sections.transfer)}</div>` : ""}
    </div>
  `;
}

function formatStudentStatementHtml(entry) {
  const merged = buildStudentStatementText(entry);
  if (includesExampleSignal(merged)) {
    return formatStructuredExampleStatementHtml(merged);
  }
  const readable = splitQuestionsForReadability(merged);
  return escapeHtml(readable).replace(/\n/g, "<br>");
}

function classifyStudentMode(sequenceBlock) {
  const phase = normalizeSupportLabel(sequenceBlock?.phase || "");

  if (phase.includes("modelado")) {
    return {
      label: "Modelado del docente",
      note: "Primero observa el ejemplo del docente y después replica el procedimiento indicado."
    };
  }
  if (phase.includes("practica guiada")) {
    return {
      label: "Práctica guiada",
      note: "Realiza la actividad con acompañamiento y corrección durante el proceso."
    };
  }
  if (phase.includes("practica autonoma")) {
    return {
      label: "Práctica autónoma",
      note: "Resuélvela de manera individual aplicando lo aprendido."
    };
  }
  if (phase.includes("reto") || phase.includes("producto final")) {
    return {
      label: "Aplicación final",
      note: "Integra lo trabajado en una tarea de cierre con mayor autonomía."
    };
  }
  if (phase.includes("activacion") || phase.includes("presentacion")) {
    return {
      label: "Inicio guiado",
      note: "Actividad de arranque para activar ideas y comprender el objetivo."
    };
  }
  return { label: "Trabajo en aula", note: "" };
}

function buildTeacherWorkbookEntries(result) {
  const entries = flattenWorkbookActivities(result);
  const sequence = result?.sequence || [];
  const supports = result?.teacherGuide?.supportsApplied || result?.scaffolds || [];
  const evalCriteria = result?.teacherGuide?.evaluationCriteria || [];

  return entries.map((entry, idx) => {
    const seq = sequence[idx % Math.max(1, sequence.length)] || {};
    const mode = classifyStudentMode(seq);
    const supportParts = [
      entry.activity?.supportMaterial || "",
      seq.support || "",
      supports[idx % Math.max(1, supports.length)] || ""
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean);

    return {
      ...entry,
      modeLabel: mode.label,
      teacherPurpose: seq.purpose || result?.pedagogicalIntent || "Consolidar el objetivo de aprendizaje de la secuencia.",
      teacherAction:
        seq.teacherAction ||
        "Modela brevemente el procedimiento, verifica comprensión en cada paso y ofrece feedback inmediato antes de avanzar.",
      teacherSupport: supportParts.join(" | ") || "Revisar consigna, ofrecer ejemplo guiado y retirar apoyo de forma progresiva.",
      teacherEvidence:
        seq.expectedEvidence ||
        evalCriteria[idx % Math.max(1, evalCriteria.length)] ||
        entry.activity?.expectedOutput ||
        "Recoger evidencia de proceso y producto para valorar logro del objetivo."
    };
  });
}

function renderVisualAssetsHtml(assets) {
  if (!Array.isArray(assets) || assets.length === 0) {
    return "";
  }

  return `
    <section class="block block-highlight">
      <h4>Recursos visuales incluidos</h4>
      <div class="visual-assets-grid">
        ${assets
          .map((asset) => {
            if (asset.assetType === "table") {
              const headers = (asset.tableColumns || []).map((col) => `<th>${escapeHtml(col)}</th>`).join("");
              const rows = (asset.tableRows || [])
                .map(
                  (row) =>
                    `<tr>${(row || [])
                      .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                      .join("")}</tr>`
                )
                .join("");
              return `
                <article class="visual-card">
                  <h5>${escapeHtml(asset.title || "Tabla de apoyo")}</h5>
                  <p>${escapeHtml(asset.instruction || "")}</p>
                  <div class="table-wrap">
                    <table class="asset-table">
                      <thead><tr>${headers}</tr></thead>
                      <tbody>${rows}</tbody>
                    </table>
                  </div>
                </article>
              `;
            }

            return `
              <article class="visual-card">
                <h5>${escapeHtml(asset.title || "Imagen de apoyo")}</h5>
                <p>${escapeHtml(asset.instruction || "")}</p>
                <p class="ai-disclaimer"><strong>Aviso:</strong> Recreación visual generada con IA. No corresponde a una fotografía real.</p>
                ${
                  asset.generatedImageUrl
                    ? `<img class="generated-image" src="${asset.generatedImageUrl}" alt="${escapeHtml(asset.title || "Recurso visual")}" />`
                    : `<p class="muted">No se pudo generar la imagen automáticamente en este intento.</p>`
                }
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function setLoading(isLoading) {
  nodes.generateBtn.disabled = isLoading;
  toggleHidden(nodes.loadingText, !isLoading);
  if (!isLoading) {
    clearInterval(loadingTimer);
    loadingTimer = null;
    nodes.loadingText.textContent = LOADING_STEPS[0];
    return;
  }

  let index = 0;
  nodes.loadingText.textContent = LOADING_STEPS[index];
  loadingTimer = setInterval(() => {
    index = (index + 1) % LOADING_STEPS.length;
    nodes.loadingText.textContent = LOADING_STEPS[index];
  }, 1300);
}

function requireResultForExport() {
  if (!lastResult) {
    showGeneralError("Primero genera una actividad para poder exportarla.");
    return false;
  }
  return true;
}

function showCopyFeedback(message) {
  nodes.copyFeedback.textContent = message;
  toggleHidden(nodes.copyFeedback, false);
  setTimeout(() => toggleHidden(nodes.copyFeedback, true), 2200);
}

function getSafeBaseFileName() {
  return (lastResult?.title || "actividad-tgtc").replace(/[\\/:*?"<>|]+/g, "").slice(0, 80);
}

function buildResultMetaChips(result) {
  return [result.activityType, result.stageLabel, `${result.age} años`, result.country, result.subject].filter(Boolean);
}

function createDocxParagraphsFactory(docxApi) {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType } = docxApi;
  const DOCX_FONT = "Calibri";
  const run = (text, options = {}) => new TextRun({ text, font: DOCX_FONT, ...options });

  const title = (text) =>
    new Paragraph({
      spacing: { after: 120 },
      children: [run(text, { bold: true, color: "53207F", size: 38 })]
    });

  const brand = () =>
    new Paragraph({
      spacing: { after: 220 },
      children: [run("", { bold: true, color: "6E2EA6", size: 24 })]
    });

  const chips = (items) =>
    new Paragraph({
      spacing: { after: 220 },
      children: [run(items.join("  |  "), { color: "512275", size: 20 })]
    });

  const section = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 110 },
      children: [run(text, { bold: true, color: "512275", size: 26 })]
    });

  const activityTitle = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 80, after: 140 },
      children: [run(text, { bold: true, color: "43205F", size: 24 })]
    });

  const modeChip = (text) =>
    new Paragraph({
      spacing: { after: 90 },
      children: [run(`[${text}]`, { bold: true, color: "6E2EA6", size: 20 })]
    });

  const body = (text, after = 90) =>
    new Paragraph({
      spacing: { after },
      children: [run(String(text || ""), { size: 22, color: "261336" })]
    });

  const bullet = (text) =>
    new Paragraph({
      spacing: { after: 70 },
      indent: { left: 320, hanging: 180 },
      children: [run(`• ${text}`, { size: 21, color: "261336" })]
    });

  const divider = () =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 80, after: 80 },
      children: [run("────────────────────────────────────────", { color: "C8B2DB", size: 18 })]
    });

  return { title, brand, chips, section, activityTitle, modeChip, body, bullet, divider };
}

async function exportStudentDocx() {
  if (!requireResultForExport()) return;
  if (!window.docx || !window.saveAs) {
    showGeneralError("No se ha podido cargar la librería de exportación .docx.");
    return;
  }

  try {
    const { Document, Packer } = window.docx;
    const P = createDocxParagraphsFactory(window.docx);
    const docChildren = [];
    const activities = buildStudentWorkbookEntries(lastResult);
    const visualAssets = lastResult.studentMaterial?.visualAssets || [];
    const chips = buildResultMetaChips(lastResult);

    docChildren.push(
      P.title(`${lastResult.title || "Actividad didáctica"} · Cuaderno del alumnado`),
      P.chips(chips),
      P.body(lastResult.studentMaterial?.studentIntro || "", 150),
      P.section("Formato de Entrega Final"),
      P.body(lastResult.studentMaterial?.finalSubmissionInstruction || "", 170)
    );

    if (visualAssets.length > 0) {
      docChildren.push(P.section("Recursos Visuales Incluidos"));
      visualAssets.forEach((asset) => {
        docChildren.push(P.activityTitle(`${asset.assetType === "table" ? "Tabla" : "Imagen"} · ${asset.title || "Recurso visual"}`));
        if (asset.instruction) docChildren.push(P.body(`Uso didáctico: ${asset.instruction}`));
        if (asset.assetType === "image") {
          docChildren.push(P.body("Aviso: Recreación visual generada con IA. No corresponde a una fotografía real."));
        }
        docChildren.push(P.divider());
      });
    }

    docChildren.push(P.section("Actividades"));
    activities.forEach((entry) => {
      const statementLines = splitQuestionsForReadability(buildStudentStatementText(entry))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      docChildren.push(
        P.activityTitle(`Actividad ${entry.globalIndex} · ${entry.activity.taskTitle || ""}`),
        P.modeChip(entry.modeLabel),
        P.body(`Enunciado: ${statementLines[0] || ""}`),
        ...statementLines.slice(1).map((line) => P.body(line, 70))
      );
      if (Array.isArray(entry.activity.steps) && entry.activity.steps.length > 0) {
        docChildren.push(P.body("Desarrollo de la actividad:"));
        entry.activity.steps.forEach((step) => {
          docChildren.push(P.bullet(step));
        });
      }
      docChildren.push(P.divider());
    });

    docChildren.push(
      P.section("Recordatorio de Entrega Final"),
      P.body(lastResult.studentMaterial?.finalSubmissionInstruction || "", 170)
    );

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri"
            }
          }
        }
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 }
            }
          },
          children: docChildren
        }
      ]
    });
    const blob = await Packer.toBlob(doc);
    window.saveAs(blob, `${getSafeBaseFileName()}-alumno.docx`);
    showCopyFeedback("Cuaderno del alumnado (.docx) exportado");
  } catch {
    showGeneralError("No se pudo exportar el .docx del alumnado.");
  }
}

async function exportTeacherDocx() {
  if (!requireResultForExport()) return;
  if (!window.docx || !window.saveAs) {
    showGeneralError("No se ha podido cargar la librería de exportación .docx.");
    return;
  }

  try {
    const { Document, Packer } = window.docx;
    const P = createDocxParagraphsFactory(window.docx);
    const docChildren = [];
    const entries = buildTeacherWorkbookEntries(lastResult);
    const chips = buildResultMetaChips(lastResult);

    docChildren.push(
      P.title(`${lastResult.title || "Actividad didáctica"} · Cuaderno docente`),
      P.chips(chips),
      P.body(lastResult.teacherGuide?.implementationSummary || "", 220)
    );

    docChildren.push(P.section("Secuencia de Actividades"));
    entries.forEach((entry) => {
      docChildren.push(
        P.activityTitle(`Actividad ${entry.globalIndex} · ${entry.activity.taskTitle || ""}`),
        P.body(`Bloque: ${entry.pageTitle || "General"}`),
        P.modeChip(entry.modeLabel || "Trabajo en aula"),
        P.body(`Consigna para alumnado: ${entry.activity.statement || ""}`),
        P.body(`Indicaciones del bloque: ${(entry.pageInstructions || []).join(" | ") || "No aplica"}`),
        P.body("Pasos del alumnado:")
      );
      (entry.activity.steps || []).forEach((step) => {
        docChildren.push(P.bullet(step));
      });
      docChildren.push(
        P.body(`Producto esperado del alumnado: ${entry.activity.expectedOutput || ""}`),
        P.body(`Intención didáctica: ${entry.teacherPurpose}`),
        P.body(`Intervención docente: ${entry.teacherAction}`),
        P.body(`Apoyos y materiales: ${entry.teacherSupport}`),
        P.body(`Qué observar y evaluar: ${entry.teacherEvidence}`, 120),
        P.divider()
      );
    });

    docChildren.push(
      P.section("Diferenciación"),
      ...((lastResult.teacherGuide?.differentiation || []).map(
        (item) => P.bullet(item)
      )),
      P.section("Criterios de evaluación"),
      ...((lastResult.teacherGuide?.evaluationCriteria || []).map(
        (item) => P.bullet(item)
      ))
    );

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri"
            }
          }
        }
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 }
            }
          },
          children: docChildren
        }
      ]
    });
    const blob = await Packer.toBlob(doc);
    window.saveAs(blob, `${getSafeBaseFileName()}-docente.docx`);
    showCopyFeedback("Cuaderno docente (.docx) exportado");
  } catch {
    showGeneralError("No se pudo exportar el .docx docente.");
  }
}

function buildStudentPdfLines(result) {
  const lines = [];
  const activities = buildStudentWorkbookEntries(result);
  const visualAssets = result.studentMaterial?.visualAssets || [];
  lines.push(`${result.title || "Actividad didáctica"} - Cuaderno del alumnado`);
  lines.push("");
  lines.push(result.studentMaterial?.studentIntro || "");
  lines.push("");
  lines.push("Formato de entrega final (léelo antes de empezar):");
  lines.push(result.studentMaterial?.finalSubmissionInstruction || "");
  lines.push("");

  if (visualAssets.length > 0) {
    lines.push("Recursos visuales incluidos:");
    visualAssets.forEach((asset) => {
      lines.push(`- ${asset.assetType === "table" ? "Tabla" : "Imagen"}: ${asset.title || ""}`);
      if (asset.instruction) {
        lines.push(`  Uso: ${asset.instruction}`);
      }
      if (asset.assetType === "image") {
        lines.push("  Aviso: Recreación visual generada con IA. No corresponde a una fotografía real.");
      }
    });
    lines.push("");
  }

  activities.forEach((entry) => {
    const statementLines = splitQuestionsForReadability(buildStudentStatementText(entry))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    lines.push(`Actividad ${entry.globalIndex}: ${entry.activity.taskTitle || ""}`);
    lines.push(`[${entry.modeLabel}]`);
    lines.push(`Enunciado: ${statementLines[0] || ""}`);
    statementLines.slice(1).forEach((line) => lines.push(line));
    if (Array.isArray(entry.activity.steps) && entry.activity.steps.length > 0) {
      lines.push("Desarrollo de la actividad:");
      entry.activity.steps.forEach((step, idx) => lines.push(`  ${idx + 1}. ${step}`));
    }
    lines.push("");
  });

  lines.push("Recordatorio de entrega final:");
  lines.push(result.studentMaterial?.finalSubmissionInstruction || "");
  return lines;
}

function buildTeacherPdfLines(result) {
  const lines = [];
  const entries = buildTeacherWorkbookEntries(result);
  lines.push(`${result.title || "Actividad didáctica"} - Cuaderno docente`);
  lines.push("");
  lines.push(result.teacherGuide?.implementationSummary || "");
  lines.push("");

  entries.forEach((entry) => {
    lines.push(`Actividad ${entry.globalIndex}: ${entry.activity.taskTitle || ""}`);
    lines.push(`Bloque: ${entry.pageTitle || "General"}`);
    lines.push(`Consigna para alumnado: ${entry.activity.statement || ""}`);
    lines.push(`Indicaciones generales del bloque: ${(entry.pageInstructions || []).join(" | ") || "No aplica"}`);
    lines.push("Pasos del alumnado:");
    (entry.activity.steps || []).forEach((step, idx) => lines.push(`  ${idx + 1}. ${step}`));
    lines.push(`Producto esperado: ${entry.activity.expectedOutput || ""}`);
    lines.push(`Intención didáctica: ${entry.teacherPurpose}`);
    lines.push(`Intervención docente: ${entry.teacherAction}`);
    lines.push(`Apoyos y materiales: ${entry.teacherSupport}`);
    lines.push(`Qué observar y evaluar: ${entry.teacherEvidence}`);
    lines.push("");
  });

  return lines;
}

function saveLinesAsPdf(lines, filename) {
  if (!window.jspdf?.jsPDF) {
    showGeneralError("No se ha podido cargar la librería de exportación PDF.");
    return false;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const maxWidth = 180;
  const pageHeight = 285;
  let y = 15;

  lines.forEach((line) => {
    const chunks = doc.splitTextToSize(String(line || ""), maxWidth);
    const draw = chunks.length > 0 ? chunks : [""];
    draw.forEach((chunk) => {
      if (y > pageHeight) {
        doc.addPage();
        y = 15;
      }
      doc.text(chunk, 15, y);
      y += 6;
    });
  });

  doc.save(filename);
  return true;
}

function createStyledPdfRenderer(doc) {
  const purple = [83, 32, 127];
  const softPurple = [247, 239, 252];
  const text = [38, 19, 54];
  const muted = [95, 80, 110];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2;
  let y = 20;

  const ensureSpace = (needed = 10) => {
    if (y + needed <= pageHeight - 15) return;
    doc.addPage();
    y = 20;
  };

  const header = (title, subtitle, chips = []) => {
    const innerWidth = contentWidth - 8;
    const titleLines = doc.splitTextToSize(String(title || ""), innerWidth);
    const subtitleLines = subtitle ? doc.splitTextToSize(String(subtitle), innerWidth) : [];
    const titleLineHeight = 7;
    const subtitleLineHeight = 4.6;
    const topPad = 7;
    const bottomPad = 6;
    const headerHeight =
      topPad +
      titleLines.length * titleLineHeight +
      (subtitleLines.length > 0 ? 2 + subtitleLines.length * subtitleLineHeight : 0) +
      bottomPad;

    doc.setFillColor(...purple);
    doc.roundedRect(marginX, y, contentWidth, headerHeight, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    let cursorY = y + topPad;
    titleLines.forEach((line) => {
      doc.text(line, marginX + 4, cursorY);
      cursorY += titleLineHeight;
    });
    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      cursorY += 1.5;
      subtitleLines.forEach((line) => {
        doc.text(line, marginX + 4, cursorY);
        cursorY += subtitleLineHeight;
      });
    }
    y += headerHeight + 6;
    if (chips.length > 0) {
      doc.setTextColor(...muted);
      doc.setFontSize(9);
      doc.text(chips.join("  |  "), marginX, y);
      y += 7;
    }
    doc.setTextColor(...text);
  };

  const section = (title) => {
    ensureSpace(14);
    doc.setFillColor(...softPurple);
    doc.roundedRect(marginX, y, contentWidth, 8, 2, 2, "F");
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, marginX + 3, y + 5.5);
    y += 12;
    doc.setTextColor(...text);
  };

  const paragraph = (value, opts = {}) => {
    const size = opts.size || 10;
    const color = opts.color || text;
    const leading = opts.leading || 5.2;
    ensureSpace(8);
    doc.setTextColor(...color);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(value || ""), contentWidth);
    lines.forEach((line) => {
      ensureSpace(leading + 1);
      doc.text(line, marginX, y);
      y += leading;
    });
    y += opts.after || 1.5;
    doc.setTextColor(...text);
  };

  const activityCard = (title, chip, bodyLines = []) => {
    const previewHeight = 12 + bodyLines.length * 5.2;
    ensureSpace(Math.min(55, Math.max(22, previewHeight)));
    doc.setFillColor(253, 251, 255);
    doc.setDrawColor(217, 201, 231);
    doc.roundedRect(marginX, y, contentWidth, 14, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...purple);
    doc.text(title, marginX + 3, y + 6);
    if (chip) {
      const chipWidth = Math.min(70, doc.getTextWidth(chip) + 8);
      const chipX = marginX + contentWidth - chipWidth - 3;
      doc.setFillColor(247, 239, 252);
      doc.roundedRect(chipX, y + 2, chipWidth, 6, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(81, 34, 117);
      doc.text(chip, chipX + 3, y + 6.3);
    }
    y += 20;
    bodyLines.forEach((line) => paragraph(line, { size: 10, after: 0.5 }));
    y += 2;
  };

  const bullet = (textValue) => paragraph(`• ${textValue}`, { size: 10, after: 0.8 });

  return { header, section, paragraph, activityCard, bullet };
}

function renderStudentPdfStyled(result, filename) {
  if (!window.jspdf?.jsPDF) {
    showGeneralError("No se ha podido cargar la librería de exportación PDF.");
    return false;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const r = createStyledPdfRenderer(doc);
  const activities = buildStudentWorkbookEntries(result);
  const visualAssets = result.studentMaterial?.visualAssets || [];

  r.header(`${result.title || "Actividad didáctica"} · Alumnado`, "", buildResultMetaChips(result));
  r.paragraph(result.studentMaterial?.studentIntro || "");
  r.section("Formato de entrega final");
  r.paragraph(result.studentMaterial?.finalSubmissionInstruction || "");

  if (visualAssets.length > 0) {
    r.section("Recursos visuales");
    visualAssets.forEach((asset) => {
      r.activityCard(`${asset.assetType === "table" ? "Tabla" : "Imagen"} · ${asset.title || "Recurso visual"}`, "", [
        asset.instruction ? `Uso didáctico: ${asset.instruction}` : "",
        asset.assetType === "image" ? "Aviso: Recreación visual generada con IA. No corresponde a una fotografía real." : ""
      ].filter(Boolean));
    });
  }

  r.section("Actividades");
  activities.forEach((entry) => {
    const statementLines = splitQuestionsForReadability(buildStudentStatementText(entry))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const bodyLines = [`Enunciado: ${statementLines[0] || ""}`, ...statementLines.slice(1)];
    if (Array.isArray(entry.activity.steps) && entry.activity.steps.length > 0) {
      bodyLines.push("Desarrollo de la actividad:");
      entry.activity.steps.forEach((step, idx) => bodyLines.push(`  ${idx + 1}. ${step}`));
    }
    r.activityCard(`Actividad ${entry.globalIndex} · ${entry.activity.taskTitle || ""}`, entry.modeLabel, bodyLines);
  });

  r.section("Recordatorio de entrega final");
  r.paragraph(result.studentMaterial?.finalSubmissionInstruction || "");
  doc.save(filename);
  return true;
}

function renderTeacherPdfStyled(result, filename) {
  if (!window.jspdf?.jsPDF) {
    showGeneralError("No se ha podido cargar la librería de exportación PDF.");
    return false;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const r = createStyledPdfRenderer(doc);
  const entries = buildTeacherWorkbookEntries(result);

  r.header(`${result.title || "Actividad didáctica"} · Docente`, "", buildResultMetaChips(result));
  r.section("Resumen de implementación");
  r.paragraph(result.teacherGuide?.implementationSummary || "");

  r.section("Secuencia de actividades");
  entries.forEach((entry) => {
    const bodyLines = [
      `Bloque: ${entry.pageTitle || "General"}`,
      `Consigna para alumnado: ${entry.activity.statement || ""}`,
      `Indicaciones del bloque: ${(entry.pageInstructions || []).join(" | ") || "No aplica"}`,
      "Pasos del alumnado:",
      ...((entry.activity.steps || []).map((step, idx) => `  ${idx + 1}. ${step}`)),
      `Producto esperado del alumnado: ${entry.activity.expectedOutput || ""}`,
      `Intención didáctica: ${entry.teacherPurpose}`,
      `Intervención docente: ${entry.teacherAction}`,
      `Apoyos y materiales: ${entry.teacherSupport}`,
      `Qué observar y evaluar: ${entry.teacherEvidence}`
    ];
    r.activityCard(`Actividad ${entry.globalIndex} · ${entry.activity.taskTitle || ""}`, entry.modeLabel || "", bodyLines);
  });

  r.section("Diferenciación");
  (result.teacherGuide?.differentiation || []).forEach((item) => r.bullet(item));
  r.section("Criterios de evaluación");
  (result.teacherGuide?.evaluationCriteria || []).forEach((item) => r.bullet(item));

  doc.save(filename);
  return true;
}

function exportStudentPdf() {
  if (!requireResultForExport()) return;
  const ok = renderStudentPdfStyled(lastResult, `${getSafeBaseFileName()}-alumno.pdf`);
  if (ok) showCopyFeedback("Cuaderno del alumnado (PDF) exportado");
}

function exportTeacherPdf() {
  if (!requireResultForExport()) return;
  const ok = renderTeacherPdfStyled(lastResult, `${getSafeBaseFileName()}-docente.pdf`);
  if (ok) showCopyFeedback("Cuaderno docente (PDF) exportado");
}

function printCurrentView() {
  if (!requireResultForExport()) return;
  hideGeneralError();
  window.print();
}

function copyBlock(text, message) {
  if (!text) {
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      nodes.copyFeedback.textContent = message;
      toggleHidden(nodes.copyFeedback, false);
      setTimeout(() => toggleHidden(nodes.copyFeedback, true), 2000);
    })
    .catch(() => {
      nodes.copyFeedback.textContent = "No se pudo copiar al portapapeles";
      toggleHidden(nodes.copyFeedback, false);
      setTimeout(() => toggleHidden(nodes.copyFeedback, true), 2000);
    });
}

function resetForm() {
  state = JSON.parse(JSON.stringify(INITIAL_STATE));
  pendingQualityWarning = "";
  persistState();
  syncFormToUI();
  updateConditionalFields();
  clearAllErrors();
  hideGeneralError();
  hideNotice();
  hideCoherenceWarning();
  lastResult = null;
  nodes.tabContent.innerHTML = "";
  toggleHidden(nodes.articlePreview, true);
  toggleHidden(nodes.resultSection, true);
  nodes.copyFeedback.textContent = "";
  toggleHidden(nodes.copyFeedback, true);
}

function clearAllErrors() {
  document.querySelectorAll(".error").forEach((node) => {
    node.textContent = "";
  });
}

function clearError(field) {
  const node = document.querySelector(`[data-error="${field}"]`);
  if (node) {
    node.textContent = "";
  }
}

function setError(field, message) {
  const node = document.querySelector(`[data-error="${field}"]`);
  if (node) {
    node.textContent = message;
  }
}

function hideGeneralError() {
  nodes.generalError.textContent = "";
  toggleHidden(nodes.generalError, true);
}

function showGeneralError(message) {
  nodes.generalError.textContent = message;
  toggleHidden(nodes.generalError, false);
}

function hideCoherenceWarning() {
  nodes.coherenceWarning.textContent = "";
  toggleHidden(nodes.coherenceWarning, true);
}

function showCoherenceWarning(message) {
  nodes.coherenceWarning.textContent = message;
  toggleHidden(nodes.coherenceWarning, false);
}

function showNotice(message) {
  nodes.extractNotice.textContent = message;
  toggleHidden(nodes.extractNotice, false);
}

function evaluateAndShowCoherenceWarning(result) {
  const sourceText = [
    state.eventDescription,
    state.articlePreview?.title,
    state.articlePreview?.summary,
    state.articlePreview?.content,
    result.currentEventTitle,
    result.currentEventSummary
  ]
    .filter(Boolean)
    .join(" ");

  const generatedText = [
    result.title,
    result.subtitle,
    result.essentialQuestion,
    result.whyThisTopicMatters,
    ...(result.learningObjectives || []),
    ...(result.sequence || []).map((block) => `${block.purpose} ${block.studentAction}`),
    ...(result.studentMaterial?.workbookPages || []).flatMap((page) => [
      page.pageTitle,
      ...(page.studentInstructions || []),
      ...(page.activities || []).flatMap((a) => [a.taskTitle, a.statement, ...(a.steps || [])])
    ])
  ]
    .filter(Boolean)
    .join(" ");

  const sourceTokens = tokenizeForCoherence(sourceText);
  const generatedTokens = tokenizeForCoherence(generatedText);

  if (sourceTokens.length < 6 || generatedTokens.length < 20) {
    return;
  }

  const sourceSet = new Set(sourceTokens);
  const generatedSet = new Set(generatedTokens);
  let shared = 0;
  generatedSet.forEach((token) => {
    if (sourceSet.has(token)) shared += 1;
  });

  const overlapRatio = shared / Math.max(1, Math.min(sourceSet.size, generatedSet.size));

  if (overlapRatio < 0.08) {
    showCoherenceWarning(
      "Aviso de coherencia: la propuesta puede tener baja relación con la noticia o evento base. Revisa la pregunta esencial, las tareas del alumnado y el producto final antes de usarla."
    );
  }
}

function tokenizeForCoherence(text) {
  const stopwords = new Set([
    "de","la","el","y","en","que","a","los","las","un","una","por","para","con","del","al","se","su","sus","como",
    "más","menos","sobre","sin","o","u","es","son","ser","ha","han","lo","le","les","ya","muy","esto","esta","este",
    "estas","estos","esa","ese","esas","esos","qué","porque","donde","cuando","cómo","cual","cuales","quien","quienes"
  ]);

  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !stopwords.has(token));
}

function extractRequestedConcepts(text) {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) {
    return [];
  }

  const candidates = [];
  const quotedMatches = raw.match(/["“”'«»]([^"“”'«»]{3,80})["“”'«»]/g) || [];
  quotedMatches.forEach((match) => {
    candidates.push(match.replace(/["“”'«»]/g, "").trim());
  });

  const triggerMatches = Array.from(
    raw.matchAll(
      /\b(?:quiero(?: que)?(?: trabajar| reforzar| practicar)?|necesito|trabajar|reforzar|practicar|abordar|enfocar|centrar|profundizar|priorizar)\b[^.:\n]{0,18}\b(?:en|sobre|con)\s+([^.;:\n]{3,90})/gi
    )
  );
  triggerMatches.forEach((match) => {
    const chunk = (match[1] || "").trim();
    splitConceptChunk(chunk).forEach((item) => candidates.push(item));
  });

  const explicitListMatch = raw.match(/\bconceptos?\s*(?:clave|obligatorios?)?\s*:\s*([^.\n]{3,160})/i);
  if (explicitListMatch?.[1]) {
    splitConceptChunk(explicitListMatch[1]).forEach((item) => candidates.push(item));
  }

  return Array.from(
    new Set(
      candidates
        .map(cleanConceptCandidate)
        .filter((item) => item.length >= 3 && item.length <= 60)
        .filter((item) => !isGenericConceptNoise(item))
    )
  );
}

function splitConceptChunk(text) {
  return String(text || "")
    .split(/,|;|\by\b|\be\b|\bo\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanConceptCandidate(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(el|la|los|las|un|una)\s+/i, "")
    .replace(/\b(?:de la noticia|del articulo|del artículo|de actualidad)\b/gi, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericConceptNoise(text) {
  const noise = new Set([
    "actividad",
    "actividades",
    "noticia",
    "articulo",
    "actualidad",
    "alumnado",
    "aula",
    "propuesta",
    "secuencia",
    "tema"
  ]);
  return noise.has(text);
}

function extractGeoEntities(text) {
  const value = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const geoLexicon = [
    "iran",
    "irak",
    "gaza",
    "israel",
    "ucrania",
    "rusia",
    "china",
    "taiwan",
    "siria",
    "libano",
    "estados unidos",
    "eeuu",
    "mexico",
    "espana",
    "argentina",
    "colombia",
    "peru",
    "chile",
    "ecuador",
    "honduras",
    "uruguay",
    "europa",
    "asia",
    "africa"
  ];

  return geoLexicon.filter((term) => value.includes(term));
}

function buildSupportAssetIndex(result) {
  const visualAssets = result?.studentMaterial?.visualAssets || [];
  const labels = new Set();
  const corpusParts = [];

  visualAssets.forEach((asset, idx) => {
    const title = String(asset.title || "").trim();
    const instruction = String(asset.instruction || "").trim();
    const alias = asset.assetType === "table" ? `tabla ${idx + 1}` : `imagen ${idx + 1}`;
    if (title) labels.add(normalizeSupportLabel(title));
    labels.add(normalizeSupportLabel(alias));
    if (instruction) corpusParts.push(instruction);
    if (asset.assetType === "table") {
      corpusParts.push(...(asset.tableColumns || []));
      (asset.tableRows || []).forEach((row) => corpusParts.push(...(row || [])));
    } else {
      corpusParts.push(String(asset.imagePrompt || ""));
    }
  });

  corpusParts.push(...(result.outputSpecificAssets || []));
  const corpus = normalizeSupportLabel(corpusParts.filter(Boolean).join(" "));
  const corpusTokens = new Set(tokenizeForCoherence(corpus));
  return { labels, corpus, corpusTokens };
}

function normalizeSupportLabel(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSupportMaterialBacked(support, index) {
  const normalized = normalizeSupportLabel(support);
  if (!normalized) return true;
  if (index.labels.has(normalized)) return true;
  if (index.corpus.includes(normalized)) return true;

  const supportTokens = tokenizeForCoherence(normalized);
  if (supportTokens.length === 0) return true;
  const overlap = supportTokens.filter((token) => index.corpusTokens.has(token)).length;
  return overlap >= Math.min(2, supportTokens.length);
}

function isNoSupportMaterial(value) {
  const normalized = normalizeSupportLabel(value);
  return (
    normalized === "no aplica" ||
    normalized === "ninguno" ||
    normalized === "sin material" ||
    normalized === "no requiere"
  );
}

function isInherentClassroomMaterial(value) {
  const normalized = normalizeSupportLabel(value);
  const known = [
    "cuaderno",
    "lapiz",
    "lápiz",
    "boligrafo",
    "bolígrafo",
    "goma",
    "regla",
    "hoja",
    "folios",
    "rotulador",
    "pizarra",
    "calculadora",
    "colores",
    "tijeras",
    "pegamento"
  ].map((item) => normalizeSupportLabel(item));
  return known.some((item) => normalized === item || normalized.includes(`${item} `) || normalized.includes(` ${item}`));
}

function hideNotice() {
  nodes.extractNotice.textContent = "";
  toggleHidden(nodes.extractNotice, true);
}

function toggleHidden(node, hidden) {
  if (hidden) {
    node.classList.add("hidden");
  } else {
    node.classList.remove("hidden");
  }
}

function isValidUrl(url) {
  try {
    const value = new URL(url);
    return value.protocol === "http:" || value.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
