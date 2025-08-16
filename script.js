// ✅ Medidor de Ruido - app.js COMPLETO
let enPausa = true;
window.onload = () => {
  localStorage.removeItem("mision-activa");
  console.log("App cargada con micrófono y config 🎙️⚙️");
  mostrarBotonCancelarMision(false); // Oculta siempre al iniciar la app

  // --- Variables de Audio Globales ---
  let analyser;
  let dataArray;
  let medidorActivo = false;

  // Botón Play/Pause
  const btnPlayPause = document.getElementById("btnPlayPause");
  btnPlayPause.innerText = "▶️";
  let pausaOverlay = document.createElement("div");
  pausaOverlay.innerText = "⏸️ Pausado";
  Object.assign(pausaOverlay.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "80px",
    fontWeight: "bold",
    color: "#fff",
    textShadow: "2px 2px 4px #000",
    display: "block",
    zIndex: "999"
  });
  document.body.appendChild(pausaOverlay);

  btnPlayPause.addEventListener("click", () => {
    enPausa = !enPausa;
    btnPlayPause.innerText = enPausa ? "▶️" : "⏸️";
    pausaOverlay.style.display = enPausa ? "block" : "none";
  });

  // Botón Pantalla Completa
  const btnFullScreen = document.getElementById("btnFullScreen");
  if (btnFullScreen) {
    btnFullScreen.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
  }

  // --- POPUP DE CONFIRMACIÓN GLOBAL ---
  const popupConfirmarHTML = `
    <div id="popup-confirmar-global" class="mw-popup-overlay" style="display:none;">
      <div class="mw-popup">
        <h3 class="mw-popup-title"></h3>
        <p class="mw-popup-text"></p>
        <div class="mw-popup-actions">
          <button class="btn-no mw-btn-text">No, volver</button>
          <button class="btn-si mw-btn-danger">Sí, confirmar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', popupConfirmarHTML);

  const popupConfirmar = document.getElementById('popup-confirmar-global');
  const popupConfirmarTitle = popupConfirmar.querySelector('.mw-popup-title');
  const popupConfirmarText = popupConfirmar.querySelector('.mw-popup-text');
  const btnConfirmarSi = popupConfirmar.querySelector('.btn-si');
  const btnConfirmarNo = popupConfirmar.querySelector('.btn-no');
  let onConfirmCallback = null;

  function mostrarPopupConfirmacion(title, text, onConfirm) {
    popupConfirmarTitle.innerText = title;
    popupConfirmarText.innerText = text;
    onConfirmCallback = onConfirm;
    popupConfirmar.style.display = 'flex';
  }

  btnConfirmarSi.addEventListener('click', () => {
    popupConfirmar.style.display = 'none';
    if (typeof onConfirmCallback === 'function') onConfirmCallback();
  });
  btnConfirmarNo.addEventListener('click', () => popupConfirmar.style.display = 'none');

  // ✅ AGREGAR ESTAS VARIABLES Y FUNCIONES:
  let ultimoNivelColor = null;
  let nivelSuavizado = 0;
  let tiempoEnRojo = 0;
  window.ganadas = 0;

  function moverAguja(nivel) {
    const angulo = -90 + (nivel * 180);
    const aguja = document.getElementById("agujaEstilizada");
    if (aguja) {
      aguja.style.transform = `rotate(${angulo}deg)`;
    }
  }

  let penalizadoEnRojo = false; // ✅ Bandera para penalización única
  let pausaPorPenalizacion = false;

  // --- Lógica de Audio Unificada ---
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    if (medidorActivo) return;
    medidorActivo = true;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser(); // Asigna al analyser de scope superior
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.fftSize); // Asigna al dataArray de scope superior

    medirVolumen(); // Inicia el loop principal
  }).catch(err => {
      console.error("No se pudo acceder al micrófono:", err);
  });

  function medirVolumen() {
    if (enPausa || !analyser) {
      requestAnimationFrame(medirVolumen);
      return;
    }
    analyser.getByteTimeDomainData(dataArray);
    let total = 0;
    for (let i = 0; i < dataArray.length; i++) {
      total += Math.abs(dataArray[i] - 128);
    }
    const promedio = total / dataArray.length;

    const sensibilidad = parseInt(localStorage.getItem("config-sensibilidad") || "70");
    const amortiguacion = parseInt(localStorage.getItem("config-amortiguacion") || "30");
    let nivelAjustado = promedio / (101 - sensibilidad);
    nivelAjustado = Math.min(nivelAjustado, 1);
    nivelSuavizado = nivelSuavizado * (amortiguacion / 100) + nivelAjustado * (1 - amortiguacion / 100);

    moverAguja(nivelSuavizado);

    function obtenerNivelColor(nivel) {
      if (nivel < 0.15) return "verde";
      if (nivel < 0.3) return "azul";
      if (nivel < 0.5) return "amarillo";
      if (nivel < 0.7) return "naranja";
      return "rojo";
    }

    const color = obtenerNivelColor(nivelSuavizado);
    if (color !== ultimoNivelColor) {
      const img = localStorage.getItem(`imagen-${color}`);
      if (img) {
        document.getElementById("fondoVisual").style.backgroundImage = `url('${img}')`;
        ultimoNivelColor = color;
      }
    }

    if (localStorage.getItem("mision-activa") === "true") {
      if (color === "rojo") {
        tiempoEnRojo++;
        if (!penalizadoEnRojo && tiempoEnRojo >= 60) {
          penalizadoEnRojo = true;
          tiempoEnRojo = 0;
          const barra = document.getElementById("barra-estrellas");
          window.ganadas = Math.max(window.ganadas - 1, 0);

          console.log(`[PENALIZACIÓN] Estrella quitada: ${window.ganadas}`);

          const spans = barra.querySelectorAll("span");
          spans.forEach((s, i) => {
            s.textContent = i < window.ganadas ? "⭐" : "☆";
          });
          reproducirSonido("sonido-perder");
          
          const estadoPausaAnterior = enPausa;
          enPausa = true;
          pausaPorPenalizacion = true;
          pausaOverlay.style.display = "none";
          
          setTimeout(() => {
            if (pausaPorPenalizacion) {
              enPausa = estadoPausaAnterior;
              pausaPorPenalizacion = false;
              pausaOverlay.style.display = enPausa ? "block" : "none";
            }
          }, 3000);
        }
      } else {
        tiempoEnRojo = 0;
        penalizadoEnRojo = false;
      }
    }

    requestAnimationFrame(medirVolumen);
  }

  function mostrarPanelFondos() {
    const packActual = localStorage.getItem("pack-actual") || "Capibara";

    panelContenido.innerHTML = `
      <h2>🖼️ Configurar el fondo del medidor</h2>
      <div class="preview-principal">
        <h3>¿Qué fondo estoy usando?:</h3>
        <img id="preview-pack" src="assets/packs/${packActual}/preset.png" alt="Vista pack" />
      </div>
      <div class="packs-fondos">
        <h3>🎨 ¿Qué fondo quiero usar?:</h3>
        <div class="packs-grid"></div>
      </div>
      <div class="bloque-config bloque-upload">
        <h3>📂 Mi fondo personalizado:</h3>
        <p>Podés subir tus propias imágenes para cada nivel de ruido:</p>
        <div class="fondos-form">
          ${["verde","azul","amarillo","naranja","rojo"].map((color, idx) => `
            <div class="bloque-fondo">
              <label>${emojiColor(color)}</label>
              <input type="file" accept="image/*" data-color="${color}">
              <div class="preview-img" id="preview-${color}"></div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    function emojiColor(color) {
      switch(color) {
        case "verde": return "🟢 VERDE";
        case "azul": return "🔵 AZUL";
        case "amarillo": return "🟡 AMARILLO";
        case "naranja": return "🟠 NARANJA";
        case "rojo": return "🔴 ROJO";
        default: return color.toUpperCase();
      }
    }
    const packsFondos = [
      { nombre: "Capibara", carpeta: "Capibara" }, { nombre: "Huevo", carpeta: "Huevo" },
      { nombre: "Labubu", carpeta: "Labubu" }, { nombre: "Messi", carpeta: "Messi" },
      { nombre: "Stitch", carpeta: "Stitch" }, { nombre: "Pikachu", carpeta: "Pikachu" }
    ];

    const packsGrid = panelContenido.querySelector(".packs-grid");
    const previewPrincipal = document.getElementById("preview-pack");

    packsFondos.forEach(pack => {
      const card = document.createElement("div");
      card.className = "pack-card";
      const nombre = document.createElement("h4");
      nombre.textContent = pack.nombre;
      card.appendChild(nombre);
      const img = document.createElement("img");
      img.src = `assets/packs/${pack.carpeta}/verde.png`;
      img.className = "mini-preview";
      card.appendChild(img);
      card.addEventListener("click", () => {
        ["verde","azul","amarillo","naranja","rojo"].forEach(color => {
          localStorage.setItem(`imagen-${color}`, `assets/packs/${pack.carpeta}/${color}.png`);
        });
        localStorage.setItem("pack-actual", pack.carpeta);
        previewPrincipal.src = `assets/packs/${pack.carpeta}/preset.png`;
        alert(`✅ Pack "${pack.nombre}" aplicado.`);
      });
      packsGrid.appendChild(card);
    });

    panelContenido.querySelectorAll(".bloque-fondo input[type='file']").forEach(input => {
      input.addEventListener("change", e => {
        const color = input.dataset.color;
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const imgUrl = ev.target.result;
          localStorage.setItem(`imagen-${color}`, imgUrl);
          const preview = document.getElementById(`preview-${color}`);
          preview.style.backgroundImage = `url(${imgUrl})`;
          preview.style.backgroundSize = 'cover';
          localStorage.setItem("pack-actual", "Custom");
          previewPrincipal.src = "assets/packs/custom/preset.png";
        };
        reader.readAsDataURL(file);
      });
    });
  }

    const btnConfig = document.getElementById("boton-config");
    const ventanaConfig = document.getElementById("configuracion");
    const btnCerrar = document.getElementById("cerrar-config");
    const panelContenido = document.getElementById("panel-contenido");

    btnConfig.addEventListener("click", () => {
      ventanaConfig.style.display = "flex";
      panelContenido.innerHTML = `
        <div class="config-placeholder">
          <div class="config-placeholder-icon">⚙️</div>
          <h2>Configuración</h2>
          <p>Seleccioná una opción del menú de la izquierda para empezar.</p>
        </div>
      `;
      enPausa = true;
      btnPlayPause.innerText = "▶️";
      pausaOverlay.style.display = "none";
    });

    btnCerrar.addEventListener("click", () => {
      ventanaConfig.style.display = "none";
      enPausa = false;
      btnPlayPause.innerText = "⏸️";
      pausaOverlay.style.display = "none";
      if (!localStorage.getItem("mision-activa")) {
        localStorage.removeItem("mision-activa");
      }
    });

  document.getElementById("btn-cancelar-mision").addEventListener("click", () => {
    mostrarPopupConfirmacion(
      "⚠️ ¿Cancelar Misión?",
      "¿Estás seguro de que querés cancelar la misión actual? Se perderá el progreso de esta sesión.",
      () => {
        terminarMision();
        mostrarBotonCancelarMision(false);
      }
    );
  });

    const botonesMenu = document.querySelectorAll(".config-menu button");
    botonesMenu.forEach(boton => {
      boton.addEventListener("click", () => {
        const panel = boton.dataset.panel;
        if (panel === "fondos") mostrarPanelFondos();
        else if (panel === "microfono") mostrarPanelMicrofono();
        else if (panel === "mision") mostrarPanelMision();
      });
    });

    function mostrarPanelMicrofono() {
    panelContenido.innerHTML = `
      <h2>🎙️ Configurar Micrófono</h2>
      <div class="config-grid">
        <div class="columna-config">
          <div class="bloque-config">
            <label class="control-deslizable">
              Sensibilidad 🎚️
              <input type="range" id="sensibilidad" min="0" max="100" />
              <span id="valorSensibilidad"></span>%
              <div class="explicacion">Ajustá qué tan fuerte escucha el medidor.</div>
            </label>
          </div>
          <div class="bloque-config">
            <label class="control-deslizable">
              Amortiguación 🎚️
              <input type="range" id="amortiguacion" min="0" max="100" />
              <span id="valorAmortiguacion"></span>%
              <div class="explicacion">Suaviza cambios bruscos para que la aguja no salte.</div>
            </label>
          </div>
        </div>
        <div class="columna-config">
          <div class="bloque-config presets">
            <p><strong>Ajustes rápidos:</strong></p>
            <div class="presets-grid">
              <div class="preset-bloque"><button class="preset" data-s="100" data-d="100">🤫 Silencio</button><small>Muy sensible. Silencio total.</small></div>
              <div class="preset-bloque"><button class="preset" data-s="70" data-d="80">🗣️ Tranquilo</button><small>Conversación controlada.</small></div>
              <div class="preset-bloque"><button class="preset" data-s="40" data-d="50">👥 Grupo</button><small>Murmullos de trabajo grupal.</small></div>
              <div class="preset-bloque"><button class="preset" data-s="15" data-d="30">🎨 Clase</button><small>Movida general o artística.</small></div>
            </div>
          </div>
          <div class="bloque-config bloque-feedback">
            <p><strong>Nivel de Ruido Detectado:</strong></p>
            <div class="barra-nivel"><div class="barra-interna"></div></div>
            <small>Esta barra muestra el ruido captado en vivo. Ajustá los controles para dejarla al nivel que querés.</small>
          </div>
        </div>
      </div>
      <div id="guardado-msg" style="display:none;">✔ Cambios guardados</div>
    `;

    const sensibilidad = document.getElementById("sensibilidad");
    const valSens = document.getElementById("valorSensibilidad");
    const amortiguacion = document.getElementById("amortiguacion");
    const valAmort = document.getElementById("valorAmortiguacion");
    const guardadoMsg = document.getElementById("guardado-msg");

    sensibilidad.value = localStorage.getItem("config-sensibilidad") || 50;
    valSens.textContent = sensibilidad.value;
    amortiguacion.value = localStorage.getItem("config-amortiguacion") || 50;
    valAmort.textContent = amortiguacion.value;

    function guardarConfig() {
      localStorage.setItem("config-sensibilidad", sensibilidad.value);
      localStorage.setItem("config-amortiguacion", amortiguacion.value);
      valSens.textContent = sensibilidad.value;
      valAmort.textContent = amortiguacion.value;
      guardadoMsg.style.display = "block";
      setTimeout(() => { guardadoMsg.style.display = "none"; }, 1500);
    }

    sensibilidad.addEventListener("input", guardarConfig);
    amortiguacion.addEventListener("input", guardarConfig);

    document.querySelectorAll(".preset").forEach(btn => {
      btn.addEventListener("click", () => {
        sensibilidad.value = btn.dataset.s;
        amortiguacion.value = btn.dataset.d;
        guardarConfig();
      });
    });

    if (analyser) {
      loopBarra();
    }
  }

function mostrarPanelMision() {
  panelContenido.innerHTML = `
    <div id="mision-wizard" class="mw">
      <div class="mw-steps">
        <div class="mw-step activo" data-paso="1"><span>1</span><label>Tipo</label></div>
        <div class="mw-step" data-paso="2"><span>2</span><label>Configuración</label></div>
        <div class="mw-step" data-paso="3"><span>3</span><label>Sesión</label></div>
      </div>
      <div class="wizard-pantalla mw-screen" id="pantalla-1">
        <h2 class="mw-title">Seleccioná el tipo de misión</h2>
        <p class="mw-sub">Elegí cómo querés que el curso junte estrellas.</p>
        <div class="tarjetas-seleccion mw-cards">
          <div class="tarjeta mw-card" data-tipo="basica" tabindex="0">
            <div class="mw-card-ico">🎯</div><h3 class="mw-card-title">Misión Básica</h3><p class="mw-card-desc">10 estrellas en un tiempo definido.</p>
          </div>
          <div class="tarjeta mw-card" data-tipo="diario">
            <div class="mw-card-ico">📆</div><h3 class="mw-card-title">Premio Diario</h3><p class="mw-card-desc">Acumulan estrellas hacia un premio corto.</p>
            <div class="mw-card-actions"><button class="mw-btn-text" data-action="continue">Continuar Misión</button><button class="mw-btn-primary" data-action="new">Empezar Nueva</button></div>
          </div>
          <div class="tarjeta mw-card" data-tipo="semanal">
            <div class="mw-card-ico">🗓️</div><h3 class="mw-card-title">Premio Semanal</h3><p class="mw-card-desc">Un objetivo más grande en la semana.</p>
            <div class="mw-card-actions"><button class="mw-btn-text" data-action="continue">Continuar Misión</button><button class="mw-btn-primary" data-action="new">Empezar Nueva</button></div>
          </div>
        </div>
      </div>
      <div class="wizard-pantalla mw-screen" id="pantalla-2" style="display:none;">
        <div id="config-basica" style="display:none;">
          <h3 class="mw-title-sm">Configuración — Misión Básica</h3>
          <p class="mw-sub">Ajustá los detalles para una sesión rápida.</p>
          <div class="mw-grid" style="grid-template-columns: 1fr; max-width: 400px; margin: 20px auto;">
            <div class="mw-grid-col">
              <div class="tarjeta-config mw-tile">
                <div class="tarjeta-icono" style="font-size: 24px;">⏱️</div>
                <div class="tarjeta-contenido"><label>Tiempo de la sesión (min)</label><input type="number" id="tiempo-mision" min="1" value="10" class="mw-input" style="text-align: center; font-weight: bold; font-size: 18px; padding: 6px;"></div>
              </div>
              <div class="tarjeta-config mw-tile clickeable" onclick="toggleSwitch('sonido-estrellas')">
                <div class="tarjeta-icono" style="font-size: 24px;">🔊</div>
                <div class="tarjeta-contenido"><label>Sonido al ganar estrellas</label><div class="switch-container"><span class="switch-label">No</span><label class="switch"><input type="checkbox" id="sonido-estrellas" checked><span class="slider"></span></label><span class="switch-label">Sí</span></div></div>
              </div>
              <div class="tarjeta-config mw-tile" style="background: var(--mw-bg-sub); cursor: default;">
                <div class="tarjeta-icono" style="font-size: 24px;">⭐</div>
                <div class="tarjeta-contenido"><label>Meta de Estrellas</label><span style="color: var(--mw-text-2); font-weight: 600;">Fija en 10 estrellas</span></div>
              </div>
            </div>
          </div>
          <input type="hidden" id="meta-estrellas" value="10">
          <div class="wizard-botones mw-actions"><button class="btn-anterior mw-btn-text">Atrás</button><button class="btn-siguiente mw-btn-primary">Siguiente</button></div>
        </div>
        <div id="config-diario" style="display:none;">
          <h3 class="mw-title-sm">Configuración — Premio Diario</h3>
          <div class="mw-grid">
            <div class="mw-grid-col">
              <div class="tarjeta-config mw-tile">
                <div class="tarjeta-icono">📛</div><div class="tarjeta-contenido"><label>Nombre del premio</label><input type="text" id="nombre-diario" placeholder="Ej: Recreo Extra" class="mw-input"></div>
                <div class="tarjeta-accion"><button id="btn-borrar-diario" class="mw-btn-danger">Borrar</button></div>
              </div>
              <div class="tarjeta-config mw-tile">
                <div class="tarjeta-icono">⭐</div><div class="tarjeta-contenido"><label>Meta total de estrellas</label><input type="number" id="meta-diario" min="1" placeholder="10" class="mw-input"></div>
              </div>
              <div class="tarjeta-config mw-tile">
                <div class="tarjeta-icono">📈</div><div class="tarjeta-contenido"><label>Progreso actual</label><span class="progreso-valor" id="progreso-diario">0</span></div>
              </div>
            </div>
            <div class="mw-grid-col">
              <div class="tarjeta-config mw-tile clickeable" onclick="toggleSwitch('sumar-semanal')">
                <div class="tarjeta-icono">🗓️</div>
                <div class="tarjeta-contenido"><label>Contar estrellas al semanal</label><div class="switch-container"><span class="switch-label">No</span><label class="switch"><input type="checkbox" id="sumar-semanal"><span class="slider"></span></label><span class="switch-label">Sí</span></div></div>
              </div>
              <div class="ideas-rapidas-container mw-chipbox">
                <div class="ideas-rapidas-titulo">Ideas rápidas</div>
                <div class="ideas-rapidas mw-chips">
                  <button class="idea mw-chip" data-tipo="diario" data-nombre="Recreo Extra" data-meta="10">Recreo Extra (10⭐)</button><button class="idea mw-chip" data-tipo="diario" data-nombre="Golosina" data-meta="8">Golosina (8⭐)</button>
                  <button class="idea mw-chip" data-tipo="diario" data-nombre="Película" data-meta="15">Película (15⭐)</button><button class="idea mw-chip" data-tipo="diario" data-nombre="Juego Libre" data-meta="5">Juego Libre (5⭐)</button>
                  <button class="idea mw-chip" data-tipo="diario" data-nombre="Salida" data-meta="20">Salida (20⭐)</button><button class="idea mw-chip" data-tipo="diario" data-nombre="Dinero" data-meta="12">Dinero (12⭐)</button>
                </div>
              </div>
            </div>
          </div>
          <div class="wizard-botones mw-actions"><button class="btn-anterior mw-btn-text">Atrás</button><button class="btn-siguiente mw-btn-primary">Siguiente</button></div>
        </div>
        <div id="config-semanal" style="display:none;">
          <h3 class="mw-title-sm">Configuración — Premio Semanal</h3>
          <div class="mw-grid">
            <div class="mw-grid-col">
              <div class="tarjeta-config mw-tile">
                <div class="tarjeta-icono">📛</div><div class="tarjeta-contenido"><label>Nombre del premio</label><input type="text" id="nombre-semanal" placeholder="Ej: Salida" class="mw-input"></div>
                <div class="tarjeta-accion"><button id="btn-borrar-semanal" class="mw-btn-danger">Borrar</button></div>
              </div>
              <div class="tarjeta-config mw-tile">
                <div class="tarjeta-icono">⭐</div><div class="tarjeta-contenido"><label>Meta total de estrellas</label><input type="number" id="meta-semanal" min="1" placeholder="50" class="mw-input"></div>
              </div>
              <div class="tarjeta-config mw-tile">
                <div class="tarjeta-icono">📈</div><div class="tarjeta-contenido"><label>Progreso actual</label><span class="progreso-valor" id="progreso-semanal">0</span></div>
              </div>
            </div>
            <div class="mw-grid-col">
              <div class="ideas-rapidas-container mw-chipbox">
                <div class="ideas-rapidas-titulo">Ideas rápidas</div>
                <div class="ideas-rapidas mw-chips">
                  <button class="idea mw-chip" data-tipo="semanal" data-nombre="Salida finde" data-meta="50">Salida finde (50⭐)</button><button class="idea mw-chip" data-tipo="semanal" data-nombre="Día de juegos" data-meta="40">Día de juegos (40⭐)</button>
                  <button class="idea mw-chip" data-tipo="semanal" data-nombre="Pizza" data-meta="30">Pizza (30⭐)</button>
                </div>
              </div>
            </div>
          </div>
          <div class="wizard-botones mw-actions"><button class="btn-anterior mw-btn-text">Atrás</button><button class="btn-siguiente mw-btn-primary">Siguiente</button></div>
        </div>
      </div>
      <div class="wizard-pantalla mw-screen" id="pantalla-3" style="display:none;">
        <div id="sesion-config" class="mw-summary"></div>
        <div class="wizard-botones mw-actions"><button class="btn-anterior mw-btn-text">Atrás</button><button id="btn-confirmar" class="mw-btn-primary">🚀 Iniciar misión</button></div>
      </div>
      <div id="popup-validacion-premio" class="mw-popup-overlay" style="display:none;">
        <div class="mw-popup">
          <h3 class="mw-popup-title">¡Falta el premio!</h3>
          <p class="mw-popup-text">Para una misión diaria o semanal, necesitás definir un nombre para el premio. Si no, podés usar una misión básica.</p>
          <div class="mw-popup-actions"><button id="btn-popup-usar-basica" class="mw-btn-text">Usar Misión Básica</button><button id="btn-popup-cerrar" class="mw-btn-primary">Cerrar</button></div>
        </div>
      </div>
    </div>
  `;
  
  let pasoActual = 1;
  let tipoMisionSeleccionada = null;
  let vinoDeContinuarMision = false;
  
  const pantallas = panelContenido.querySelectorAll('.wizard-pantalla');
  const pasos = panelContenido.querySelectorAll('.paso, .mw-step');
  const btnSiguiente = panelContenido.querySelectorAll('.btn-siguiente');
  const btnAnterior = panelContenido.querySelectorAll('.btn-anterior');
  const tarjetas = panelContenido.querySelectorAll('.tarjeta');
  
  function irAPaso(paso) {
    pantallas.forEach(p => p.style.display = 'none');
    pasos.forEach(p => p.classList.remove('activo'));
    pantallas[paso - 1].style.display = 'block';
    pasos[paso - 1].classList.add('activo');
    pasoActual = paso;
    
    if (paso === 1) {
      actualizarEstadoTarjetasMision();
    }
    if (paso === 2 && tipoMisionSeleccionada) {
      document.getElementById('config-basica').style.display = 'none';
      document.getElementById('config-diario').style.display = 'none';
      document.getElementById('config-semanal').style.display = 'none';
      document.getElementById(`config-${tipoMisionSeleccionada}`).style.display = 'block';
    }
    if (paso === 3) {
      configurarPantallaSesion();
    }
  }
  
  function configurarPantallaSesion() {
    const contenedorSesion = document.getElementById('sesion-config');
    if (tipoMisionSeleccionada === 'basica') {
      const tiempo = document.getElementById('tiempo-mision').value;
      const sonido = document.getElementById('sonido-estrellas').checked;
      contenedorSesion.innerHTML = `
        <h2>🎯 Resumen de Misión Básica</h2>
        <div class="resumen-sesion">
          <div class="resumen-item"><strong>⏱️ Tiempo:</strong> ${tiempo} minutos</div>
          <div class="resumen-item"><strong>⭐ Meta:</strong> 10 estrellas</div>
          <div class="resumen-item"><strong>🔊 Sonido:</strong> ${sonido ? 'Activado' : 'Desactivado'}</div>
        </div>
      `;
    } else {
      const tipo = tipoMisionSeleccionada;
      const emoji = tipo === 'diario' ? '📆' : '🗓️';
      const nombreTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      let premio = {};
      let nombrePremio = '';
      let metaTotal = 0;
      let progreso = 0;
      if (tipo === 'diario') {
        premio = JSON.parse(localStorage.getItem('premio-diario') || '{}');
        nombrePremio = document.getElementById('nombre-diario').value || premio.nombre || 'Sin nombre';
        metaTotal = parseInt(document.getElementById('meta-diario').value) || premio.meta || 10;
        progreso = premio.progreso || 0;
      } else {
        premio = JSON.parse(localStorage.getItem('premio-semanal') || '{}');
        nombrePremio = document.getElementById('nombre-semanal').value || premio.nombre || 'Sin nombre';
        metaTotal = parseInt(document.getElementById('meta-semanal').value) || premio.meta || 50;
        progreso = premio.progreso || 0;
      }
      const faltan = Math.max(1, metaTotal - progreso);
      contenedorSesion.innerHTML = `
        <h2>${emoji} Sesión ${nombreTipo}</h2>
        <div class="objetivo-sesion">
          <p class="objetivo-nombre">Objetivo: <strong>${nombrePremio}</strong></p>
          <p class="objetivo-progreso">Progreso: <strong>${progreso} / ${metaTotal} ⭐</strong> (Faltan ${faltan} estrellas)</p>
        </div>
        <div class="campo-sesion"><label><span>⏱️ Tiempo de sesión (min):</span><input type="number" id="sesion-tiempo" min="1" value="10"></label></div>
        <div class="campo-sesion">
          <label><span>⭐ Meta de estrellas para esta sesión:</span><input type="number" id="sesion-meta" min="1" max="${faltan}" value="${Math.min(5, faltan)}"></label>
          <div id="mensaje-error-meta" class="mensaje-error" style="display:none"></div>
        </div>
        ${tipo === 'diario' ? `<div class="campo-sesion"><label><input type="checkbox" id="sesion-sumar-semanal"> Sumar estrellas ganadas al premio semanal</label></div>` : ''}
      `;
      if (tipo === 'diario') {
        document.getElementById('sesion-sumar-semanal').checked = premio.sumarASemanal || false;
      }
      const inputMeta = document.getElementById('sesion-meta');
      const mensajeError = document.getElementById('mensaje-error-meta');
      inputMeta.addEventListener('input', () => {
        if (parseInt(inputMeta.value) > faltan) {
          inputMeta.value = faltan;
          mensajeError.innerText = `Solo faltan ${faltan} estrellas para el premio.`;
          mensajeError.style.display = 'block';
        } else {
          mensajeError.style.display = 'none';
        }
      });
    }
  }
  
  function cargarValoresGuardados() {
    document.getElementById('tiempo-mision').value = localStorage.getItem('tiempo-mision') || 10;
    document.getElementById('sonido-estrellas').checked = localStorage.getItem('sonido-estrellas') === 'true';
    const diario = JSON.parse(localStorage.getItem('premio-diario') || '{}');
    document.getElementById('nombre-diario').value = diario.nombre || '';
    document.getElementById('meta-diario').value = diario.meta || '';
    document.getElementById('progreso-diario').innerText = diario.progreso || 0;
    document.getElementById('sumar-semanal').checked = diario.sumarASemanal || false;
    const semanal = JSON.parse(localStorage.getItem('premio-semanal') || '{}');
    document.getElementById('nombre-semanal').value = semanal.nombre || '';
    document.getElementById('meta-semanal').value = semanal.meta || '';
    document.getElementById('progreso-semanal').innerText = semanal.progreso || 0;
  }
  
  function limpiarConfiguracionMision(tipo) {
    if (tipo === 'diario') {
        localStorage.removeItem('premio-diario');
        document.getElementById('nombre-diario').value = '';
        document.getElementById('meta-diario').value = '';
        document.getElementById('progreso-diario').innerText = '0';
        document.getElementById('sumar-semanal').checked = false;
    } else if (tipo === 'semanal') {
        localStorage.removeItem('premio-semanal');
        document.getElementById('nombre-semanal').value = '';
        document.getElementById('meta-semanal').value = '';
        document.getElementById('progreso-semanal').innerText = '0';
    }
  }

  cargarValoresGuardados();
  
  const contenedorTarjetas = panelContenido.querySelector('.tarjetas-seleccion');

  function actualizarEstadoTarjetasMision() {
    const esPremioValido = (key) => {
      const premioJSON = localStorage.getItem(key);
      if (!premioJSON) return false;
      try {
        const premio = JSON.parse(premioJSON);
        return premio && premio.nombre && premio.nombre.trim() !== '';
      } catch (e) { return false; }
    };
    const tarjetaDiario = contenedorTarjetas.querySelector('.tarjeta[data-tipo="diario"]');
    if (tarjetaDiario) {
      const btnContinue = tarjetaDiario.querySelector('button[data-action="continue"]');
      if (btnContinue) btnContinue.disabled = !esPremioValido('premio-diario');
    }
    const tarjetaSemanal = contenedorTarjetas.querySelector('.tarjeta[data-tipo="semanal"]');
    if (tarjetaSemanal) {
      const btnContinue = tarjetaSemanal.querySelector('button[data-action="continue"]');
      if (btnContinue) btnContinue.disabled = !esPremioValido('premio-semanal');
    }
  }

  contenedorTarjetas.addEventListener('click', (e) => {
    const tarjeta = e.target.closest('.tarjeta');
    if (!tarjeta) return;
    const tipo = tarjeta.dataset.tipo;
    const actionButton = e.target.closest('button[data-action]');
    const action = actionButton ? actionButton.dataset.action : null;

    if (tipo === 'basica' || action === 'new') {
      const iniciarNueva = () => {
        tipoMisionSeleccionada = tipo;
        tarjetas.forEach(t => t.classList.remove('seleccionada'));
        tarjeta.classList.add('seleccionada');
        if (tipo === 'diario' || tipo === 'semanal') {
          limpiarConfiguracionMision(tipo);
        }
        irAPaso(2);
      };
      if (localStorage.getItem('mision-activa') === 'true') {
        mostrarPopupConfirmacion(
          "⚠️ ¿Cancelar Misión Activa?",
          "Ya hay una misión en marcha. Si empezás una nueva, la actual se cancelará. ¿Querés continuar?",
          () => {
            terminarMision();
            iniciarNueva();
          });
      } else {
        iniciarNueva();
      }
      return;
    }

    if (action === 'continue') {
      tipoMisionSeleccionada = tipo;
      tarjetas.forEach(t => t.classList.remove('seleccionada'));
      tarjeta.classList.add('seleccionada');
      vinoDeContinuarMision = true;
      irAPaso(3);
    }
  });
  
  const popupValidacion = panelContenido.querySelector('#popup-validacion-premio');
  const btnCerrarPopup = panelContenido.querySelector('#btn-popup-cerrar');
  const btnUsarBasica = panelContenido.querySelector('#btn-popup-usar-basica');

  if (btnCerrarPopup) {
    btnCerrarPopup.addEventListener('click', () => {
      popupValidacion.style.display = 'none';
    });
  }
  if (btnUsarBasica) {
    btnUsarBasica.addEventListener('click', () => {
      popupValidacion.style.display = 'none';
      tipoMisionSeleccionada = 'basica';
      tarjetas.forEach(t => t.classList.remove('seleccionada'));
      panelContenido.querySelector('.tarjeta[data-tipo="basica"]').classList.add('seleccionada');
      irAPaso(2);
    });
  }

  btnSiguiente.forEach(btn => {
    btn.addEventListener('click', () => {
      if (pasoActual === 2) {
        if (tipoMisionSeleccionada === 'diario' && document.getElementById('nombre-diario').value.trim() === '') {
          popupValidacion.style.display = 'flex';
          return;
        }
        if (tipoMisionSeleccionada === 'semanal' && document.getElementById('nombre-semanal').value.trim() === '') {
          popupValidacion.style.display = 'flex';
          return;
        }
      }
      irAPaso(pasoActual + 1);
    });
  });
  
  btnAnterior.forEach(btn => {
    btn.addEventListener('click', () => {
      if (pasoActual === 3 && vinoDeContinuarMision) {
        irAPaso(1);
      } else {
        irAPaso(pasoActual - 1);
      }
    });
  });
  
  actualizarEstadoTarjetasMision();
  panelContenido.querySelectorAll('.idea').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.dataset.tipo;
      const nombre = btn.dataset.nombre;
      const meta = btn.dataset.meta;
      if (confirm(`¿Aplicar "${nombre}" (${meta}⭐)?`)) {
        if (tipo === 'diario') {
          document.getElementById('nombre-diario').value = nombre;
          document.getElementById('meta-diario').value = meta;
          const diario = JSON.parse(localStorage.getItem('premio-diario') || '{}');
          diario.nombre = nombre;
          diario.meta = parseInt(meta);
          localStorage.setItem('premio-diario', JSON.stringify(diario));
        } else if (tipo === 'semanal') {
          document.getElementById('nombre-semanal').value = nombre;
          document.getElementById('meta-semanal').value = meta;
          const semanal = JSON.parse(localStorage.getItem('premio-semanal') || '{}');
          semanal.nombre = nombre;
          semanal.meta = parseInt(meta);
          localStorage.setItem('premio-semanal', JSON.stringify(semanal));
        }
      }
    });
  });
  
  document.getElementById('btn-borrar-diario').addEventListener('click', () => {
    if (confirm('¿Estás seguro de borrar el premio diario?')) {
      localStorage.removeItem('premio-diario');
      document.getElementById('nombre-diario').value = '';
      document.getElementById('meta-diario').value = '';
      document.getElementById('progreso-diario').innerText = '0';
      document.getElementById('sumar-semanal').checked = false;
      actualizarEstadoTarjetasMision();
    }
  });
  
  document.getElementById('btn-borrar-semanal').addEventListener('click', () => {
    if (confirm('¿Estás seguro de borrar el premio semanal?')) {
      localStorage.removeItem('premio-semanal');
      document.getElementById('nombre-semanal').value = '';
      document.getElementById('meta-semanal').value = '';
      document.getElementById('progreso-semanal').innerText = '0';
      actualizarEstadoTarjetasMision();
    }
  });
  
  ['nombre-diario', 'meta-diario', 'sumar-semanal'].forEach(id => {
    const elem = document.getElementById(id);
    elem.addEventListener('change', () => {
      const diario = JSON.parse(localStorage.getItem('premio-diario') || '{}');
      if (id === 'sumar-semanal') diario.sumarASemanal = elem.checked;
      else if (id === 'meta-diario') diario.meta = parseInt(elem.value) || 0;
      else diario.nombre = elem.value;
      localStorage.setItem('premio-diario', JSON.stringify(diario));
    });
  });
  
  ['nombre-semanal', 'meta-semanal'].forEach(id => {
    const elem = document.getElementById(id);
    elem.addEventListener('change', () => {
      const semanal = JSON.parse(localStorage.getItem('premio-semanal') || '{}');
      if (id === 'meta-semanal') semanal.meta = parseInt(elem.value) || 0;
      else semanal.nombre = elem.value;
      localStorage.setItem('premio-semanal', JSON.stringify(semanal));
    });
  });
  
  document.getElementById('sonido-estrellas').addEventListener('change', () => {
    localStorage.setItem('sonido-estrellas', document.getElementById('sonido-estrellas').checked);
  });
  document.getElementById('tiempo-mision').addEventListener('change', () => {
    localStorage.setItem('tiempo-mision', document.getElementById('tiempo-mision').value);
  });
  
  document.getElementById('btn-confirmar').addEventListener('click', async () => {
    if (localStorage.getItem('mision-activa') === 'true') {
      if (!(await advertirSiMisionActiva())) return;
      terminarMision();
    }
    if (tipoMisionSeleccionada === 'basica') {
      localStorage.setItem('tiempo-mision', document.getElementById('tiempo-mision').value);
      localStorage.setItem('meta-estrellas', 10);
      localStorage.setItem('sonido-estrellas', document.getElementById('sonido-estrellas').checked);
      localStorage.setItem('tipo-mision', 'basica');
    } else {
      localStorage.setItem('tiempo-mision', document.getElementById('sesion-tiempo').value);
      localStorage.setItem('meta-estrellas', document.getElementById('sesion-meta').value);
      localStorage.setItem('tipo-mision', tipoMisionSeleccionada);
      if (tipoMisionSeleccionada === 'diario') {
        const sumarASemanal = document.getElementById('sesion-sumar-semanal').checked;
        const diario = JSON.parse(localStorage.getItem('premio-diario') || '{}');
        diario.sumarASemanal = sumarASemanal;
        localStorage.setItem('premio-diario', JSON.stringify(diario));
      }
    }
    enPausa = false;
    btnPlayPause.innerText = "⏸️";
    pausaOverlay.style.display = "none";
    localStorage.setItem('mision-activa', 'true');
    mostrarBotonCancelarMision(true);
    ventanaConfig.style.display = 'none';
    iniciarMision();
  });
};

function metaEstrellas() {
  return parseInt(localStorage.getItem("meta-estrellas")) || 10;
}

function calcularNota(obtenidas, meta) {
  const notaRaw = (obtenidas / meta) * 10;
  return Math.min(10, Math.max(1, Math.round(notaRaw)));
}

function mostrarPopupVictoria(total) {
  pestañaActual = 0;

  const tipoMision = localStorage.getItem("tipo-mision") || "basica";
  const estrellasGanadas = window.ganadas;
  const metaSesion = parseInt(localStorage.getItem("meta-estrellas")) || 10;

  let premio;
  let progresoActualizado = 0;
  let metaTotal = 0;
  let mostrarMensajePremio = false;

  // 1. Calcular y guardar el nuevo progreso ANTES de decidir qué popup mostrar
  if (tipoMision === "diario" || tipoMision === "semanal") {
    const key = tipoMision === "diario" ? "premio-diario" : "premio-semanal";
    premio = JSON.parse(localStorage.getItem(key) || '{}');
    
    // Sumar estrellas de la sesión al progreso
    progresoActualizado = (premio.progreso || 0) + estrellasGanadas;
    premio.progreso = progresoActualizado;
    
    localStorage.setItem(key, JSON.stringify(premio));

    // Si es diario y suma a semanal, actualizar también el semanal
    if (tipoMision === "diario" && premio.sumarASemanal) {
      let semanal = JSON.parse(localStorage.getItem("premio-semanal") || '{}');
      semanal.progreso = (semanal.progreso || 0) + estrellasGanadas;
      localStorage.setItem("premio-semanal", JSON.stringify(semanal));
    }
    
    // 2. Chequear si se ganó el premio con el valor YA actualizado
    metaTotal = premio.meta || 0;
    if (metaTotal > 0 && progresoActualizado >= metaTotal) {
      mostrarMensajePremio = true;
    }
  }

  // 3. Actualizar toda la UI de contadores
  // Refrescar contadores de la sección de misión y del cartel superior
  refrescarProgresosPremios();
  mostrarCartelProgresoPremio();
  
  const resumenCompleto = document.getElementById("texto-resumen-estrellas");
  if (resumenCompleto) {
    resumenCompleto.innerText = `En esta misión consiguieron ${estrellasGanadas} de ${metaSesion} ⭐`;
  }
  const nota = calcularNota(estrellasGanadas, metaSesion);
  const resumenNota = document.querySelector("#resumen-nota");
  if (resumenNota) resumenNota.innerText = nota;
  const resumenMsg = document.querySelector("#resumen-mensaje");
  if (resumenMsg) resumenMsg.innerText = nota >= 9 ? "¡Excelente trabajo! 🌟" :
                                           nota >= 7 ? "¡Muy bien, sigamos así!" :
                                           nota >= 5 ? "¡Vamos mejorando!" :
                                                       "¡A no bajar los brazos! 💪";
  document.getElementById("popup-estrellas-ganadas").parentElement.style.display = "none";
  document.getElementById("total-estrellas-acum").innerText = (tipoMision !== 'basica') ? progresoActualizado : "-";

  const popup = document.getElementById("popup-victoria");
  const paginas = document.querySelectorAll("#popup-victoria .popup-page");

  // Asignar handlers con JS para evitar problemas de scope con onclick=""
  const btnSiguiente = document.getElementById("btn-popup-siguiente");
  if(btnSiguiente) btnSiguiente.onclick = () => cambiarPestaña(1);
  const btnAnterior = document.getElementById("btn-popup-anterior");
  if(btnAnterior) btnAnterior.onclick = () => cambiarPestaña(-1);
  const btnCerrar = document.getElementById("btn-cerrar-progreso");
  if(btnCerrar) btnCerrar.onclick = terminarMision;

  // 4. Lógica para mostrar el popup correcto
  if (tipoMision === "basica") {
    paginas.forEach((p, i) => p.style.display = i === 0 ? "block" : "none");
    const mensajeDesafio = document.getElementById("mensaje-desafio");
    if (mensajeDesafio) mensajeDesafio.style.display = "none";
    const contenedor = paginas[0];
    const botonesExistentes = contenedor.querySelectorAll("button");
    botonesExistentes.forEach((b, i) => { if (i > 0) b.remove(); });
    if (btnSiguiente) btnSiguiente.style.display = "none";
    if (!contenedor.querySelector("#btn-cerrar-basica")) {
      const cerrarBtn = document.createElement("button");
      cerrarBtn.innerText = "✔️ Cerrar";
      cerrarBtn.id = "btn-cerrar-basica";
      cerrarBtn.onclick = terminarMision;
      contenedor.appendChild(cerrarBtn);
    }
  } else {
    paginas.forEach(p => p.style.display = "none");
    if (mostrarMensajePremio) {
      const ultimaPestana = paginas[paginas.length - 1];
      if (ultimaPestana) {
        ultimaPestana.innerHTML = `
          <h2>¡Felicitaciones! 🎉</h2>
          <p>¡Ganaron el premio: <b>${premio.nombre || "Premio"}</b>!</p>
          <button>✔️ Cerrar</button>
        `;
        ultimaPestana.querySelector('button').onclick = terminarMision;
      }
      pestañaActual = paginas.length - 1; // Ir a la última página
      
      // Limpiar el premio ganado para poder empezar uno nuevo
      const key = tipoMision === "diario" ? "premio-diario" : "premio-semanal";
      localStorage.removeItem(key);
      // Al remover el premio se debe actualizar toda la visualización de progreso
      refrescarProgresosPremios(); // Refrescar UI de configuración
      mostrarCartelProgresoPremio();

    } else {
      pestañaActual = 0; // Quedarse en la primera página
      const mensajeDesafio = document.getElementById("mensaje-desafio");
      if (mensajeDesafio) {
        const estrellasRestantes = Math.max(0, metaTotal - progresoActualizado);
        mensajeDesafio.innerText = `Faltan ${estrellasRestantes} estrellas para alcanzar su premio. ¡Sigan así! 🎁⭐`;
        mensajeDesafio.style.display = "block";
      }
      if (btnSiguiente) {
        btnSiguiente.style.display = "inline-block";
      }
    }
    actualizarPestañas();
  }
  popup.style.display = "flex";
}

let pestañaActual = 0;
function cambiarPestaña(dir) {
  const paginas = document.querySelectorAll("#popup-victoria .popup-page");
  pestañaActual += dir;
  // Clamp para no salirse de los límites
  pestañaActual = Math.max(0, Math.min(pestañaActual, paginas.length - 1));
  actualizarPestañas();
}

function actualizarPestañas() {
  const pestañas = document.querySelectorAll("#popup-victoria .popup-page");
  pestañas.forEach((p, i) => {
    p.style.display = i === pestañaActual ? "block" : "none";
  });
}

function terminarMision() {
  if (typeof intervaloMision !== "undefined" && intervaloMision) {
    clearInterval(intervaloMision);
    intervaloMision = null;
  }
  const popup = document.getElementById("popup-victoria");
  if (popup) popup.style.display = "none";
  const hud = document.getElementById("mision-hud");
  if (hud) hud.style.display = "none";
  const contAcum = document.getElementById("contador-acumulado");
  if (contAcum) contAcum.style.display = "none";
  localStorage.removeItem("mision-activa");
  mostrarBotonCancelarMision(false);
}

function reproducirSonido(id) {
  const audio = document.getElementById(id);
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.warn(e));
  }
}
let intervaloMision = null;

function iniciarMision() {
 if (intervaloMision) {
    clearInterval(intervaloMision);
    intervaloMision = null;
  }
  const hud = document.getElementById("mision-hud");
  const barra = document.getElementById("barra-estrellas");
  const reloj = document.getElementById("temporizador");
  hud.style.display = "flex";

  const tipoMision = localStorage.getItem("tipo-mision") || "basica";
  if (tipoMision === "diario" || tipoMision === "semanal") {
    mostrarCartelProgresoPremio();
  } else {
    document.getElementById("cartel-progreso-premio").style.display = "none";
  }

  let total = parseInt(localStorage.getItem("meta-estrellas") || 10);
  window.ganadas = 0;
  let tiempo = parseInt(localStorage.getItem("tiempo-mision") || "10") * 60;
  const sonidoActivo = localStorage.getItem("sonido-estrellas") === "true";

  barra.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const s = document.createElement("span");
    s.textContent = "☆";
    barra.appendChild(s);
  }

  function actualizarEstrellas() {
    const estrellas = barra.querySelectorAll("span");
    estrellas.forEach((s, i) => s.textContent = i < window.ganadas ? "⭐" : "☆");
  }

  function actualizarTiempo() {
    const min = Math.floor(tiempo / 60);
    const sec = String(tiempo % 60).padStart(2, "0");
    reloj.textContent = `${min}:${sec}`;
  }

  actualizarEstrellas();
  actualizarTiempo();

  intervaloMision = setInterval(() => {
    if (enPausa) return;
    tiempo--;
    const cadaCuanto = Math.floor((parseInt(localStorage.getItem("tiempo-mision")) * 60) / total);
    if (tiempo > 0 && tiempo % cadaCuanto === 0) {
      window.ganadas = Math.min(window.ganadas + 1, total);
      if (sonidoActivo) reproducirSonido("sonido-ganar");
      actualizarEstrellas();
    }
    actualizarTiempo();
    if (tiempo <= 0 || window.ganadas >= total) {
      clearInterval(intervaloMision);
      intervaloMision = null;
      if (sonidoActivo) reproducirSonido("sonido-mision");
      mostrarPopupVictoria(total);
    }
  }, 1000);
}

let nivelSuavizadoBarra = 0;
function loopBarra() {
  if (!analyser) return;

  analyser.getByteTimeDomainData(dataArray);
  let total = 0;
  for (let i = 0; i < dataArray.length; i++) {
    total += Math.abs(dataArray[i] - 128);
  }
  const promedio = total / dataArray.length;
  const sensibilidad = parseInt(localStorage.getItem("config-sensibilidad") || "70");
  const amortiguacion = parseInt(localStorage.getItem("config-amortiguacion") || "30");
  let nivelAjustado = promedio / (101 - sensibilidad);
  nivelAjustado = Math.min(nivelAjustado, 1);
  nivelSuavizadoBarra = nivelSuavizadoBarra * (amortiguacion / 100) + nivelAjustado * (1 - amortiguacion / 100);
  const nivelPorcentaje = nivelSuavizadoBarra * 100;
  const barraInterna = document.querySelector(".barra-interna");
  if (barraInterna) {
    barraInterna.style.width = `${nivelPorcentaje}%`;
  }
  requestAnimationFrame(loopBarra);
}

function mostrarCartelProgresoPremio() {
  const tipoMision = localStorage.getItem("tipo-mision");
  if (tipoMision !== "diario" && tipoMision !== "semanal") {
    document.getElementById("cartel-progreso-premio").style.display = "none";
    return;
  }
  const premio = JSON.parse(localStorage.getItem(tipoMision === "diario" ? "premio-diario" : "premio-semanal") || '{}');
  const progreso = premio.progreso || 0;
  const meta = premio.meta || 0;
  const faltan = Math.max(0, meta - progreso);
  const nombre = premio.nombre || "Premio";
  const texto = `
    <span style="font-size:20px;">🎯 Jugando por: <b>${nombre}</b></span><br>
    <span style="font-size:18px;">⭐ Estrellas acumuladas: <b>${progreso}</b></span><br>
    <span style="font-size:18px;">✨ Faltan: <b>${faltan}</b> para ganarlo</span>
  `;
  const cartel = document.getElementById("cartel-progreso-premio");
  const textoElem = document.getElementById("texto-progreso-premio");
  if (cartel && textoElem) {
    textoElem.innerHTML = texto;
    cartel.style.display = "block";
  }
}

function refrescarProgresosPremios() {
  const diario = JSON.parse(localStorage.getItem("premio-diario") || '{}');
  const semanal = JSON.parse(localStorage.getItem("premio-semanal") || '{}');
  const progDiario = document.getElementById("progreso-diario");
  if (progDiario) progDiario.innerText = diario.progreso || 0;
  const progSemanal = document.getElementById("progreso-semanal");
  if (progSemanal) progSemanal.innerText = semanal.progreso || 0;
  const acumNum = document.getElementById("acumulado-numero");
  const tipoMision = localStorage.getItem("tipo-mision") || "basica";
  if (acumNum) {
    if (tipoMision === "diario") acumNum.innerText = diario.progreso || 0;
    else if (tipoMision === "semanal") acumNum.innerText = semanal.progreso || 0;
    else acumNum.innerText = "-";
  }
}

async function advertirSiMisionActiva() {
  if (localStorage.getItem("mision-activa") === "true") {
    return confirm("Ya hay una misión en marcha. ¿Querés cancelarla para comenzar una nueva?");
  }
  return true;
}

function mostrarBotonCancelarMision(mostrar) {
  const acciones = document.getElementById("mision-actions");
  if (acciones) acciones.style.display = mostrar ? "block" : "none";
}

function toggleSwitch(id) {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change'));
  }
}
}