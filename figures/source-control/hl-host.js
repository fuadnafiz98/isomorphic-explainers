// Mounts the Hairline figures on the page: a stage each, a read-out, a slider on the figure's own number, and a play
// button. The figures are the unchanged Hairline format; this is only the page they sit on.
(() => {
  HL.inject(document);
  document.querySelectorAll("[data-hl]").forEach((stage) => {
    const fig = HL_FIGS[stage.dataset.hl];
    if (!fig) return;
    const card = stage.closest("figure");
    const out = card.querySelector("[data-hl-read]");
    const embed = stage.hasAttribute("data-hl-embed");
    stage.setAttribute("data-hairline", fig.name);
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", fig.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
    const read = { _t: "rest", get textContent() { return this._t; }, set textContent(v) { this._t = v == null ? "" : String(v); if (out && !embed) out.textContent = this._t; } };
    const inst = fig.mount({ stage, svg, read }, fig.range[1]);
    stage.__hl = inst;
    if (out && !embed) out.textContent = "rest";

    const slider = card.querySelector("[data-hl-slider]"), val = card.querySelector("[data-hl-out]");
    if (slider && !embed) {
      slider.min = fig.range[0]; slider.max = fig.range[2];
      slider.step = (fig.range[2] - fig.range[0]) / 100; slider.value = fig.range[1];
      const show = () => { if (val) val.textContent = Number(slider.value).toFixed(slider.max < 5 ? 2 : 0); };
      slider.addEventListener("input", () => { inst.set(Number(slider.value)); show(); });
      show();
    }
    if (embed) return;
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
