// js/ai.js — Google Gemini (gratis, 60 req/min)

let _aiOpen = false;
let _aiMsgs = [{ role: 'a', text: '¡Hola! Soy el asistente de ASMODEO DEV. ¿En qué puedo ayudarte? 😊' }];

function toggleAI() {
  _aiOpen = !_aiOpen;
  const win = document.getElementById('ai-win');
  const fab = document.getElementById('ai-fab');
  win.style.display = _aiOpen ? 'flex' : 'none';
  fab.textContent = _aiOpen ? '✕' : '🤖';
  if (_aiOpen) { win.style.flexDirection = 'column'; renderAIChat(); }
}

function renderAIChat() {
  const win = document.getElementById('ai-win');
  win.innerHTML = `
    <div class="ai-head">
      <div class="ai-head-l">
        <span class="ai-ico">✨</span>
        <div><div class="ai-name">Asistente ASMODEO</div><div class="ai-status">● Powered by Gemini</div></div>
      </div>
      <button style="background:none;border:none;color:var(--t2);cursor:pointer;font-size:.9rem" onclick="toggleAI()">✕</button>
    </div>
    <div class="ai-msgs" id="ai-msgs">
      ${_aiMsgs.map(m => `
        <div class="ai-msg ${m.role}">
          ${m.role === 'a' ? '<span style="font-size:1.1rem">✨</span>' : ''}
          <div class="ai-bubble">${m.text}</div>
        </div>`).join('')}
    </div>
    <div class="ai-inp-row">
      <textarea class="ai-inp" id="ai-input" placeholder="Escribe tu pregunta..." rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAI()}"></textarea>
      <button class="ai-send" id="ai-send-btn" onclick="sendAI()">➤</button>
    </div>`;
  const msgs = document.getElementById('ai-msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function sendAI() {
  const inp = document.getElementById('ai-input');
  const text = inp?.value?.trim();
  if (!text) return;

  const btn = document.getElementById('ai-send-btn');
  if (btn) btn.disabled = true;
  inp.value = '';
  inp.disabled = true;

  _aiMsgs.push({ role: 'u', text });

  const msgs = document.getElementById('ai-msgs');
  if (msgs) {
    msgs.innerHTML += `
      <div class="ai-msg u"><div class="ai-bubble">${text}</div></div>
      <div class="ai-msg a" id="typing-ind">
        <span style="font-size:1.1rem">✨</span>
        <div class="ai-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }

  try {
    const historial = _aiMsgs.slice(0, -1).map(m => ({
      role: m.role === 'u' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${window.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'Eres el asistente oficial de ASMODEO DEV, plataforma de APKs Mod, Juegos Mod, Scripts y Tutoriales. Responde siempre en español, de forma amigable y concisa.' }]
          },
          contents: [
            ...historial,
            { role: 'user', parts: [{ text }] }
          ],
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
        })
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu pregunta.';
    _aiMsgs.push({ role: 'a', text: reply });
    document.getElementById('typing-ind')?.remove();
    if (msgs) {
      msgs.innerHTML += `<div class="ai-msg a"><span style="font-size:1.1rem">✨</span><div class="ai-bubble">${reply}</div></div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }
  } catch(e) {
    const reply = e.message?.includes('API_KEY') || e.message?.includes('key')
      ? '❌ API Key inválida. Verifica tu key de Gemini en config.js'
      : 'Error de conexión. Intenta de nuevo.';
    _aiMsgs.push({ role: 'a', text: reply });
    document.getElementById('typing-ind')?.remove();
    if (msgs) {
      msgs.innerHTML += `<div class="ai-msg a"><span style="font-size:1.1rem">✨</span><div class="ai-bubble">${reply}</div></div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }
  } finally {
    if (btn) btn.disabled = false;
    if (inp) inp.disabled = false;
  }
}
