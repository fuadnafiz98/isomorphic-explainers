// "Try it": measure this browser with the same kinds of probes the figure describes, entirely inside the page.
// Nothing is sent anywhere. The noise button flips a few pixels of the canvas readback, which is what a farbling
// browser does, to show how one small change moves the whole hash.
(() => {
  const root = document.querySelector("[data-probe]");
  if (!root) return;
  const rows = root.querySelector("[data-probe-rows]");
  const idEl = root.querySelector("[data-probe-id]");
  const nickEl = root.querySelector("[data-probe-nick]");
  const sameEl = root.querySelector("[data-probe-same]");
  const runBtn = root.querySelector("[data-probe-run]");
  const noiseBtn = root.querySelector("[data-probe-noise]");
  let seed = 0;
  let firstId = "";

  const hex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  function fnv(text) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0;
      h2 = Math.imul(h2 + text.charCodeAt(i), 0x85ebca6b) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0") + h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }
  async function sha(text) {
    try {
      if (crypto?.subtle) return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    } catch (error) {}
    return fnv(text);
  }
  const mulberry = (a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function canvasProbe(noisy) {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.textBaseline = "top";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 2, 60, 26);
    ctx.font = '15px "Times New Roman", serif';
    ctx.fillStyle = "#069";
    ctx.fillText("Sphinx of black quartz \u{1F98A}", 4, 22);
    ctx.font = "italic 13px Arial, sans-serif";
    ctx.fillStyle = "rgba(102,204,0,.7)";
    ctx.fillText("jumps over the lazy dog", 8, 4);
    const gradient = ctx.createLinearGradient(0, 40, 240, 60);
    gradient.addColorStop(0, "#e33");
    gradient.addColorStop(1, "#33e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 44, 240, 12);
    if (noisy) {
      const image = ctx.getImageData(0, 0, 240, 60);
      const random = mulberry(seed * 7919 + 17);
      for (let n = 0; n < 24; n++) image.data[Math.floor(random() * image.data.length)] ^= 1;
      ctx.putImageData(image, 0, 0);
    }
    return canvas.toDataURL();
  }
  function webglProbe() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { renderer: "unavailable", extensions: "" };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    const extensions = (gl.getSupportedExtensions() || []).sort().join(",");
    return { renderer, extensions };
  }
  async function audioProbe() {
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) return "unavailable";
    const context = new Offline(1, 5000, 44100);
    const osc = context.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 1000;
    const compressor = context.createDynamicsCompressor();
    osc.connect(compressor);
    compressor.connect(context.destination);
    osc.start(0);
    const buffer = await Promise.race([context.startRendering(), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500))]);
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
    return sum.toFixed(6);
  }
  function fontProbe() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const text = "mmmmmmmmmmlliWWW0123";
    const width = (font) => {
      ctx.font = `32px ${font}`;
      return ctx.measureText(text).width;
    };
    const base = width("monospace");
    const candidates = ["Arial", "Courier New", "Georgia", "Times New Roman", "Verdana", "Trebuchet MS", "Comic Sans MS", "Impact", "Palatino", "Helvetica Neue", "Menlo", "Monaco", "Segoe UI", "Roboto", "Ubuntu", "Noto Sans", "Futura", "Gill Sans", "Optima", "Avenir"];
    return candidates.filter((name) => width(`"${name}", monospace`) !== base);
  }

  async function measure(noisy) {
    const guard = async (fn, fallback = "unavailable") => {
      try {
        return await fn();
      } catch (error) {
        return fallback;
      }
    };
    const intl = Intl.DateTimeFormat().resolvedOptions();
    const gl = await guard(webglProbe, { renderer: "unavailable", extensions: "" });
    const fonts = await guard(fontProbe, []);
    const canvas = await guard(() => canvasProbe(noisy));
    const audio = await guard(audioProbe);
    return [
      { id: "headers", label: "Headers: User-Agent", value: navigator.userAgent },
      { id: "languages", label: "Headers: Accept-Language", value: (navigator.languages || [navigator.language]).join(", ") },
      { id: "screen", label: "Screen", value: `${screen.width}×${screen.height} @${window.devicePixelRatio}x · ${screen.colorDepth}-bit` },
      { id: "locale", label: "Time zone and locale", value: [intl.timeZone, intl.locale, intl.calendar, intl.numberingSystem, (1234567.891).toLocaleString()].join(" / ") },
      { id: "hardware", label: "Hardware", value: `${navigator.hardwareConcurrency ?? "n/a"} cores · memory ${navigator.deviceMemory ?? "n/a"}` },
      { id: "canvas", label: "Canvas pixels", value: canvas === "unavailable" ? canvas : `${canvas.length} chars of PNG data`, hashOf: canvas },
      { id: "webgl", label: "WebGL renderer", value: gl.renderer, hashOf: gl.renderer + "|" + gl.extensions },
      { id: "audio", label: "Audio render", value: audio },
      { id: "fonts", label: "Fonts (of 20 tested)", value: fonts.length ? `${fonts.length}: ${fonts.join(", ")}` : "none detected", hashOf: fonts.join(",") },
    ];
  }

  const ADJ = ["Quiet", "Brave", "Curious", "Patient", "Restless", "Gentle", "Swift", "Sleepy", "Clever", "Wandering", "Bold", "Calm", "Eager", "Shy", "Steady", "Merry"];
  const ANIMAL = ["Otter", "Heron", "Fox", "Badger", "Lynx", "Finch", "Marten", "Crane", "Newt", "Hare", "Ibex", "Wren", "Seal", "Stoat", "Moth", "Pike"];

  async function render() {
    runBtn.disabled = true;
    const noisy = seed > 0;
    const signals = await measure(noisy);
    const parts = [];
    rows.textContent = "";
    for (const signal of signals) {
      const raw = signal.hashOf ?? signal.value;
      const own = (await sha(String(raw))).slice(0, 8);
      parts.push(`${signal.id}=${raw}`);
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = signal.label;
      const value = document.createElement("td");
      value.className = "fp-probe-value";
      value.textContent = signal.value;
      const code = document.createElement("td");
      const c = document.createElement("code");
      c.textContent = own;
      code.append(c);
      tr.append(th, value, code);
      rows.append(tr);
    }
    const full = await sha(parts.join("\n"));
    idEl.textContent = full.slice(0, 16);
    const bytes = full.match(/../g).map((h) => parseInt(h, 16));
    nickEl.textContent = `${ADJ[bytes[0] % 16]} ${ANIMAL[bytes[1] % 16]}`;
    if (!firstId) firstId = full;
    sameEl.textContent = full === firstId ? "Same as the first measurement: the fingerprint is stable." : "Different from the first measurement: one change moved the whole hash.";
    noiseBtn.textContent = noisy ? `Noise on (seed ${seed}) · new seed` : "Simulate farbling noise";
    runBtn.disabled = false;
  }
  runBtn.addEventListener("click", () => render());
  noiseBtn.addEventListener("click", () => {
    seed += 1;
    render();
  });
  root.querySelector("[data-probe-clear]")?.addEventListener("click", () => {
    seed = 0;
    render();
  });
  render();
})();
