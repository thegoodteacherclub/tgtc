const STORAGE_KEY = "tgtc-static-form-v1";
const API_PROXY_URL = "const API_PROXY_URL = "https://actividades.thegoodteacherclub.workers.dev";
";
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
  generateBtn: document.getElementById("generateBtn"),
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
  if (!validateForm()) {
    return;
  }

  setLoading(true);

  try {
    const result = await callOpenAI(buildPayload());
    validateOutput(result);
    lastResult = result;
    renderResult(result);
  } catch (error) {
    showGeneralError(
      (error && error.message) || "Ha ocurrido un problema al generar la actividad. Revisa la clave API y vuelve a intentarlo."
    );
  } finally {
    setLoading(false);
  }
}

function buildPayload() {
  return {
    stage: state.stage === "Otra etapa" ? state.stageOther.trim() : state.stage,
    age: Number(state.age),
    country: state.country === "Otros" ? state.countryOther.trim() : state.country,
    subject: state.subject === "Otra" ? state.subjectOther.trim() : state.subject,
    activityType: state.activityType,
    sessionEstimate: state.sessionEstimate.trim(),
    teacherNotes: state.teacherNotes.trim(),
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
- En "teacherGuide" incluye solo consulta docente (apoyos, decisiones metodológicas, criterios y justificación).
- En "outputSpecificAssets" no des sugerencias generales: escribe piezas completas de actividad (enunciados, consignas, preguntas, materiales y productos esperados).
- En "scaffolds" explica apoyos YA integrados en la propuesta (qué apoyo, dónde aparece y cómo gradúa).
- En "dimensionsSummary" justifica por qué lo que entregaste cumple cada dimensión, con evidencia concreta de tu propia propuesta.

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

Calidad obligatoria:
- Evita objetivos vagos y secuencias sin progresión.
- Incluye relevancia real de la noticia para el alumnado.
- Formula preguntas que hagan pensar.
- Incluye apoyos concretos y gradación.
- Asegura coherencia entre objetivo, tareas y evidencia final.
- Cuida claridad visual y textual de los materiales.
- Entrega un cuaderno del alumnado final y usable sin rediseño.
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
      required: ["studentTitle", "studentIntro", "workbookPages", "finalSubmissionInstruction"],
      properties: {
        studentTitle: { type: "string" },
        studentIntro: { type: "string" },
        finalSubmissionInstruction: { type: "string" },
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
  const response = await fetch(API_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tgtc_activity",
          strict: true,
          schema: JSON_SCHEMA
        }
      }
    })
  });

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
    nodes.tabContent.innerHTML = `
      <div class="block block-highlight">
        <h3>${escapeHtml(result.studentMaterial?.studentTitle || "Cuaderno del alumnado")}</h3>
        <p>${escapeHtml(result.studentMaterial?.studentIntro || "")}</p>
      </div>
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

function showNotice(message) {
  nodes.extractNotice.textContent = message;
  toggleHidden(nodes.extractNotice, false);
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
