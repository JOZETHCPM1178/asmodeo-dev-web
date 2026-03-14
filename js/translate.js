// js/translate.js — Auto-traducción al publicar usando API de Claude

async function traducirPost(title, description) {
  try {
    const prompt = `Translate this app post to English and Portuguese. Return ONLY valid JSON, no explanation.

Title: ${title}
Description: ${description}

Return exactly this format:
{"title_en":"...","title_pt":"...","desc_en":"...","desc_pt":"..."}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    // Strip any markdown fences just in case
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    console.warn('Traducción falló, guardando solo español:', e.message);
    return null;
  }
}

window.traducirPost = traducirPost;
