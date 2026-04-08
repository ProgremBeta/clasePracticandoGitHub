document.addEventListener('DOMContentLoaded', function () {
  const promptInput = document.getElementById('prompt');
  const sendBtn = document.getElementById('send');
  const chatEl = document.getElementById('chat');
  const clearBtn = document.getElementById('clear');

  const STORAGE_KEY = 'llm_chat_history';
  let messages = [];

  function renderMessage(role, text, time, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message ' + (role === 'user' ? 'user' : 'bot');
    if (id) wrapper.dataset.id = id;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    // Render Markdown to HTML and sanitize. Fallback to textContent if libraries missing.
    try {
      if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        bubble.innerHTML = DOMPurify.sanitize(marked.parse(String(text)));
      } else {
        bubble.textContent = text;
      }
    } catch (e) {
      bubble.textContent = text;
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = time ? new Date(time).toLocaleString() : '';
    wrapper.appendChild(bubble);
    wrapper.appendChild(meta);
    chatEl.appendChild(wrapper);
    chatEl.scrollTop = chatEl.scrollHeight;
    return wrapper;
  }

  function saveMessages() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('No se pudo guardar el historial', e);
    }
  }

  function loadMessages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      messages = JSON.parse(raw) || [];
      messages.forEach(m => renderMessage(m.role, m.text, m.time, m.id));
    } catch (e) {
      console.warn('No se pudo leer el historial', e);
      messages = [];
    }
  }

  async function sendPrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    promptInput.value = '';

    // Mostrar mensaje del usuario
    const time = Date.now();
    const userId = 'm-' + time + '-u';
    messages.push({ role: 'user', text: prompt, time, id: userId });
    saveMessages();
    renderMessage('user', prompt, time, userId);

    // Mostrar indicador de typing para el bot
    const typingId = 'typing-' + Date.now();
    const typingTime = Date.now();
    // push a placeholder bot message; will be replaced when response arrives
    messages.push({ role: 'bot', text: 'Escribiendo...', time: typingTime, id: typingId });
    saveMessages();
    const typingEl = renderMessage('bot', 'Escribiendo...', typingTime, typingId);

    try {
      const res = await fetch('/llm/' + encodeURIComponent(prompt));
      if (!res.ok) {
        const txt = await res.text();
        const errMsg = `Error ${res.status}: ${txt}`;
        if (typeof DOMPurify !== 'undefined' && typeof marked !== 'undefined') {
          typingEl.querySelector('.bubble').innerHTML = DOMPurify.sanitize(marked.parse(errMsg));
        } else {
          typingEl.querySelector('.bubble').textContent = errMsg;
        }
        return;
      }
      const data = await res.json();
      const text = data.Respuesta || JSON.stringify(data, null, 2);
      // update messages array (replace last placeholder with actual)
      const idx = messages.findIndex(m => m.id === typingId);
      if (idx !== -1) messages[idx] = { role: 'bot', text, time: Date.now(), id: typingId };
      saveMessages();
      if (typeof DOMPurify !== 'undefined' && typeof marked !== 'undefined') {
        typingEl.querySelector('.bubble').innerHTML = DOMPurify.sanitize(marked.parse(String(text)));
      } else {
        typingEl.querySelector('.bubble').textContent = text;
      }
      typingEl.querySelector('.meta').textContent = new Date().toLocaleString();
    } catch (err) {
      const errText = 'Error de red: ' + err.message;
      const idx = messages.findIndex(m => m.id === typingId);
      if (idx !== -1) messages[idx] = { role: 'bot', text: errText, time: Date.now(), id: typingId };
      saveMessages();
      if (typeof DOMPurify !== 'undefined' && typeof marked !== 'undefined') {
        typingEl.querySelector('.bubble').innerHTML = DOMPurify.sanitize(marked.parse(errText));
      } else {
        typingEl.querySelector('.bubble').textContent = errText;
      }
      typingEl.querySelector('.meta').textContent = new Date().toLocaleString();
    }
  }

  sendBtn.addEventListener('click', sendPrompt);
  promptInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendPrompt();
  });

  clearBtn.addEventListener('click', function () {
    if (!confirm('¿Limpiar historial de chat?')) return;
    messages = [];
    saveMessages();
    chatEl.innerHTML = '';
  });

  // Load previous messages
  loadMessages();

  // Small styles injected to keep file standalone-ish
  const style = document.createElement('style');
  style.textContent = `
    .chat{height:60vh; overflow:auto; border:1px solid #e1e4e8; padding:1rem; border-radius:8px; background:#fff}
    .message{display:flex; flex-direction:column; margin-bottom:.6rem}
    .message.user{align-items:flex-end}
    .message.bot{align-items:flex-start}
    .bubble{max-width:75%; padding:.6rem .8rem; border-radius:12px; background:#f1f3f5}
    .message.user .bubble{background:#0b93f6; color:white}
    .meta{font-size:.7rem; color:#666; margin-top:.25rem}
    pre{background:#0b1220;color:#e6edf3;padding:8px;border-radius:6px;overflow:auto}
    code{background:#f6f8fa;padding:2px 4px;border-radius:4px}
    blockquote{border-left:4px solid #ddd;padding-left:8px;color:#555;margin:0}
    .composer{margin-top:1rem; display:flex; gap:.5rem}
    .composer input{flex:1; padding:.6rem; font-size:1rem}
    .composer button{padding:.6rem 1rem}
  `;
  document.head.appendChild(style);
});

