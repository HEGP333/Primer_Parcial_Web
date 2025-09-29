const API_URL = "https://24a0dac0-2579-4138-985c-bec2df4bdfcc-00-3unzo70c406dl.riker.replit.dev";

function safeParseJSON(str) {
  try { return JSON.parse(str); } catch(e) { return null; }
}
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  return String(text).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
  })[m]);
}

(function handleLoginPageRedirect() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;
  const raw = localStorage.getItem('usuario');
  if (!raw) return;
  const parsed = safeParseJSON(raw);
  if (!parsed) { localStorage.removeItem('usuario'); return; }
  if (parsed.codigo) {
    window.location.href = 'notas.html';
  } else {
    localStorage.removeItem('usuario');
  }
})();

(function handleNotasPageAuth() {
  const tabla = document.getElementById('tablaNotas');
  if (!tabla) return;
  const raw = localStorage.getItem('usuario');
  const parsed = safeParseJSON(raw);
  if (!parsed || !parsed.codigo) {
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
  }
})();

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigoInput = document.getElementById('codigo');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('errorMsg');

    const codigo = (codigoInput.value || '').trim();
    const password = passwordInput.value || '';

    errorMsg.textContent = '';

    if (!codigo || !password) {
      errorMsg.textContent = 'Complete código y password';
      return;
    }

    try {
      const resp = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, clave: password })
      });

      const data = await resp.json();

      const ok = (resp.ok && (data.login === true || data.codigo || data.nombre || data.name));
      if (!ok) throw new Error('Credenciales inválidas');

      const usuario = {
        codigo: data.codigo || data.code || codigo,
        nombre: data.nombre || data.name || data.fullname || '',
        email: data.email || data.correo || ''
      };

      localStorage.setItem('usuario', JSON.stringify(usuario));
      window.location.href = 'notas.html';
    } catch (err) {
      errorMsg.textContent = 'Credenciales no válidas';
      codigoInput.value = '';
      passwordInput.value = '';
      localStorage.removeItem('usuario');
      console.warn(err);
    }
  });
}

const tablaNotas = document.getElementById('tablaNotas');
if (tablaNotas) {
  const raw = localStorage.getItem('usuario');
  const usuario = safeParseJSON(raw) || {};
  document.getElementById('codigoEst').textContent = usuario.codigo || '';
  document.getElementById('nombreEst').textContent = usuario.nombre || '';

  async function cargarNotas() {
    try {
      const res = await fetch(`${API_URL}/students/${encodeURIComponent(usuario.codigo)}/notas`);
      const data = await res.json();

      const notasArray = Array.isArray(data) ? data : (data.notas || []);

      if (!notasArray.length) {
        tablaNotas.innerHTML = `<tr><td colspan="7">No hay notas disponibles</td></tr>`;
        document.getElementById('promedioEst').textContent = '0.00';
        return;
      }

      let totalCreditos = 0;
      let sumaPonderada = 0;
      tablaNotas.innerHTML = '';

      notasArray.forEach(item => {
        const p1 = parseFloat(item.n1 ?? item.p1 ?? 0) || 0;
        const p2 = parseFloat(item.n2 ?? item.p2 ?? 0) || 0;
        const p3 = parseFloat(item.n3 ?? item.p3 ?? 0) || 0;
        const ef = parseFloat(item.ex ?? item.ef ?? 0) || 0;
        const creditos = parseInt(item.creditos ?? item.cre ?? 0, 10) || 0;

        const def = (( (p1 + p2 + p3) / 3 ) * 0.7) + (ef * 0.3);
        sumaPonderada += def * creditos;
        totalCreditos += creditos;

        const p1s = isNaN(p1) ? '-' : p1.toFixed(1);
        const p2s = isNaN(p2) ? '-' : p2.toFixed(1);
        const p3s = isNaN(p3) ? '-' : p3.toFixed(1);
        const efs = isNaN(ef) ? '-' : ef.toFixed(1);
        const defs = (isNaN(def) ? '-' : (Math.round(def * 10) / 10).toFixed(1));

        tablaNotas.innerHTML += `
          <tr>
            <td>${escapeHtml(item.asignatura || item.asunto || '')}</td>
            <td>${creditos}</td>
            <td>${p1s}</td>
            <td>${p2s}</td>
            <td>${p3s}</td>
            <td>${efs}</td>
            <td>${defs}</td>
          </tr>
        `;
      });

      const promedio = totalCreditos ? (sumaPonderada / totalCreditos) : 0;
      document.getElementById('promedioEst').textContent = promedio.toFixed(2);

    } catch (err) {
      tablaNotas.innerHTML = `<tr><td colspan="7">Error cargando notas</td></tr>`;
      console.error('Error al obtener notas:', err);
    }
  }

  cargarNotas();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('usuario');
      window.location.href = 'index.html';
    });
  }
}
