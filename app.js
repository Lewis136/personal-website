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
  const painter = canvas?.getContext("2d");
  if (!canvas || !painter) return;

  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = !("IntersectionObserver" in window);
  let wasActive = false;
  const segments = 54;
  const banners = [
    { offset: .11, height: .15, phase: .6, red: 38, green: 89, blue: 216 },
    { offset: .23, height: .2, phase: 1.15, red: 22, green: 45, blue: 110 },
    { offset: .37, height: .095, phase: 1.67, red: 50, green: 101, blue: 221 },
  ];

  function flagPoint(t, time, banner) {
    const wave = Math.sin(t * 10 - time * 1.35 + banner.phase);
    const fold = Math.sin(t * 18 - time + banner.phase);
    return {
      x: width * (-.17 + t * 1.20),
      y: height * (banner.offset + .53 * t + (.018 + .057 * t) * wave + .014 * fold),
      depth: .49 + .5 * Math.cos(t * 10 - time * 1.35 + banner.phase),
      height: height * banner.height * (.86 + .14 * fold),
    };
  }

  function drawFlags(time) {
    painter.clearRect(0, 0, width, height);
    for (const banner of banners) {
      let from = flagPoint(0, time, banner);
      for (let i = 1; i <= segments; i += 1) {
        const to = flagPoint(i / segments, time, banner);
        const light = .53 + .66 * to.depth;
        painter.fillStyle = `rgba(${banner.red * light}, ${banner.green * light}, ${banner.blue * light}, .92)`;
        painter.beginPath();
        painter.moveTo(from.x - .6, from.y);
        painter.lineTo(to.x + .6, to.y);
        painter.lineTo(to.x + .6, to.y + to.height);
        painter.lineTo(from.x - .6, from.y + from.height);
        painter.closePath();
        painter.fill();

        painter.strokeStyle = `rgba(242, 196, 101, ${.24 + .6 * to.depth})`;
        painter.lineWidth = Math.max(.7, width / 530);
        painter.beginPath();
        painter.moveTo(from.x - .4, from.y + from.height * .94);
        painter.lineTo(to.x + .4, to.y + to.height * .94);
        painter.stroke();
        from = to;
      }
    }
  }

  function paint(timestamp) {
    frame = 0;
    drawFlags(timestamp / 1000);
    if (motionEnabled && visible && !document.hidden) frame = requestAnimationFrame(paint);
  }

  function syncFlags() {
    const active = motionEnabled && visible && !document.hidden;
    if (active && !frame) frame = requestAnimationFrame(paint);
    if (!active && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (wasActive !== active || !active) drawFlags(0);
    wasActive = active;
  }

  function resizeFlags() {
    const box = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    painter.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawFlags(0);
  }

  updateArtwork = syncFlags;
  resizeFlags();
  window.addEventListener("resize", resizeFlags, { passive: true });
  document.addEventListener("visibilitychange", syncFlags);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncFlags();
    });
    observer.observe(canvas);
  }
  syncFlags();
})();
