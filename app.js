(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const progress = document.querySelector(".page-progress");
  const header = document.querySelector(".site-header");
  const motionButton = document.querySelector("button.motion-toggle");
  const revealItems = [...document.querySelectorAll(".reveal")];
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  let motionRequested = true;
  try {
    motionRequested = localStorage.getItem("portfolio-motion") !== "off";
  } catch {
    // The page still works when site storage is unavailable.
  }
  let motionEnabled = !reducedMotion.matches;
  let revealObserver;
  let updateArtwork = () => {};

  function syncMotion() {
    motionEnabled = motionRequested && !reducedMotion.matches;
    root.classList.toggle("motion-paused", !motionEnabled);
    root.dataset.motion = motionEnabled ? "on" : "off";
    if (motionButton) {
      motionButton.setAttribute("aria-pressed", String(motionEnabled));
      motionButton.textContent = motionEnabled ? "Motion on" : "Motion off";
      motionButton.disabled = reducedMotion.matches;
      motionButton.title = reducedMotion.matches
        ? "Animation is off to follow your device's reduced motion preference."
        : "Toggle decorative animation";
    }
    if (!motionEnabled) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      revealObserver?.disconnect();
    }
    updateArtwork();
  }
  syncMotion();
  root.classList.add("js");
  motionButton?.addEventListener("click", () => {
    motionRequested = !motionEnabled;
    try {
      localStorage.setItem("portfolio-motion", motionRequested ? "on" : "off");
    } catch {
      // Keep the setting for this visit.
    }
    syncMotion();
  });
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", syncMotion);
  else reducedMotion.addListener(syncMotion);

  if (motionEnabled && "IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else revealItems.forEach((item) => item.classList.add("is-visible"));

  const sections = navLinks.map((link) => {
    try {
      return { link, section: document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1))) };
    } catch { return { link, section: null }; }
  }).filter((entry) => entry.section);
  let scrollFrame = null;
  function syncScroll() {
    scrollFrame = null;
    const scrollTop = window.scrollY || root.scrollTop;
    const available = root.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${clamp(available > 0 ? scrollTop / available : 0, 0, 1)})`;
    header?.classList.toggle("is-scrolled", scrollTop > 24);
    const readingLine = Math.max(110, window.innerHeight * 0.28);
    let current = null;
    sections.forEach((entry) => {
      if (entry.section.getBoundingClientRect().top <= readingLine) current = entry;
    });
    if (available > 0 && scrollTop >= available - 4) current = sections.at(-1) || current;
    navLinks.forEach((link) => {
      const active = current?.link === link;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  function requestScrollSync() {
    if (scrollFrame === null) scrollFrame = requestAnimationFrame(syncScroll);
  }
  window.addEventListener("scroll", requestScrollSync, { passive: true });
  window.addEventListener("resize", requestScrollSync, { passive: true });
  window.addEventListener("load", requestScrollSync, { once: true });
  syncScroll();

  const menuToggle = document.querySelector("button.menu-toggle");
  const primaryNav = document.getElementById("primary-nav");
  function setMenu(open, restoreFocus = false) {
    if (!menuToggle || !primaryNav) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    primaryNav.classList.toggle("is-open", open);
    if (restoreFocus) menuToggle.focus();
  }
  if (menuToggle && primaryNav) {
    setMenu(false);
    menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
    primaryNav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link || menuToggle.getAttribute("aria-expanded") !== "true") return;
      setMenu(false);
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
    document.addEventListener("click", (event) => {
      if (!primaryNav.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") setMenu(false, true);
    });
  }

  const filterButtons = [...document.querySelectorAll(".project-filter button[data-filter]")];
  const projectCards = [...document.querySelectorAll("article.project-card[data-category]")];
  function filterProjects(filter, reveal = false) {
    let visibleCount = 0;
    projectCards.forEach((card) => {
      const visible = filter === "all" || (card.dataset.category || "").split(/[\s,]+/).includes(filter);
      card.hidden = !visible;
      if (visible) {
        visibleCount += 1;
        if (reveal) card.classList.add("is-visible");
      }
    });
    filterButtons.forEach((button) => {
      const selected = button.dataset.filter === filter;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-active", selected);
    });
    document.querySelectorAll("[data-project-count]").forEach((element) => {
      element.textContent = `${visibleCount} project${visibleCount === 1 ? "" : "s"}`;
    });
    requestScrollSync();
  }
  filterButtons.forEach((button) => button.addEventListener("click", () => filterProjects(button.dataset.filter || "all", true)));
  if (filterButtons.length) {
    const initial = filterButtons.find((button) => button.getAttribute("aria-pressed") === "true");
    filterProjects(initial?.dataset.filter || "all");
  }
  const experienceEntries = [...document.querySelectorAll("details.experience-entry")];
  if (experienceEntries.length && !experienceEntries.some((entry) => entry.open)) experienceEntries[0].open = true;
  experienceEntries.forEach((entry) => entry.addEventListener("toggle", requestScrollSync));

  document.querySelectorAll(".copy-email button, button.copy-email").forEach((button) => {
    let feedbackTimer;
    button.addEventListener("click", async () => {
      const email = button.dataset.email || button.closest(".copy-email")?.dataset.email;
      if (!email) return;
      const status = button.closest(".copy-email")?.querySelector(".copy-status") || document.querySelector(".copy-status");
      window.clearTimeout(feedbackTimer);
      if (status) status.textContent = "";
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(email);
        button.dataset.copyState = "copied";
        if (status) status.textContent = "Email copied to clipboard.";
        feedbackTimer = window.setTimeout(() => {
          delete button.dataset.copyState;
          if (status) status.textContent = "";
        }, 4500);
      } catch {
        button.dataset.copyState = "unavailable";
        if (status) status.textContent = `Copy this email address: ${email}`;
      }
    });
  });

  const canvas = document.getElementById("flag-canvas");
  const artwork = document.getElementById("flag-art");
  if (!canvas || !artwork) return;
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });
  if (!gl) return; // The underlying poster is also the static rendition.

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (gl.getShaderParameter(result, gl.COMPILE_STATUS)) return result;
    gl.deleteShader(result);
    return null;
  }

  const vertex = shader(gl.VERTEX_SHADER, `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * vec2(0.5, -0.5) + 0.5;
      gl_Position = vec4(position, 0., 1.);
    }`);
  const fragment = shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D poster;
    uniform vec2 crop;
    uniform float time;
    void main() {
      vec2 p = (uv - 0.5) * crop + 0.5;
      // Wind travels along the diagonal cloth. The neutral background and edges stay anchored.
      float envelope = sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
      float across = p.y + 0.52 * p.x;
      float along = p.x - 0.68 * p.y;
      float sweep = sin(11.0 * along - time) * cos(8.0 * across + 0.55 * time);
      float ripple = sin(24.0 * across + 6.0 * along - 1.4 * time);
      p += envelope * vec2(0.010 * ripple + 0.009 * sweep, 0.024 * sweep + 0.007 * ripple);
      gl_FragColor = texture2D(poster, p);
    }`);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const crop = gl.getUniformLocation(program, "crop");
  const clock = gl.getUniformLocation(program, "time");
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let ready = false;
  let visible = true;
  let frame = 0;
  let lastPaint = 0;
  let elapsed = 0;
  function resizeFlags() {
    if (!ready) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(box.width * scale);
    canvas.height = Math.round(box.height * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const ratio = box.width * artwork.naturalHeight / (box.height * artwork.naturalWidth);
    gl.uniform2f(crop, Math.min(1, ratio), Math.min(1, 1 / ratio));
    gl.uniform1f(clock, elapsed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function paint(now) {
    if (now - lastPaint >= 32) {
      if (lastPaint) elapsed += Math.min(100, now - lastPaint) / 1000;
      gl.uniform1f(clock, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      lastPaint = now;
    }
    frame = requestAnimationFrame(paint);
  }
  function syncFlags() {
    const active = ready && visible && motionEnabled && !document.hidden;
    canvas.classList.toggle("is-ready", ready && motionEnabled);
    if (active && !frame) frame = requestAnimationFrame(paint);
    if (!active) { cancelAnimationFrame(frame); frame = 0; lastPaint = 0; }
  }
  function loadPoster() {
    if (!artwork.naturalWidth || ready) return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, artwork);
    if (gl.getError() !== gl.NO_ERROR) return;
    ready = true;
    resizeFlags();
    syncFlags();
  }
  updateArtwork = syncFlags;
  if (artwork.complete) loadPoster();
  else artwork.addEventListener("load", loadPoster, { once: true });
  if ("ResizeObserver" in window) new ResizeObserver(resizeFlags).observe(artwork);
  else window.addEventListener("resize", resizeFlags, { passive: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncFlags(); }).observe(canvas);
  }
  canvas.addEventListener("webglcontextlost", () => { ready = false; syncFlags(); });
  document.addEventListener("visibilitychange", syncFlags);
})();
