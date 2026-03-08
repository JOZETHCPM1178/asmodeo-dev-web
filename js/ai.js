// js/ai.js

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
        <span class="ai-ico">🤖</span>
        <div><div class="ai-name">Asistente ASMODEO</div><div class="ai-status">● En línea</div></div>
      </div>
      <button style="background:none;border:none;color:var(--t2);cursor:pointer;font-size:.9rem" onclick="toggleAI()">✕</button>
    </div>
    <div class="ai-msgs" id="ai-msgs">
      ${_aiMsgs.map(m => `
        <div class="ai-msg ${m.role}">
          ${m.role === 'a' ? '<span style="font-size:1.1rem">🤖</span>' : ''}
          <div class="ai-bubble">${m.text}</div>
        </div>`).join('')}
    </div>
    <div class="ai-inp-row">
      <textarea class="ai-inp" id="ai-input" placeholder="Escribe tu pregunta..." rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAI()}"></textarea>
      <button class="ai-send" onclick="sendAI()">➤</button>
    </div>`;
  const msgs = document.getElementById('ai-msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function sendAI() {
  const inp = document.getElementById('ai-input');
  const text = inp?.value?.trim();
  if (!text) return;
  inp.value = '';
  _aiMsgs.push({ role: 'u', text });

  const msgs = document.getElementById('ai-msgs');
  if (msgs) {
    msgs.innerHTML += `
      <div class="ai-msg u"><div class="ai-bubble">${text}</div></div>
      <div class="ai-msg a" id="typing-ind"><span style="font-size:1.1rem">🤖</span>
        <div class="ai-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': window.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: 'Eres el asistente de ASMODEO DEV, plataforma de APKs Mod, Juegos Mod, Scripts y Tutoriales. Responde en español, de forma amigable y concisa. No ayudes con actividades ilegales.',
        messages: _aiMsgs.map(m => ({ role: m.role === 'u' ? 'user' : 'assistant', content: m.text }))
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || 'No pude procesar tu pregunta.';
    _aiMsgs.push({ role: 'a', text: reply });
    document.getElementById('typing-ind')?.remove();
    if (msgs) {
      msgs.innerHTML += `<div class="ai-msg a"><span style="font-size:1.1rem">🤖</span><div class="ai-bubble">${reply}</div></div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }
  } catch {
    const reply = 'Error de conexión. Intenta de nuevo.';
    _aiMsgs.push({ role: 'a', text: reply });
    document.getElementById('typing-ind')?.remove();
    if (msgs) {
      msgs.innerHTML += `<div class="ai-msg a"><span style="font-size:1.1rem">🤖</span><div class="ai-bubble">${reply}</div></div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }
  }
}
