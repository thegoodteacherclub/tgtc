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
  { key: "student", label: "Material del alumnado" },
  { key: "sequence", label: "Secuencia en aula" },
  { key: "teacher", label: "Guía docente" },
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
  exportDocxBtn: document.getElementById("exportDocxBtn"),
  printBtn: document.getElementById("printBtn"),
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
  nodes.exportDocxBtn.addEventListener("click", exportResultAsDocx);
  nodes.printBtn.addEventListener("click", () => window.print());
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
    result = await enforceInternalConsistency(result, payload);
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
    eventDescription: state.eventDescription.trim(),
    eventUrl: state.eventUrl.trim(),
    articlePreview: state.articlePreview
  };
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
- Si se piden varios conceptos a la vez, incluye actividades que los combinen explícitamente en la misma tarea.

Regla crítica de imágenes:
- Si propones imágenes, deben ser coherentes con la noticia base y el contexto real.
- No inventes países, fronteras, actores geopolíticos o hechos no presentes en la base informativa.
- Si no hay suficiente certeza factual, usa visuales neutrales y no afirmaciones geopolíticas específicas.

Responde solo JSON válido.`;

  const user = `Contexto:
- Etapa: ${payload.stage}
- Edad: ${payload.age}
- País: ${payload.country}
- Asignatura: ${payload.subject}
- Tipo de propuesta: ${payload.activityType}
- Duración/sesiones: ${payload.sessionEstimate || "No indicada"}
- Indicaciones del docente: ${payload.teacherNotes || "No indicadas"}

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
  return fetch(API_PROXY_URL, {
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
  const response = await fetch(API_PROXY_URL, {
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
      )}\n\nJSON actual a corregir:\n${JSON.stringify(originalResult)}\n\nRegla: si se menciona un ejercicio/problema/tabla/imagen, ese recurso debe existir realmente en la salida. Si una actividad declara "material de apoyo incluido", ese material también debe existir realmente dentro del JSON final.`
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
    const pages = result.studentMaterial?.workbookPages || [];
    const visualAssets = result.studentMaterial?.visualAssets || [];
    nodes.tabContent.innerHTML = `
      <div class="block block-highlight">
        <h3>${escapeHtml(result.studentMaterial?.studentTitle || "Cuaderno del alumnado")}</h3>
        <p>${escapeHtml(result.studentMaterial?.studentIntro || "")}</p>
      </div>
      ${renderVisualAssetsHtml(visualAssets)}
      ${pages
        .map(
          (page, pageIndex) => `
        <article class="student-page">
          <header class="student-page-head">
            <span class="student-page-tag">Página ${pageIndex + 1}</span>
            <h4>${escapeHtml(page.pageTitle || "")}</h4>
          </header>
          <div class="student-box">
            <p class="student-box-title">Instrucciones para el alumnado</p>
            <ol>
              ${(page.studentInstructions || []).map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join("")}
            </ol>
          </div>
          ${(page.activities || [])
            .map(
              (activity, activityIndex) => `
            <div class="student-task">
              <p class="student-task-kicker">Actividad ${activityIndex + 1}</p>
              <h5>${escapeHtml(activity.taskTitle || "")}</h5>
              <p><strong>Consigna:</strong> ${escapeHtml(activity.statement || "")}</p>
              <p><strong>Pasos:</strong></p>
              <ol>${(activity.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
              <p><strong>Formato de respuesta esperado:</strong> ${escapeHtml(activity.expectedOutput || "")}</p>
              ${
                activity.supportMaterial
                  ? `<p><strong>Material de apoyo incluido:</strong> ${escapeHtml(activity.supportMaterial)}</p>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </article>
      `
        )
        .join("")}
      <div class="block block-highlight">
        <h4>Entrega final del alumnado</h4>
        <p>${escapeHtml(result.studentMaterial?.finalSubmissionInstruction || "")}</p>
      </div>
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
    nodes.tabContent.innerHTML = `
      <div class="block">
        <h3>Resumen de implementación docente</h3>
        <p>${escapeHtml(result.teacherGuide?.implementationSummary || result.teacherNotes || "")}</p>
      </div>
      <div class="block">
        <h3>Apoyos ya integrados en la propuesta</h3>
        <ul>${(result.teacherGuide?.supportsApplied || result.scaffolds || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <h3>Diferenciación y ajustes</h3>
        <ul>${(result.teacherGuide?.differentiation || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <h3>Diseño del material (maquetación)</h3>
        <ul>${(result.materialDesignGuidelines || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="block">
        <h3>Por qué funciona esta propuesta</h3>
        <p>${escapeHtml(result.teacherGuide?.whyDesignWorks || "")}</p>
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

async function exportResultAsDocx() {
  if (!lastResult) {
    showGeneralError("Primero genera una actividad para poder exportarla.");
    return;
  }

  if (!window.docx || !window.saveAs) {
    showGeneralError("No se ha podido cargar la librería de exportación .docx.");
    return;
  }

  try {
    const { Document, Packer, Paragraph, HeadingLevel, TextRun } = window.docx;
    const docChildren = [];

    docChildren.push(
      new Paragraph({ text: lastResult.title || "Actividad didáctica", heading: HeadingLevel.TITLE }),
      new Paragraph({ text: lastResult.subtitle || "", spacing: { after: 240 } }),
      new Paragraph({ text: `Tipo: ${lastResult.activityType || ""}` }),
      new Paragraph({ text: `Etapa: ${lastResult.stageLabel || ""}` }),
      new Paragraph({ text: `Edad: ${lastResult.age || ""}` }),
      new Paragraph({ text: `País: ${lastResult.country || ""}` }),
      new Paragraph({ text: `Asignatura: ${lastResult.subject || ""}`, spacing: { after: 220 } }),
      new Paragraph({ text: "CUADERNO DEL ALUMNADO", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: lastResult.studentMaterial?.studentTitle || "", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: lastResult.studentMaterial?.studentIntro || "", spacing: { after: 200 } })
    );

    const visualAssets = lastResult.studentMaterial?.visualAssets || [];
    if (visualAssets.length > 0) {
      docChildren.push(new Paragraph({ text: "Recursos visuales incluidos", heading: HeadingLevel.HEADING_2 }));
      visualAssets.forEach((asset) => {
        docChildren.push(
          new Paragraph({ text: asset.title || "", heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: asset.instruction || "" })
        );
        if (asset.assetType === "table") {
          const headers = (asset.tableColumns || []).join(" | ");
          docChildren.push(new Paragraph({ text: `Columnas: ${headers}` }));
          (asset.tableRows || []).forEach((row) => {
            docChildren.push(new Paragraph({ text: `- ${(row || []).join(" | ")}` }));
          });
        } else {
          docChildren.push(new Paragraph({ text: `Descripción visual: ${asset.imagePrompt || ""}` }));
        }
      });
    }

    (lastResult.studentMaterial?.workbookPages || []).forEach((page, pageIndex) => {
      docChildren.push(
        new Paragraph({ text: `Página ${pageIndex + 1}: ${page.pageTitle || ""}`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Instrucciones", heading: HeadingLevel.HEADING_3 })
      );

      (page.studentInstructions || []).forEach((instruction) => {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${instruction}` })],
            spacing: { after: 90 }
          })
        );
      });

      (page.activities || []).forEach((activity, idx) => {
        docChildren.push(
          new Paragraph({ text: `Actividad ${idx + 1}: ${activity.taskTitle || ""}`, heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: `Consigna: ${activity.statement || ""}` }),
          new Paragraph({ text: "Pasos:" })
        );
        (activity.steps || []).forEach((step) => {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: `- ${step}` })],
              spacing: { after: 80 }
            })
          );
        });
        docChildren.push(
          new Paragraph({ text: `Formato de respuesta esperado: ${activity.expectedOutput || ""}` }),
          new Paragraph({ text: `Material de apoyo: ${activity.supportMaterial || "No aplica"}`, spacing: { after: 150 } })
        );
      });
    });

    docChildren.push(
      new Paragraph({ text: "Entrega final del alumnado", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: lastResult.studentMaterial?.finalSubmissionInstruction || "", spacing: { after: 230 } }),
      new Paragraph({ text: "GUÍA DOCENTE DE CONSULTA", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "Resumen de implementación", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: lastResult.teacherGuide?.implementationSummary || "", spacing: { after: 140 } }),
      new Paragraph({ text: "Secuencia de aula", heading: HeadingLevel.HEADING_2 })
    );

    (lastResult.sequence || []).forEach((block) => {
      docChildren.push(
        new Paragraph({ text: block.phase || "", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: `Propósito: ${block.purpose || ""}` }),
        new Paragraph({ text: `Acción docente: ${block.teacherAction || ""}` }),
        new Paragraph({ text: `Acción del alumnado: ${block.studentAction || ""}` }),
        new Paragraph({ text: `Apoyo integrado: ${block.support || ""}` }),
        new Paragraph({ text: `Evidencia esperada: ${block.expectedEvidence || ""}`, spacing: { after: 160 } })
      );
    });

    docChildren.push(
      new Paragraph({ text: "Apoyos aplicados", heading: HeadingLevel.HEADING_2 }),
      ...((lastResult.teacherGuide?.supportsApplied || []).map(
        (item) =>
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 100 }
          })
      )),
      new Paragraph({ text: "Criterios de evaluación", heading: HeadingLevel.HEADING_2 }),
      ...((lastResult.teacherGuide?.evaluationCriteria || []).map(
        (item) =>
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 100 }
          })
      )),
      new Paragraph({ text: "Por qué esta propuesta es consistente con la metodología de The Good Teacher Club", heading: HeadingLevel.HEADING_1 })
    );
    (lastResult.dimensionsSummary || []).forEach((dimension) => {
      docChildren.push(
        new Paragraph({ text: dimension.title || "", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: dimension.explanation || "", spacing: { after: 150 } })
      );
    });

    const doc = new Document({
      sections: [{ children: docChildren }]
    });

    const blob = await Packer.toBlob(doc);
    const safeName = (lastResult.title || "actividad-tgtc").replace(/[\\/:*?"<>|]+/g, "").slice(0, 80);
    window.saveAs(blob, `${safeName}.docx`);
    nodes.copyFeedback.textContent = "Documento .docx exportado";
    toggleHidden(nodes.copyFeedback, false);
    setTimeout(() => toggleHidden(nodes.copyFeedback, true), 2200);
  } catch {
    showGeneralError("No se pudo exportar el .docx. Intenta de nuevo.");
  }
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
