// js/ai.js — Chat Asmodeo TK con Gemini SDK oficial

import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// ════════════════════════════════════════
// PEGA AQUÍ TU API KEY DE GEMINI
// Consíguela gratis en: aistudio.google.com
// ════════════════════════════════════════
const API_KEY = "PEGA_AQUI_TU_API_KEY";

const SYSTEM_INSTRUCTION = `Eres Chat Asmodeo TK, el asistente oficial de ASMODEO DEV.
Tu objetivo es ayudar a la comunidad con APKs Mod, Juegos, Scripts y Tutoriales.
Eres técnico, servicial y tienes un estilo hacker elegante.
Responde siempre en español y menciona que el contenido es para fines educativos.`;

let chatSession = null;
let _aiOpen = false;
let _aiMsgs = [{ role: 'a', text: '¡Hola! Soy <b>Chat Asmodeo TK</b> ⚡<br>¿En qué puedo ayudarte hoy?' }];

// ── Inicializar sesión de Gemini ──
async function initGemini() {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION
    });
    chatSession = model.startChat({
      history: [],
      generationConfig: { maxOutputTokens: 800 }
    });
  } catch(e) {
    console.error('Error iniciando Gemini:', e);
  }
}

// ── Enviar mensaje a Gemini ──
async function sendMessageToGemini(userMessage) {
  if (!chatSession) await initGemini();
  try {
    const result = await chatSession.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch(e) {
    console.error('Error Gemini:', e);
    if (e.message?.includes('API_KEY') || e.message?.includes('invalid') || e.message?.includes('key')) {
      return '❌ API Key inválida. Verifica tu key de Gemini en ai.js';
    }
    return 'Lo siento, hubo un error. Intenta de nuevo.';
  }
}

// ── Toggle chat ──
window.toggleAI = function() {
  _aiOpen = !_aiOpen;
  const win = document.getElementById('ai-win');
  const fab = document.getElementById('ai-fab');
  win.style.display = _aiOpen ? 'flex' : 'none';
  fab.textContent = _aiOpen ? '✕' : '🤖';
  if (_aiOpen) {
    win.style.flexDirection = 'column';
    renderAIChat();
  }
};

// ── Renderizar ventana del chat ──
function renderAIChat() {
  const win = document.getElementById('ai-win');
  win.innerHTML = `
    <div class="ai-head">
      <div class="ai-head-l">
        <span class="ai-ico">🤖</span>
        <div>
          <div class="ai-name">Chat Asmodeo TK</div>
          <div class="ai-status">● Powered by Gemini</div>
        </div>
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
      <button class="ai-send" id="ai-send-btn" onclick="sendAI()">➤</button>
    </div>`;
  const msgs = document.getElementById('ai-msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// ── Enviar mensaje desde UI ──
window.sendAI = async function() {
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
        <span style="font-size:1.1rem">🤖</span>
        <div class="ai-bubble">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }

  const reply = await sendMessageToGemini(text);
  _aiMsgs.push({ role: 'a', text: reply });

  document.getElementById('typing-ind')?.remove();
  if (msgs) {
    msgs.innerHTML += `
      <div class="ai-msg a">
        <span style="font-size:1.1rem">🤖</span>
        <div class="ai-bubble">${reply}</div>
      </div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }

  if (btn) btn.disabled = false;
  if (inp) inp.disabled = false;
  inp?.focus();
};

// ── Inicializar al cargar ──
initGemini();
