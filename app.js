const desktop = document.getElementById("desktop");
const windowsLayer = document.getElementById("windows");
const template = document.getElementById("window-template");
const startButton = document.getElementById("start-button");
const startMenu = document.getElementById("start-menu");
const taskItems = document.getElementById("task-items");

let topZ = 20;
let windowCounter = 0;

const apps = {
  browser: {
    title: "Web Apps",
    render(container) {
      container.innerHTML = `
        <div class="browser-toolbar">
          <input class="browser-url" value="https://www.wikipedia.org" aria-label="Indirizzo web">
          <button class="browser-go">Apri</button>
          <button class="browser-external">↗</button>
        </div>
        <div class="quick-links">
          <button data-url="https://www.wikipedia.org">Wikipedia</button>
          <button data-url="https://www.desmos.com/calculator">Desmos</button>
          <button data-url="https://www.photopea.com">Photopea</button>
          <button data-url="https://www.canva.com">Canva</button>
        </div>
        <iframe class="browser-frame"
          src="https://www.wikipedia.org"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts">
        </iframe>
      `;

      const input = container.querySelector(".browser-url");
      const frame = container.querySelector(".browser-frame");
      const go = container.querySelector(".browser-go");
      const external = container.querySelector(".browser-external");

      function normalizeUrl(value) {
        const trimmed = value.trim();
        if (!trimmed) return "about:blank";
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      }

      function load() {
        const url = normalizeUrl(input.value);
        input.value = url;
        frame.src = url;
      }

      go.addEventListener("click", load);
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") load();
      });

      external.addEventListener("click", () => {
        window.open(normalizeUrl(input.value), "_blank", "noopener");
      });

      container.querySelectorAll("[data-url]").forEach(btn => {
        btn.addEventListener("click", () => {
          input.value = btn.dataset.url;
          load();
        });
      });
    }
  },

  notes: {
    title: "Note",
    render(container) {
      const saved = localStorage.getItem("idesk-notes") || "";
      container.innerHTML = `<textarea class="notes-area" placeholder="Scrivi qui..."></textarea>`;
      const area = container.querySelector(".notes-area");
      area.value = saved;
      area.addEventListener("input", () => {
        localStorage.setItem("idesk-notes", area.value);
      });
    }
  },

  calculator: {
    title: "Calcolatrice",
    render(container) {
      container.innerHTML = `
        <div class="calc">
          <div class="calc-display">0</div>
          ${["C","⌫","(",")","7","8","9","÷","4","5","6","×","1","2","3","−","0",".","=","+"]
            .map(v => `<button data-value="${v}">${v}</button>`).join("")}
        </div>
      `;

      const display = container.querySelector(".calc-display");
      let expr = "";

      function show(value) {
        display.textContent = value || "0";
      }

      container.querySelectorAll(".calc button").forEach(btn => {
        btn.addEventListener("click", () => {
          const v = btn.dataset.value;
          if (v === "C") {
            expr = "";
            show(expr);
          } else if (v === "⌫") {
            expr = expr.slice(0, -1);
            show(expr);
          } else if (v === "=") {
            try {
              const safe = expr
                .replaceAll("×", "*")
                .replaceAll("÷", "/")
                .replaceAll("−", "-");
              if (!/^[0-9+\-*/().\s]+$/.test(safe)) throw new Error();
              expr = String(Function(`"use strict"; return (${safe})`)());
              show(expr);
            } catch {
              show("Errore");
              expr = "";
            }
          } else {
            expr += v;
            show(expr);
          }
        });
      });
    }
  }
};

function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = topZ;
}

function makeDraggable(element, handle) {
  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  handle.addEventListener("pointerdown", e => {
    if (element.classList.contains("maximized")) return;
    if (e.target.closest("button")) return;
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    const rect = element.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    bringToFront(element);
  });

  handle.addEventListener("pointermove", e => {
    if (!dragging) return;
    const maxLeft = window.innerWidth - 120;
    const maxTop = window.innerHeight - 100;
    element.style.left = Math.max(-element.offsetWidth + 120, Math.min(maxLeft, startLeft + e.clientX - startX)) + "px";
    element.style.top = Math.max(0, Math.min(maxTop, startTop + e.clientY - startY)) + "px";
  });

  handle.addEventListener("pointerup", e => {
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch {}
  });
}

function openApp(appId) {
  const app = apps[appId];
  if (!app) return;

  const win = template.content.firstElementChild.cloneNode(true);
  const id = `win-${++windowCounter}`;
  win.dataset.id = id;
  win.querySelector(".window-title").textContent = app.title;

  const content = win.querySelector(".window-content");
  app.render(content);

  const offset = (windowCounter * 24) % 160;
  win.style.left = `${Math.min(window.innerWidth * 0.15 + offset, window.innerWidth - 320)}px`;
  win.style.top = `${40 + offset}px`;

  windowsLayer.appendChild(win);
  bringToFront(win);

  const task = document.createElement("button");
  task.className = "task-item";
  task.textContent = app.title;
  taskItems.appendChild(task);

  const titlebar = win.querySelector(".window-titlebar");
  makeDraggable(win, titlebar);

  win.addEventListener("pointerdown", () => bringToFront(win));

  win.querySelector(".window-close").addEventListener("click", () => {
    win.remove();
    task.remove();
  });

  win.querySelector(".window-minimize").addEventListener("click", () => {
    win.classList.add("hidden");
  });

  win.querySelector(".window-maximize").addEventListener("click", () => {
    win.classList.toggle("maximized");
    bringToFront(win);
  });

  task.addEventListener("click", () => {
    win.classList.toggle("hidden");
    if (!win.classList.contains("hidden")) bringToFront(win);
  });

  startMenu.classList.add("hidden");
}

document.querySelectorAll("[data-app]").forEach(btn => {
  btn.addEventListener("click", () => openApp(btn.dataset.app));
});

startButton.addEventListener("click", () => {
  startMenu.classList.toggle("hidden");
});

desktop.addEventListener("pointerdown", e => {
  if (!e.target.closest(".window") && !e.target.closest(".widget")) {
    startMenu.classList.add("hidden");
  }
});

function updateClock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(now);

  const date = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(now);

  document.getElementById("clock").textContent = time;
  document.getElementById("date").textContent = date;
  document.getElementById("task-clock").textContent = time;
}
updateClock();
setInterval(updateClock, 1000);

makeDraggable(
  document.getElementById("clock-widget"),
  document.querySelector("#clock-widget .widget-handle")
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}
