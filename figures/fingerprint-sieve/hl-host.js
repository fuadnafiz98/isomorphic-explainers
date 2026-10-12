// Mounts the Hairline figures on the page: a stage each, a read-out, a play button and a legend that follows the figure.
// The figures are the unchanged Hairline format; this is only the page they sit on.
(() => {
  HL.inject(document);
  const num = (t, re, d) => { const m = re.exec(t); return m ? Number(m[1]) : d; };
  // which legend row the figure's read-out says is live (-1 for none)
  const LEG = {
    halving: (t) => num(t, /^(\d) bit/, 3),
    canvas: (t) => (t === "B" || num(t, /A→B (\d+)/, 0) >= 50 ? 1 : 0),
    survives: (t) => num(t, /^row (\d)/, 0) - 1,
    needle: (t) => { const h = num(t, /^hole (\d)/, 0); return h === 0 ? -1 : h <= 2 ? 0 : h <= 4 ? 1 : 2; },
  };
  document.querySelectorAll("[data-hl]").forEach((stage) => {
    const fig = HL_FIGS[stage.dataset.hl];
    if (!fig) return;
    const card = stage.closest("figure"), out = card.querySelector("[data-hl-read]");
    const rows = [...card.querySelectorAll("[data-hl-legend] li")];
    stage.setAttribute("data-hairline", fig.name);
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", fig.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
    let text = "rest";
    const light = (k) => rows.forEach((li) => (Number(li.dataset.k) === k ? li.setAttribute("data-on", "") : li.removeAttribute("data-on")));
    const read = {
      get textContent() { return text; },
      set textContent(v) { text = v == null ? "" : String(v); out.textContent = text; light(LEG[fig.name](text)); },
    };
    fig.mount({ stage, svg, read }, fig.range[1]);
    read.textContent = "rest";

    // an unseen pointer walks the figure's tour when it first scrolls into view, and gives way to a real one
    const play = card.querySelector("[data-hl-play]");
    let tour = null;
    const setTour = (on) => {
      if (on && !tour) tour = HL.tour(stage, fig.tour || HL.LAP);
      if (!on && tour) { tour.stop(); tour = null; }
      play.setAttribute("aria-pressed", String(on));
      play.textContent = on ? "stop tour" : "play tour";
    };
    play.addEventListener("click", () => setTour(!tour));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); setTour(true); } }, { threshold: 0.6 });
      io.observe(stage);
    }
  });
})();
