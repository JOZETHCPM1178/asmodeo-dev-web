// js/ai.js — Google Gemini (CORREGIDO y funcional)

// ⚠️ IMPORTANTE: Define tu API Key aquí (consíguela gratis en https://makersuite.google.com/app/apikey)
const GEMINI_API_KEY = 'AIzaSyDXfpFOzU4fRhojl-jN9keg1Vnh3qsJXDg'; // Reemplaza con tu key real

let _aiOpen = false;
let _aiMsgs = [{ role: 'model', text: '¡Hola! Soy el asistente de ASMODEO DEV. ¿En qué puedo ayudarte? 😊' }];

function toggleAI() {
  _aiOpen = !_aiOpen;
  const win = document.getElementById('ai-win');
  const fab = document.getElementById('ai-fab');
  
  if (!win || !fab) {
    console.error('No se encontraron elementos del chat');
    return;
  }
  
  win.style.display = _aiOpen ? 'flex' : 'none';
  fab.textContent = _aiOpen ? '✕' : '🤖';
  
  if (_aiOpen) { 
    win.style.flexDirection = 'column'; 
    renderAIChat(); 
  }
}

function renderAIChat() {
  const win = document.getElementById('ai-win');
  if (!win) return;
  
  win.innerHTML = `
    <div class="ai-head">
      <div class="ai-head-l">
        <span class="ai-ico">✨</span>
        <div>
          <div class="ai-name">Asistente ASMODEO</div>
          <div class="ai-status">● Powered by Gemini</div>
        </div>
      </div>
      <button style="background:none;border:none;color:var(--t2);cursor:pointer;font-size:.9rem" onclick="toggleAI()">✕</button>
    </div>
    <div class="ai-msgs" id="ai-msgs">
      ${_aiMsgs.map(m => {
        const role = m.role === 'model' ? 'a' : 'u';
        return `
          <div class="ai-msg ${role}">
            ${role === 'a' ? '<span style="font-size:1.1rem">✨</span>' : ''}
            <div class="ai-bubble">${m.text}</div>
          </div>`;
      }).join('')}
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

  // Agregar mensaje del usuario
  _aiMsgs.push({ role: 'user', text });

  const msgs = document.getElementById('ai-msgs');
  
  // Mostrar mensaje del usuario
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
    // Construir historial para Gemini
    const contents = [];
    
    // Agregar todos los mensajes anteriores
    for (let i = 0; i < _aiMsgs.length - 1; i++) {
      const m = _aiMsgs[i];
      // Solo enviar si no es el mensaje actual
      if (i < _aiMsgs.length - 1) {
        contents.push({
          role: m.role,
          parts: [{ text: m.text }]
        });
      }
    }
    
    // Agregar mensaje actual con contexto
    contents.push({
      role: 'user',
      parts: [{ 
        text: `[Contexto: Eres el asistente de ASMODEO DEV, una plataforma de APKs Mod, Juegos Mod, Scripts y Tutoriales. Responde en español de forma amigable y concisa. Máximo 2-3 oraciones.]\n\nUsuario: ${text}\n\nAsistente:` 
      }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error response:', data);
      throw new Error(data.error?.message || `HTTP ${res.status}`);
    }

    if (data.error) {
      throw new Error(data.error.message);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() 
      || 'No pude generar una respuesta. Intenta de nuevo.';

    // Agregar respuesta de la IA
    _aiMsgs.push({ role: 'model', text: reply });
    
    // Remover indicador de typing
    document.getElementById('typing-ind')?.remove();

    // Mostrar respuesta
    if (msgs) {
      msgs.innerHTML += `<div class="ai-msg a"><span style="font-size:1.1rem">✨</span><div class="ai-bubble">${reply}</div></div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }

  } catch(e) {
    console.error('Gemini error:', e);
    
    let reply = '❌ Error de conexión. Intenta de nuevo.';
    
    if (e.message?.includes('API_KEY_INVALID')) {
      reply = '❌ API Key inválida. Ve a aistudio.google.com y obtén una key válida.';
    } else if (e.message?.includes('quota')) {
      reply = '⚠️ Límite de solicitudes alcanzado. Espera un minuto.';
    } else if (e.message?.includes('403')) {
      reply = '❌ Error 403: La API key no tiene permisos. Verifica que esté activada.';
    }

    _aiMsgs.push({ role: 'model', text: reply });
    
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