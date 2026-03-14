// src/services/gemini.js
// ════════════════════════════════════════
//  GEMINI AI — Deshabilitado temporalmente
//  Se activa cuando se configure una key válida
// ════════════════════════════════════════

// IA deshabilitada — devuelve valores seguros sin llamar a la API
export async function generateAppDescription({ name, category }) {
  return ''  // El usuario escribe su propia descripción
}

export async function analyzePostSafety() {
  return { safe: true, score: 100, issues: [], reason: 'OK' }
}

export async function generateTags({ name, category }) {
  return [category, 'android', 'gratis', 'mod']
}

export async function detectDangerousLinks() {
  return { hasDangerousLinks: false, dangerousUrls: [] }
}
