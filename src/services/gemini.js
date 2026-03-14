// src/services/gemini.js
// ════════════════════════════════════════
//  GEMINI AI SERVICE — Moderación y generación de contenido
// ════════════════════════════════════════

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`

/**
 * Llama a la API de Gemini con un prompt
 */
async function callGemini(prompt, options = {}) {
  const { maxTokens = 500, temperature = 0.7 } = options

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Error en Gemini API')
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * Genera descripción automática para una app/mod
 * @param {Object} appInfo - { name, category, features[] }
 * @returns {Promise<string>} Descripción generada
 */
export async function generateAppDescription({ name, category, features = [] }) {
  const prompt = `Eres un experto en apps Android y mods. Genera una descripción corta y atractiva (máximo 3 oraciones) para una app/mod con estos datos:

Nombre: ${name}
Categoría: ${category}
Características: ${features.join(', ') || 'no especificadas'}

La descripción debe:
- Ser en español
- Ser entusiasta pero honesta
- Mencionar las características principales
- NO mencionar "mod" o "hack" directamente
- Ser apropiada para una audiencia general

Responde SOLO con la descripción, sin comillas ni explicaciones adicionales.`

  return callGemini(prompt, { maxTokens: 200, temperature: 0.8 })
}

/**
 * Analiza una publicación en busca de contenido sospechoso
 * @param {Object} post - { title, description, downloadUrl, imageUrl }
 * @returns {Promise<{safe: boolean, issues: string[], score: number}>}
 */
export async function analyzePostSafety({ title, description, downloadUrl = '', imageUrl = '' }) {
  const prompt = `Analiza esta publicación de una plataforma de apps/mods y determina si es segura.

Título: ${title}
Descripción: ${description}
URL de descarga: ${downloadUrl}
URL de imagen: ${imageUrl}

Evalúa:
1. ¿Contiene contenido para adultos o sexual?
2. ¿Contiene links maliciosos o sospechosos (phishing, malware)?
3. ¿Contiene spam o publicidad engañosa?
4. ¿Contiene información de odio o violencia?
5. ¿El link de descarga parece legítimo?

Responde EXACTAMENTE en este formato JSON (sin markdown):
{
  "safe": true/false,
  "score": 0-100,
  "issues": ["issue1", "issue2"],
  "reason": "explicación breve"
}`

  try {
    const text = await callGemini(prompt, { maxTokens: 300, temperature: 0.1 })
    // Limpiar respuesta y parsear JSON
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    // Si falla el análisis, asumir seguro para no bloquear contenido legítimo
    return { safe: true, score: 50, issues: [], reason: 'Análisis no disponible' }
  }
}

/**
 * Detecta links peligrosos en un texto
 * @param {string} text - Texto a analizar
 * @returns {Promise<{hasDangerousLinks: boolean, links: string[]}>}
 */
export async function detectDangerousLinks(text) {
  // Extraer URLs del texto
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = text.match(urlRegex) || []

  if (urls.length === 0) return { hasDangerousLinks: false, links: [] }

  const prompt = `Analiza estas URLs y determina si alguna es peligrosa (phishing, malware, contenido para adultos, spam):

URLs: ${urls.join('\n')}

Responde en JSON exacto (sin markdown):
{
  "hasDangerousLinks": true/false,
  "dangerousUrls": ["url1", "url2"]
}`

  try {
    const text = await callGemini(prompt, { maxTokens: 200, temperature: 0.1 })
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { hasDangerousLinks: false, dangerousUrls: [] }
  }
}

/**
 * Genera etiquetas/tags automáticos para una publicación
 */
export async function generateTags({ name, description, category }) {
  const prompt = `Genera 5 etiquetas cortas en español para esta app/mod:
Nombre: ${name}
Descripción: ${description}
Categoría: ${category}

Responde SOLO con las etiquetas separadas por comas, sin explicaciones. Ejemplo: android, gratis, mod, juegos, aventura`

  const result = await callGemini(prompt, { maxTokens: 100, temperature: 0.7 })
  return result.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 5)
}
