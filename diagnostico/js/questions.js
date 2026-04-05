export const BLOCKS = [
  {
    id: "A",
    title: "Bloque A. Contexto docente",
    subtitle: "Contextualizamos el informe para que la lectura sea útil.",
    questions: [
      { id: "a_etapa", label: "Etapa educativa", type: "select", required: true, options: ["Infantil", "Primaria", "ESO", "Bachillerato", "FP", "Universidad", "Adultos", "Otra"] },
      { id: "a_materia", label: "Materia o ámbito", type: "text", required: true },
      { id: "a_experiencia", label: "Años aproximados de experiencia", type: "select", required: true, options: ["0-2", "3-5", "6-10", "11-20", "21+"] },
      { id: "a_centro", label: "Tipo de centro", type: "select", required: true, options: ["Público", "Concertado", "Privado", "Otra situación"] },
      { id: "a_tiempo", label: "Tiempo real para rediseñar materiales", type: "select", required: true, options: ["Menos de 1h/semana", "1-2h/semana", "3-4h/semana", "5h o más"] },
      { id: "a_familiaridad", label: "Familiaridad con revisión/rediseño", type: "select", required: true, options: ["Muy baja", "Baja", "Media", "Alta"] }
    ]
  },
  {
    id: "B",
    title: "Bloque B. Material real de referencia",
    subtitle: "Anclamos el diagnóstico en una actividad concreta.",
    questions: [
      { id: "b_tipo", label: "Tipo de material o actividad", type: "text", required: true },
      { id: "b_curso", label: "Curso o nivel", type: "text", required: true },
      { id: "b_tema", label: "Tema o contenido", type: "text", required: true },
      { id: "b_cuando", label: "Cuándo lo usas normalmente", type: "text", required: true },
      { id: "b_objetivo", label: "Qué debería comprender o saber hacer mejor el alumnado", type: "textarea", required: true }
    ]
  },
  {
    id: "U",
    title: "Bloque U. Actividad real",
    subtitle: "Sube la actividad real para complementar el análisis con IA.",
    questions: [
      {
        id: "u_archivo",
        label: "Sube tu actividad (PDF, DOCX, TXT o imagen)",
        type: "file",
        required: true,
        accept: ".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
      },
      {
        id: "u_resumen_actividad",
        label: "Contexto breve de la actividad (qué pide y qué esperas que logren)",
        type: "textarea",
        required: true
      }
    ]
  },
  {
    id: "C",
    title: "Bloque C. Qué ya funciona",
    subtitle: "Reconocemos fortalezas percibidas con criterio.",
    questions: [
      {
        id: "c_fortalezas",
        label: "Selecciona lo que sueles sostener mejor",
        type: "multi",
        required: true,
        options: ["Claridad de propósito", "Instrucciones comprensibles", "Orden general", "Participación del alumnado", "Buenos apoyos", "Cierre aceptable", "Material visual razonablemente claro", "Adaptación de dificultad"]
      },
      { id: "c_comentario", label: "Comentario breve", type: "textarea", required: false }
    ]
  },
  {
    id: "D",
    title: "Bloque D. Dónde se atasca",
    subtitle: "Detectamos fricciones para priorizar mejor.",
    questions: [
      {
        id: "d_fricciones",
        label: "Selecciona los puntos más frecuentes",
        type: "multi",
        required: true,
        options: ["Objetivo poco definido", "Actividad empieza demasiado fuerte", "Demasiadas demandas a la vez", "Instrucciones insuficientes", "Falta ejemplo previo", "Secuencia poco clara", "Actividad completa pero comprensión débil", "Cierre flojo", "Soporte visual poco orientador", "Poca transferencia"]
      },
      { id: "d_comentario", label: "Qué te obliga a intervenir demasiado", type: "textarea", required: false }
    ]
  },
  {
    id: "E",
    title: "Bloque E. Cómo diseñas hoy",
    subtitle: "Leemos patrón de trabajo, no solo síntomas.",
    questions: [
      { id: "e_primero", label: "Qué sueles definir primero", type: "text", required: true },
      { id: "e_origen", label: "Partes del objetivo o del material existente", type: "select", required: true, options: ["Normalmente del objetivo", "Normalmente del material existente", "Depende del tema", "No tengo patrón claro"] },
      { id: "e_secuencia", label: "Cuándo piensas en la secuencia", type: "select", required: true, options: ["Antes de crear material", "Mientras creo material", "Al final", "No siempre la planifico"] },
      { id: "e_apoyos", label: "Cuándo piensas en apoyos", type: "select", required: true, options: ["Desde el inicio", "A mitad de diseño", "Solo si aparecen bloqueos", "Casi al final"] },
      { id: "e_evidencia", label: "Cómo compruebas comprensión", type: "textarea", required: true },
      { id: "e_rehace", label: "Qué rehaces menos de lo que deberías", type: "textarea", required: false }
    ]
  },
  {
    id: "F",
    title: "Bloque F. Revisión de calidad didáctica",
    subtitle: "Valoramos dimensiones clave con una escala simple.",
    questions: [
      { id: "f_proposito", label: "El alumnado puede entender qué se espera que aprenda", type: "scale", required: true, dimension: "Propósito" },
      { id: "f_secuencia", label: "La actividad avanza paso a paso sin sobrecargar", type: "scale", required: true, dimension: "Secuencia" },
      { id: "f_apoyos", label: "Hay ejemplos, modelos o preguntas guía", type: "scale", required: true, dimension: "Apoyos" },
      { id: "f_cognitiva", label: "La tarea obliga a pensar, no solo completar", type: "scale", required: true, dimension: "Activación cognitiva" },
      { id: "f_material", label: "El material orienta de un vistazo", type: "scale", required: true, dimension: "Diseño del material" },
      { id: "f_autonomia", label: "La dificultad está graduada y favorece autonomía", type: "scale", required: true, dimension: "Autonomía del alumnado" },
      { id: "f_cierre", label: "Hay cierre que consolida y recoge evidencia", type: "scale", required: true, dimension: "Cierre y evaluación" },
      { id: "f_transferencia", label: "La tarea final tiene sentido con el objetivo", type: "scale", required: true, dimension: "Aplicación o transferencia" }
    ]
  },
  {
    id: "G",
    title: "Bloque G. Qué te limita ahora",
    subtitle: "Incluimos condicionantes reales de contexto.",
    questions: [
      {
        id: "g_limites",
        label: "Selecciona los límites que más pesan hoy",
        type: "multi",
        required: true,
        options: ["Poco tiempo", "Materiales heredados", "Heterogeneidad del grupo", "Presión por terminar contenido", "Dificultad para secuenciar", "Falta de criterio claro de revisión", "Falta de ejemplos", "Dependencia de materiales previos", "Poco margen para probar cambios", "Exceso de carga docente"]
      },
      { id: "g_comentario", label: "Comentario breve", type: "textarea", required: false }
    ]
  },
  {
    id: "H",
    title: "Bloque H. Prioridad de mejora",
    subtitle: "Definimos un foco de mejora con impacto cercano.",
    questions: [
      {
        id: "h_prioridad",
        label: "Qué cambio te daría más impacto en las próximas semanas",
        type: "single",
        required: true,
        options: ["Definir mejor el objetivo", "Ordenar mejor la secuencia", "Mejorar claridad e instrucciones", "Dar mejores apoyos", "Hacer pensar más al alumnado", "Rediseñar el material visual", "Cerrar mejor y recoger evidencias", "Adaptar mejor la actividad", "Dejar de improvisar y trabajar con un sistema"]
      }
    ]
  }
];

export const SCALE_OPTIONS = [
  { value: 1, label: "Intervención prioritaria" },
  { value: 2, label: "Necesita más estructura" },
  { value: 3, label: "Razonablemente resuelto" },
  { value: 4, label: "Base sólida" }
];
