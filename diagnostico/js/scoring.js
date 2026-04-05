const LEVELS = [
  { min: 3.5, key: "base sólida", meaning: "La dimensión está bien sostenida y puede afinarse con ajustes concretos." },
  { min: 2.75, key: "razonablemente resuelto", meaning: "Hay buena base, pero todavía hay margen de ajuste para aumentar impacto." },
  { min: 2, key: "necesita más estructura", meaning: "La dimensión funciona de forma irregular y requiere orden y consistencia." },
  { min: 0, key: "intervención prioritaria", meaning: "Ahora mismo limita la calidad didáctica y conviene intervenir primero." }
];

export function getLevelLabel(value) {
  return LEVELS.find((item) => value >= item.min)?.key || "necesita más estructura";
}

export function getLevelMeaning(value) {
  return LEVELS.find((item) => value >= item.min)?.meaning || "";
}

export function normalizeResult(raw) {
  const safe = raw || {};
  return {
    resumen: safe.resumen_texto || "",
    fortalezas: safe.fortalezas || [],
    frenos: safe.frenos || [],
    prioridades: safe.prioridades || [],
    primerPaso: safe.primer_paso || "",
    cierre: safe.cierre_tgtc || "",
    dimensiones: safe.dimensiones || {},
    analisisIA: safe.analisis_ia || null
  };
}
