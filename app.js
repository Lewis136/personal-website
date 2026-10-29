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
  const TAU = Math.PI * 2;
  let motionRequested = true;
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
      if (event.target.closest("a")) setMenu(false);
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

  const canvas = document.getElementById("orbital-canvas");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !ctx) return;
  const artContainer = canvas.closest(".hero-art") || canvas.parentElement;
  let width = 0;
  let height = 0;
  let scale = 1;
  let centerX = 0;
  let centerY = 0;
  let frameHandle = null;
  let previousTime = 0;
  let lastPaint = 0;
  let elapsed = 0;
  let pageActive = true;
  let artworkVisible = false;
  let pointerX = 0;
  let pointerY = 0;
  let currentPointerX = 0;
  let currentPointerY = 0;
  const compactArtwork = window.innerWidth < 720 || window.matchMedia("(pointer: coarse)").matches;
  const sampleU = compactArtwork ? 112 : 168;
  const sampleV = compactArtwork ? 20 : 28;
  const targetFrameDuration = 1000 / (compactArtwork ? 24 : 30);
  const torus = [];
  const torusLines = [];
  const orbitDefinitions = [
    { radius: 1.47, x: 1.03, y: 0.32, z: -0.48, color: "108,170,255", opacity: 0.36, phase: 0.7 },
    { radius: 1.39, x: -0.82, y: 0.71, z: 0.32, color: "233,192,112", opacity: 0.48, phase: 3.0 },
    { radius: 1.60, x: 0.15, y: -0.32, z: -0.34, color: "121,165,225", opacity: 0.13, phase: 4.9 }
  ];
  function turn(point, angleX, angleY, angleZ) {
    const cx = Math.cos(angleX), sx = Math.sin(angleX);
    const cy = Math.cos(angleY), sy = Math.sin(angleY);
    const cz = Math.cos(angleZ), sz = Math.sin(angleZ);
    const y = point.y * cx - point.z * sx;
    const z = point.y * sx + point.z * cx;
    const x = point.x * cy + z * sy;
    return { x: x * cz - y * sz, y: x * sz + y * cz, z: -point.x * sy + z * cy };
  }
  function rotation(angleX, angleY, angleZ) {
    const x = turn({ x: 1, y: 0, z: 0 }, angleX, angleY, angleZ);
    const y = turn({ x: 0, y: 1, z: 0 }, angleX, angleY, angleZ);
    const z = turn({ x: 0, y: 0, z: 1 }, angleX, angleY, angleZ);
    return (point) => ({
      x: point.x * x.x + point.y * y.x + point.z * z.x,
      y: point.x * x.y + point.y * y.y + point.z * z.y,
      z: point.x * x.z + point.y * y.z + point.z * z.z
    });
  }
  function project(point) {
    const perspective = 4.5 / (4.5 - point.z);
    return { x: centerX + point.x * scale * perspective, y: centerY + point.y * scale * perspective, z: point.z, perspective };
  }
  function torusPoint(u, v) {
    const radius = 0.82 + 0.265 * Math.cos(v);
    return { x: radius * Math.cos(u), y: radius * Math.sin(u), z: 0.265 * Math.sin(v) };
  }
  for (let ui = 0; ui < sampleU; ui += 1) {
    const u = ui / sampleU * TAU;
    for (let vi = 0; vi < sampleV; vi += 1) {
      const v = vi / sampleV * TAU;
      const mix = clamp((Math.cos(u - 0.7) + 0.35) / 1.3, 0, 1);
      torus.push({ ...torusPoint(u, v),
        normal: { x: Math.cos(v) * Math.cos(u), y: Math.cos(v) * Math.sin(u), z: Math.sin(v) },
        color: [Math.round(65 + mix * 176), Math.round(142 + mix * 58), Math.round(246 - mix * 127)] });
    }
  }
  for (let index = 0; index < 14; index += 1) {
    const line = [];
    for (let point = 0; point <= sampleU; point += 1) line.push(torusPoint(point / sampleU * TAU, index / 14 * TAU));
    torusLines.push(line);
  }
  function drawStars(time) {
    for (let index = 0; index < 27; index += 1) {
      const x = ((Math.sin(index * 127.1 + 31.7) * 43758.5453) % 1 + 1) % 1;
      const y = ((Math.sin(index * 91.7 + 24.3) * 29791.4321) % 1 + 1) % 1;
      if (Math.hypot((x - 0.5) * 1.1, y - 0.48) < 0.27) continue;
      const alpha = 0.16 + (Math.sin(time * 0.42 + index) + 1) * 0.07;
      ctx.fillStyle = `rgba(${index % 4 === 0 ? "233,198,126" : "161,194,239"},${alpha})`;
      ctx.beginPath();
      ctx.arc(x * width, y * height, index % 6 === 0 ? 1.25 : 0.7, 0, TAU);
      ctx.fill();
      if (index % 11 === 0) {
        ctx.strokeStyle = `rgba(191,214,246,${alpha * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x * width - 4, y * height);
        ctx.lineTo(x * width + 4, y * height);
        ctx.moveTo(x * width, y * height - 4);
        ctx.lineTo(x * width, y * height + 4);
        ctx.stroke();
      }
    }
  }
  function strokeDepthPath(points, front) {
    ctx.beginPath();
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1], b = points[index];
      if ((a.z + b.z >= 0) !== front) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
  function drawCore(time) {
    const radius = scale * 0.475;
    const halo = ctx.createRadialGradient(centerX, centerY, radius * 0.45, centerX, centerY, radius * 1.9);
    halo.addColorStop(0, "rgba(44,124,235,0.2)");
    halo.addColorStop(0.55, "rgba(42,107,211,0.085)");
    halo.addColorStop(1, "rgba(35,98,192,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(centerX - radius * 2, centerY - radius * 2, radius * 4, radius * 4);
    const body = ctx.createRadialGradient(centerX - radius * 0.39, centerY - radius * 0.44, radius * 0.02, centerX + radius * 0.1, centerY + radius * 0.12, radius * 1.13);
    body.addColorStop(0, "#6ea8df");
    body.addColorStop(0.13, "#276aab");
    body.addColorStop(0.43, "#103b6b");
    body.addColorStop(0.78, "#071a32");
    body.addColorStop(1, "#030c19");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 0.55;
    ctx.strokeStyle = "rgba(144,190,240,0.16)";
    for (let meridian = 0; meridian < 11; meridian += 1) {
      const longitude = meridian / 11 * TAU + time * 0.04;
      const points = [];
      for (let index = 0; index <= 70; index += 1) {
        const latitude = -Math.PI / 2 + index / 70 * Math.PI;
        points.push(project(turn({
          x: 0.462 * Math.cos(latitude) * Math.cos(longitude), y: 0.462 * Math.sin(latitude), z: 0.462 * Math.cos(latitude) * Math.sin(longitude)
        }, 0.15, 0, -0.3)));
      }
      strokeDepthPath(points, true);
    }
    for (let parallel = -3; parallel <= 3; parallel += 1) {
      const latitude = parallel * 0.32;
      const points = [];
      for (let index = 0; index <= 100; index += 1) {
        const longitude = index / 100 * TAU;
        points.push(project(turn({
          x: 0.462 * Math.cos(latitude) * Math.cos(longitude), y: 0.462 * Math.sin(latitude), z: 0.462 * Math.cos(latitude) * Math.sin(longitude)
        }, 0.15, 0, -0.3)));
      }
      strokeDepthPath(points, true);
    }
    ctx.restore();
    const rim = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    rim.addColorStop(0, "rgba(193,226,255,0.75)");
    rim.addColorStop(0.4, "rgba(72,147,236,0.08)");
    rim.addColorStop(0.78, "rgba(27,72,134,0.2)");
    rim.addColorStop(1, "rgba(232,189,103,0.48)");
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.stroke();
  }
  function draw(time) {
    if (!width || !height) return;
    currentPointerX += (pointerX - currentPointerX) * 0.055;
    currentPointerY += (pointerY - currentPointerY) * 0.055;
    const ax = 0.82 + Math.sin(time * 0.12) * 0.09 + currentPointerY * 0.07;
    const ay = -0.32 + time * 0.045 + currentPointerX * 0.1;
    const az = -0.38 + Math.sin(time * 0.09) * 0.04;
    const rotate = rotation(ax, ay, az);
    ctx.clearRect(0, 0, width, height);
    drawStars(time);
    const atmosphere = ctx.createRadialGradient(centerX - scale * 0.15, centerY, 0, centerX, centerY, scale * 1.45);
    atmosphere.addColorStop(0, "rgba(29,88,170,0.08)");
    atmosphere.addColorStop(0.55, "rgba(26,80,150,0.045)");
    atmosphere.addColorStop(1, "rgba(26,80,150,0)");
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, 0, width, height);
    const projectedPoints = torus.map((point) => {
      const position = project(rotate(point));
      const normal = rotate(point.normal);
      const lighting = clamp(normal.x * -0.42 + normal.y * -0.52 + normal.z * 0.74, 0, 1);
      return { ...position, color: point.color, lighting };
    });
    const projectedLines = torusLines.map((line) => line.map((point) => project(rotate(point))));
    const orbitPaths = orbitDefinitions.map((orbit) => {
      const points = [];
      const rotateOrbit = rotation(orbit.x, orbit.y + time * 0.018, orbit.z);
      for (let index = 0; index <= 190; index += 1) {
        const theta = index / 190 * TAU;
        points.push(project(rotateOrbit({ x: orbit.radius * Math.cos(theta), y: orbit.radius * Math.sin(theta), z: 0 })));
      }
      const theta = orbit.phase + time * (0.12 + orbit.phase * 0.008);
      const satellite = project(rotateOrbit({ x: orbit.radius * Math.cos(theta), y: orbit.radius * Math.sin(theta), z: 0 }));
      return { ...orbit, points, satellite };
    });
    const wireGradient = ctx.createLinearGradient(centerX - scale, centerY - scale, centerX + scale, centerY + scale);
    wireGradient.addColorStop(0, "rgb(99,164,255)");
    wireGradient.addColorStop(0.5, "rgb(120,164,208)");
    wireGradient.addColorStop(1, "rgb(236,190,104)");
    function drawLayer(front) {
      orbitPaths.forEach((orbit) => {
        ctx.strokeStyle = `rgba(${orbit.color},${orbit.opacity * (front ? 1 : 0.37)})`;
        ctx.lineWidth = front ? 0.75 : 0.6;
        strokeDepthPath(orbit.points, front);
        if ((orbit.satellite.z >= 0) !== front) return;
        const point = orbit.satellite;
        const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 9);
        glow.addColorStop(0, `rgba(${orbit.color},${front ? 0.55 : 0.2})`);
        glow.addColorStop(1, `rgba(${orbit.color},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 9, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(${orbit.color},${front ? 0.95 : 0.4})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, front ? 1.9 : 1.3, 0, TAU);
        ctx.fill();
      });
      ctx.strokeStyle = wireGradient;
      ctx.globalAlpha = front ? 0.17 : 0.065;
      ctx.lineWidth = 0.48;
      projectedLines.forEach((line) => strokeDepthPath(line, front));
      ctx.globalAlpha = 1;
      projectedPoints.forEach((point) => {
        if ((point.z >= 0) !== front) return;
        const depth = clamp((point.z + 1.15) / 2.3, 0, 1);
        const alpha = (front ? 0.36 : 0.13) + point.lighting * 0.48 + depth * 0.1;
        const highlight = point.lighting * 32;
        ctx.fillStyle = `rgba(${Math.min(255, point.color[0] + highlight)},${Math.min(255, point.color[1] + highlight)},${Math.min(255, point.color[2] + highlight)},${alpha})`;
        const size = (0.52 + point.lighting * 0.62) * point.perspective * clamp(scale / 180, 0.72, 1.15);
        ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
      });
      ctx.strokeStyle = wireGradient;
      ctx.globalAlpha = front ? 0.6 : 0.17;
      ctx.lineWidth = front ? 0.85 : 0.5;
      ctx.shadowColor = "rgba(81,143,230,0.55)";
      ctx.shadowBlur = front ? 6 : 0;
      strokeDepthPath(projectedLines[0], front);
      strokeDepthPath(projectedLines[7], front);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    drawLayer(false);
    drawCore(time);
    drawLayer(true);
  }
  function shouldAnimate() {
    return motionEnabled && artworkVisible && pageActive && !document.hidden && width > 0 && height > 0;
  }
  function tick(timestamp) {
    frameHandle = null;
    if (!shouldAnimate()) return;
    if (!previousTime) previousTime = timestamp;
    if (timestamp - lastPaint >= targetFrameDuration - 1) {
      elapsed += Math.min((timestamp - previousTime) / 1000, 0.08);
      previousTime = timestamp;
      lastPaint = timestamp;
      draw(elapsed);
    }
    frameHandle = requestAnimationFrame(tick);
  }
  updateArtwork = () => {
    if (shouldAnimate()) {
      if (frameHandle === null) frameHandle = requestAnimationFrame(tick);
    } else {
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      frameHandle = null;
      previousTime = 0;
      if (artworkVisible && pageActive && !document.hidden) draw(elapsed);
    }
  };
  function resizeArtwork() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.round(bounds.width);
    height = Math.round(bounds.height);
    const density = Math.min(window.devicePixelRatio || 1, width < 500 ? 1.5 : 1.75);
    const pixelLimit = Math.sqrt(1800000 / Math.max(width * height, 1));
    const dpr = Math.min(density, pixelLimit);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    centerX = width * 0.5;
    centerY = height * 0.47;
    scale = Math.min(width, height) * 0.30;
    artworkVisible = bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth;
    draw(elapsed);
    updateArtwork();
  }
  if ("ResizeObserver" in window) new ResizeObserver(resizeArtwork).observe(canvas);
  else window.addEventListener("resize", resizeArtwork, { passive: true });
  if ("IntersectionObserver" in window) {
    const artworkObserver = new IntersectionObserver(([entry]) => {
      artworkVisible = entry.isIntersecting;
      updateArtwork();
    }, { threshold: 0 });
    artworkObserver.observe(canvas);
  } else window.addEventListener("scroll", () => {
    const bounds = canvas.getBoundingClientRect();
    artworkVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
    updateArtwork();
  }, { passive: true });
  artContainer?.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || !motionEnabled) return;
    const bounds = artContainer.getBoundingClientRect();
    pointerX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
    pointerY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
  }, { passive: true });
  artContainer?.addEventListener("pointerleave", () => { pointerX = 0; pointerY = 0; }, { passive: true });
  document.addEventListener("visibilitychange", updateArtwork);
  window.addEventListener("pagehide", () => { pageActive = false; updateArtwork(); });
  window.addEventListener("pageshow", () => { pageActive = true; updateArtwork(); });
  resizeArtwork();
})();
