function buildDiagnosticResult_(answers) {
  const dimensions = {
    "Propósito": scoreDimension_(answers, ["f_proposito"]),
    "Secuencia": scoreDimension_(answers, ["f_secuencia"]),
    "Apoyos": scoreDimension_(answers, ["f_apoyos"]),
    "Activación cognitiva": scoreDimension_(answers, ["f_cognitiva"]),
    "Diseño del material": scoreDimension_(answers, ["f_material"]),
    "Autonomía del alumnado": scoreDimension_(answers, ["f_autonomia"]),
    "Cierre y evaluación": scoreDimension_(answers, ["f_cierre"]),
    "Aplicación o transferencia": scoreDimension_(answers, ["f_transferencia"])
  };

  const ordered = Object.keys(dimensions).sort((a, b) => dimensions[a].score - dimensions[b].score);
  const weakTop = ordered.slice(0, 3);
  const strongTop = ordered.slice(-3).reverse();
  const selectedPriority = asString_(answers.h_prioridad);
  const fricciones = asArray_(answers.d_fricciones);
  const limites = asArray_(answers.g_limites);
  const fortalezasDeclaradas = asArray_(answers.c_fortalezas);

  return {
    resumen_texto: buildSummary_(dimensions, selectedPriority, fricciones),
    fortalezas: buildFortalezas_(strongTop, fortalezasDeclaradas),
    frenos: buildFrenos_(weakTop, fricciones, limites),
    dimensiones: buildDimensionDetails_(dimensions),
    prioridades: buildPrioridades_(weakTop, selectedPriority),
    primer_paso: buildPrimerPaso_(selectedPriority),
    cierre_tgtc: "En The Good Teacher Club trabajamos justo este enfoque: partir de una actividad real, ajustar objetivo, secuencia, apoyos y cierre con criterio, y comprobar mejora en la respuesta del alumnado."
  };
}

function scoreDimension_(answers, keys) {
  let total = 0;
  let count = 0;
  keys.forEach((key) => {
    const value = Number(answers[key] || 0);
    if (value > 0) {
      total += value;
      count += 1;
    }
  });
  const score = count === 0 ? 0 : total / count;
  return {
    score: Number(score.toFixed(2)),
    nivel: levelFromScore_(score)
  };
}

function levelFromScore_(score) {
  if (score >= 3.5) return "base sólida";
  if (score >= 2.75) return "razonablemente resuelto";
  if (score >= 2) return "necesita más estructura";
  return "intervención prioritaria";
}

function buildSummary_(dimensions, selectedPriority, fricciones) {
  const lowCount = Object.keys(dimensions).filter((name) => dimensions[name].score < 2.75).length;
  if (lowCount <= 2) {
    return "Tu actividad presenta una base consistente. El mayor impacto ahora no viene de rehacer todo, sino de afinar algunas piezas clave para que funcionen con más autonomía y más foco didáctico.";
  }
  if (selectedPriority) {
    return "La actividad tiene elementos valiosos, pero necesita más estructura en puntos concretos. Priorizar \"" + selectedPriority + "\" puede acelerar una mejora real sin aumentar carga innecesaria.";
  }
  if (fricciones.length > 0) {
    return "Se observan fricciones que limitan el resultado final de la actividad. Con una secuencia más clara y mejores apoyos, la comprensión del alumnado puede ganar consistencia.";
  }
  return "La actividad funciona de forma parcial. Hay margen claro para ganar calidad didáctica si el rediseño se centra primero en objetivo, secuencia y cierre.";
}

function buildFortalezas_(strongTop, declaradas) {
  const map = {
    "Propósito": "Sueles sostener con criterio la claridad del propósito.",
    "Secuencia": "Hay una base de orden en la secuencia de la actividad.",
    "Apoyos": "Incorporas apoyos que facilitan el avance del alumnado.",
    "Activación cognitiva": "Tu propuesta no se limita a completar; incluye exigencia cognitiva.",
    "Diseño del material": "El material aporta orientación y no solo contenido.",
    "Autonomía del alumnado": "La actividad favorece avance con autonomía razonable.",
    "Cierre y evaluación": "El cierre aporta consolidación y evidencia de comprensión.",
    "Aplicación o transferencia": "El tramo final conecta con aplicación significativa."
  };
  const items = strongTop.map((name) => map[name]);
  if (declaradas.length > 0) {
    items.push("También destacas de forma explícita: " + declaradas.slice(0, 2).join(", ").toLowerCase() + ".");
  }
  return items.slice(0, 4);
}

function buildFrenos_(weakTop, fricciones, limites) {
  const items = weakTop.map((name) => "Conviene reforzar \"" + name + "\" para reducir pérdida de comprensión y dependencia de intervención docente.");
  if (fricciones.length > 0) {
    items.push("Fricciones reportadas: " + fricciones.slice(0, 3).join(", ").toLowerCase() + ".");
  }
  if (limites.length > 0) {
    items.push("Condicionantes actuales: " + limites.slice(0, 2).join(", ").toLowerCase() + ".");
  }
  return items.slice(0, 4);
}

function buildDimensionDetails_(dimensions) {
  const importance = {
    "Propósito": "Sin propósito claro, el alumnado ejecuta tareas sin foco de aprendizaje.",
    "Secuencia": "La secuencia ordena carga cognitiva y evita bloqueos tempranos.",
    "Apoyos": "Los apoyos convierten una tarea difícil en una tarea abordable.",
    "Activación cognitiva": "Pensar mejor genera aprendizaje más profundo y durable.",
    "Diseño del material": "La forma del material puede facilitar o dificultar comprensión.",
    "Autonomía del alumnado": "Graduar dificultad reduce dependencia constante del docente.",
    "Cierre y evaluación": "Sin cierre, se pierde consolidación y evidencia de logro.",
    "Aplicación o transferencia": "La transferencia conecta actividad con sentido real del objetivo."
  };
  const ajustes = {
    "Propósito": "Reescribe el objetivo en una frase observable y compártela antes de empezar.",
    "Secuencia": "Divide la actividad en tramos cortos con una meta clara por tramo.",
    "Apoyos": "Incluye un ejemplo modelo y una pregunta guía por fase.",
    "Activación cognitiva": "Sustituye una tarea de completado por una tarea de explicación o decisión.",
    "Diseño del material": "Reduce densidad visual y destaca instrucciones clave en primer vistazo.",
    "Autonomía del alumnado": "Añade un paso intermedio antes del reto más exigente.",
    "Cierre y evaluación": "Cierra con una evidencia breve de comprensión, no solo con entrega.",
    "Aplicación o transferencia": "Alinea la tarea final con el objetivo y explicita el criterio de éxito."
  };
  const out = {};
  Object.keys(dimensions).forEach((name) => {
    out[name] = {
      score: dimensions[name].score,
      nivel: dimensions[name].nivel,
      importancia: importance[name],
      ajuste: ajustes[name]
    };
  });
  return out;
}

function buildPrioridades_(weakTop, selectedPriority) {
  const ordered = weakTop.map((name) => "Prioriza " + name + " en la próxima iteración de la actividad.");
  if (selectedPriority) {
    ordered.unshift("Tu foco declarado: " + selectedPriority + ".");
  }
  return ordered.slice(0, 3);
}

function buildPrimerPaso_(selectedPriority) {
  const base = "Empieza por una actividad real: reformula el objetivo, reordena la secuencia, mejora un apoyo clave y revisa el cierre antes de escalar cambios.";
  if (!selectedPriority) return base;
  return base + " En tu caso, centra la primera revisión en: " + selectedPriority + ".";
}

function asArray_(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") return [value];
  return [];
}

function asString_(value) {
  if (!value) return "";
  return String(value).trim();
}
