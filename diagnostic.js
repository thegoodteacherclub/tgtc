(() => {
  const app = document.querySelector("[data-diagnostic-app]");

  if (!app) {
    return;
  }

  // Orden estable de dimensiones para desempates en fortalezas y áreas de mejora.
  const DIMENSIONS = [
    { key: "clarity", label: "objetivo y claridad", questions: [1, 5] },
    { key: "sequence", label: "secuencia", questions: [2, 9] },
    { key: "scaffolding", label: "andamiaje", questions: [3, 6] },
    { key: "cognitive", label: "activación cognitiva", questions: [7, 10] },
    { key: "material", label: "diseño del material", questions: [4, 8] }
  ];

  // Banco de preguntas y puntuaciones internas del diagnóstico.
  const QUESTIONS = [
    {
      id: 1,
      dimension: "clarity",
      text: "Cuando planteas una actividad, normalmente el alumnado entiende con claridad qué tiene que aprender?",
      options: [
        { id: "A", text: "Entiende lo que tiene que hacer, aunque no siempre el para qué", score: 3 },
        { id: "B", text: "Sí, el propósito suele quedar bastante claro", score: 4 },
        { id: "C", text: "Depende mucho de cómo lo explique en ese momento", score: 2 },
        { id: "D", text: "A menudo empiezan sin tenerlo del todo claro", score: 1 }
      ]
    },
    {
      id: 2,
      dimension: "sequence",
      text: "Cómo suele estar organizada la actividad que llevas al aula?",
      options: [
        { id: "A", text: "Tiene un orden bastante claro, aunque a veces mejorable", score: 3 },
        { id: "B", text: "Va por partes y cada paso prepara el siguiente", score: 4 },
        { id: "C", text: "Tiene varias tareas, pero no siempre una progresión real", score: 2 },
        { id: "D", text: "Suelo construirla más por acumulación que por secuencia", score: 1 }
      ]
    },
    {
      id: 3,
      dimension: "scaffolding",
      text: "Antes de pedir al alumnado que trabaje de forma autónoma, qué suele pasar?",
      options: [
        { id: "A", text: "Hacemos primero una parte guiada o con ejemplo", score: 4 },
        { id: "B", text: "Explico lo principal y luego ya pasan a hacerlo", score: 3 },
        { id: "C", text: "Les dejo empezar y voy resolviendo dudas", score: 1 },
        { id: "D", text: "Confío en que el propio material ya les oriente bastante", score: 2 }
      ]
    },
    {
      id: 4,
      dimension: "material",
      text: "Cuando revisas tus materiales, qué sensación te dejan más a menudo?",
      options: [
        { id: "A", text: "Son utilizables, pero podrían estar mejor pensados", score: 3 },
        { id: "B", text: "Funcionan bien y suelen resultar claros", score: 4 },
        { id: "C", text: "Hay bastante información y a veces cuestan de seguir", score: 2 },
        { id: "D", text: "Me doy cuenta de que dependen demasiado de mi explicación oral", score: 1 }
      ]
    },
    {
      id: 5,
      dimension: "clarity",
      text: "Tus instrucciones suelen ser…",
      options: [
        { id: "A", text: "Claras en general, aunque a veces algo largas", score: 3 },
        { id: "B", text: "Breves, directas y fáciles de interpretar", score: 4 },
        { id: "C", text: "Más claras cuando las explico que cuando se leen", score: 1 },
        { id: "D", text: "Correctas, pero repartidas entre varios sitios", score: 2 }
      ]
    },
    {
      id: 6,
      dimension: "scaffolding",
      text: "Cuando el alumnado se pone a trabajar, qué ocurre más a menudo?",
      options: [
        { id: "A", text: "Arranca razonablemente bien, con alguna duda puntual", score: 3 },
        { id: "B", text: "Avanza con bastante autonomía", score: 4 },
        { id: "C", text: "Necesita bastante acompañamiento para no perderse", score: 2 },
        { id: "D", text: "Tengo que intervenir mucho para reconducir la tarea", score: 1 }
      ]
    },
    {
      id: 7,
      dimension: "cognitive",
      text: "Qué peso tiene el pensamiento real del alumnado en tus actividades?",
      options: [
        { id: "A", text: "Suele haber algo de aplicación o reflexión", score: 3 },
        { id: "B", text: "Tienen que explicar, relacionar, decidir o construir algo con sentido", score: 4 },
        { id: "C", text: "A veces predomina más completar que pensar", score: 2 },
        { id: "D", text: "Depende mucho del grupo y del día", score: 1 }
      ]
    },
    {
      id: 8,
      dimension: "material",
      text: "Visualmente, tus materiales suelen ser…",
      options: [
        { id: "A", text: "Claros y bastante limpios", score: 4 },
        { id: "B", text: "Correctos, aunque algo cargados en algunas partes", score: 3 },
        { id: "C", text: "Funcionales, pero con bastante texto o densidad", score: 2 },
        { id: "D", text: "Más útiles por lo que hago con ellos que por cómo están diseñados", score: 1 }
      ]
    },
    {
      id: 9,
      dimension: "sequence",
      text: "Al terminar una actividad, normalmente…",
      options: [
        { id: "A", text: "Hay alguna revisión o cierre breve", score: 3 },
        { id: "B", text: "Se conecta con una aplicación, síntesis o comprobación final", score: 4 },
        { id: "C", text: "Se termina cuando ya han acabado la tarea", score: 2 },
        { id: "D", text: "Muchas veces el cierre queda un poco atropellado", score: 1 }
      ]
    },
    {
      id: 10,
      dimension: "cognitive",
      text: "Si piensas en cómo diseñas lo que llevas al aula, cuál frase te representa más?",
      options: [
        { id: "A", text: "Tengo una base bastante clara, pero quiero refinarla", score: 4 },
        { id: "B", text: "Sé que podría mejorar bastante la estructura de mis materiales", score: 2 },
        { id: "C", text: "Muchas veces adapto lo que tengo y voy ajustando sobre la marcha", score: 1 },
        { id: "D", text: "No me faltan ganas; me falta un sistema claro para diseñar mejor", score: 3 }
      ]
    }
  ];

  const PROFILES = [
    {
      min: 33,
      max: 40,
      title: "Base sólida",
      summary: "Tienes una base bastante buena de diseño. Tu mejora no pasa por hacer más, sino por afinar mejor secuencia, exigencia cognitiva y calidad del material."
    },
    {
      min: 25,
      max: 32,
      title: "Materiales correctos, pero mejorables",
      summary: "Tus materiales probablemente funcionan, pero todavía dependen demasiado de tu intervención o no siempre convierten la actividad en una experiencia bien diseñada."
    },
    {
      min: 17,
      max: 24,
      title: "Diseño funcional, pero débil",
      summary: "Aquí suele haber objetivos poco concretos, secuencia floja, apoyos insuficientes o materiales que añaden fricción. Hay margen claro de mejora."
    },
    {
      min: 10,
      max: 16,
      title: "Mucha improvisación, poco sistema",
      summary: "Seguramente estás sosteniendo la clase con esfuerzo, pero sin una estructura de diseño suficientemente sólida. No necesitas más recursos. Necesitas un mejor marco de trabajo."
    }
  ];

  const state = {
    index: 0,
    answers: {},
    result: null
  };

  const progressText = app.querySelector("[data-progress-text]");
  const progressFill = app.querySelector("[data-progress-fill]");
  const questionDimension = app.querySelector("[data-question-dimension]");
  const questionText = app.querySelector("[data-question-text]");
  const questionOptions = app.querySelector("[data-question-options]");
  const questionAlert = app.querySelector("[data-question-alert]");
  const prevButton = app.querySelector('[data-action="prev"]');
  const nextButton = app.querySelector('[data-action="next"]');
  const quizPanel = app.querySelector("[data-diagnostic-quiz]");
  const resultPanel = app.querySelector("[data-diagnostic-result]");
  const resultProfile = app.querySelector("[data-result-profile]");
  const resultSummary = app.querySelector("[data-result-summary]");
  const resultStrength = app.querySelector("[data-result-strength]");
  const resultImprovement = app.querySelector("[data-result-improvement]");
  const emailForm = app.querySelector("[data-diagnostic-email-form]");
  const emailAlert = app.querySelector("[data-email-alert]");

  function getDimensionLabel(key) {
    return DIMENSIONS.find((dimension) => dimension.key === key)?.label ?? "";
  }

  function getCurrentQuestion() {
    return QUESTIONS[state.index];
  }

  function getSelectedOption(questionId) {
    return state.answers[questionId] ?? null;
  }

  function renderQuestion() {
    const question = getCurrentQuestion();
    const selected = getSelectedOption(question.id);
    const step = state.index + 1;
    const progress = (step / QUESTIONS.length) * 100;

    progressText.textContent = `Pregunta ${step} de ${QUESTIONS.length}`;
    progressFill.style.width = `${progress}%`;
    questionDimension.textContent = getDimensionLabel(question.dimension);
    questionText.textContent = question.text;
    questionOptions.innerHTML = question.options.map((option) => {
      const inputId = `diagnostic-q${question.id}-${option.id}`;
      const checked = selected?.id === option.id ? "checked" : "";

      return `
        <div class="diagnostic-option">
          <input id="${inputId}" type="radio" name="diagnostic-q${question.id}" value="${option.id}" ${checked}>
          <label for="${inputId}">${option.id}) ${option.text}</label>
        </div>
      `;
    }).join("");

    prevButton.hidden = step === 1;
    nextButton.textContent = step === QUESTIONS.length ? "Ver mi diagnóstico" : "Siguiente";
    clearAlert(questionAlert);

    questionOptions.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", () => {
        const option = question.options.find((item) => item.id === input.value);
        state.answers[question.id] = option;
        clearAlert(questionAlert);
      });
    });
  }

  function clearAlert(element) {
    element.classList.remove("is-success");
    element.hidden = true;
    element.textContent = "";
  }

  function showAlert(element, message) {
    element.hidden = false;
    element.textContent = message;
  }

  function validateCurrentQuestion() {
    const question = getCurrentQuestion();

    if (!state.answers[question.id]) {
      showAlert(questionAlert, "Selecciona una opción para poder continuar.");
      return false;
    }

    clearAlert(questionAlert);
    return true;
  }

  function getDimensionScores() {
    return DIMENSIONS.reduce((scores, dimension) => {
      scores[dimension.key] = dimension.questions.reduce((sum, questionId) => {
        const answer = state.answers[questionId];
        return sum + (answer?.score ?? 0);
      }, 0);
      return scores;
    }, {});
  }

  function getOrderedDimensionByScore(scores, direction) {
    return DIMENSIONS.reduce((selected, dimension) => {
      if (!selected) {
        return dimension;
      }

      const selectedScore = scores[selected.key];
      const currentScore = scores[dimension.key];

      if (direction === "max" && currentScore > selectedScore) {
        return dimension;
      }

      if (direction === "min" && currentScore < selectedScore) {
        return dimension;
      }

      return selected;
    }, null);
  }

  function getProfile(totalScore) {
    return PROFILES.find((profile) => totalScore >= profile.min && totalScore <= profile.max);
  }

  function buildResult() {
    // Calculamos total, perfil y extremos por dimensión sin depender de ningún backend.
    const dimensionScores = getDimensionScores();
    const totalScore = QUESTIONS.reduce((sum, question) => sum + state.answers[question.id].score, 0);
    const strength = getOrderedDimensionByScore(dimensionScores, "max");
    const improvement = getOrderedDimensionByScore(dimensionScores, "min");
    const profile = getProfile(totalScore);

    return {
      totalScore,
      profile,
      strength,
      improvement,
      dimensionScores
    };
  }

  function populateHiddenFields(result) {
    const fields = {
      score_total: String(result.totalScore),
      profile: result.profile.title,
      strength: result.strength.label,
      improvement_area: result.improvement.label,
      dim_clarity: String(result.dimensionScores.clarity),
      dim_sequence: String(result.dimensionScores.sequence),
      dim_scaffolding: String(result.dimensionScores.scaffolding),
      dim_cognitive: String(result.dimensionScores.cognitive),
      dim_material: String(result.dimensionScores.material),
      submitted_at: new Date().toISOString(),
      page_source: window.location.pathname || window.location.href
    };

    QUESTIONS.forEach((question) => {
      fields[`q${question.id}`] = state.answers[question.id]?.id ?? "";
    });

    Object.entries(fields).forEach(([name, value]) => {
      const field = emailForm.elements.namedItem(name);
      if (field) {
        field.value = value;
      }
    });
  }

  function showResult() {
    state.result = buildResult();
    resultProfile.textContent = state.result.profile.title;
    resultSummary.textContent = state.result.profile.summary;
    resultStrength.textContent = state.result.strength.label;
    resultImprovement.textContent = state.result.improvement.label;
    resultPanel.hidden = false;
    emailForm.hidden = false;
    emailForm.reset();
    clearAlert(emailAlert);
    populateHiddenFields(state.result);
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleNext() {
    if (!validateCurrentQuestion()) {
      return;
    }

    if (state.index === QUESTIONS.length - 1) {
      showResult();
      return;
    }

    state.index += 1;
    renderQuestion();
  }

  function handlePrevious() {
    if (state.index === 0) {
      return;
    }

    state.index -= 1;
    renderQuestion();
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();

    const emailInput = emailForm.elements.namedItem("email");
    const submitButton = emailForm.querySelector('button[type="submit"]');

    if (!(emailInput instanceof HTMLInputElement)) {
      return;
    }

    if (!emailInput.value.trim()) {
      showAlert(emailAlert, "Escribe tu correo para poder enviarte el diagnóstico ampliado.");
      emailInput.focus();
      return;
    }

    if (!emailInput.checkValidity()) {
      showAlert(emailAlert, "Introduce un correo electrónico válido.");
      emailInput.focus();
      return;
    }

    if (!state.result) {
      showAlert(emailAlert, "Primero necesitamos calcular tu diagnóstico.");
      return;
    }

    populateHiddenFields(state.result);
    clearAlert(emailAlert);
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    try {
      const response = await fetch(emailForm.action, {
        method: emailForm.method,
        body: new FormData(emailForm),
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar el formulario.");
      }

      showAlert(emailAlert, "Diagnóstico enviado. Te escribiremos con la ampliación y las recomendaciones prácticas.");
      emailAlert.classList.add("is-success");
      submitButton.textContent = "Enviado";
    } catch (error) {
      emailAlert.classList.remove("is-success");
      showAlert(emailAlert, "No se ha podido enviar el diagnóstico ahora mismo. Inténtalo de nuevo en unos minutos.");
      submitButton.disabled = false;
      submitButton.textContent = "Recibir diagnóstico ampliado";
      return;
    }

    submitButton.disabled = false;
    submitButton.textContent = "Recibir diagnóstico ampliado";
    emailForm.reset();
    populateHiddenFields(state.result);
  }

  prevButton.addEventListener("click", handlePrevious);
  nextButton.addEventListener("click", handleNext);
  emailForm.addEventListener("submit", handleEmailSubmit);

  renderQuestion();
})();
