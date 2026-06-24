const root = document.documentElement;
const progress = document.querySelector(".page-progress");
const cursor = document.querySelector(".cursor-dot");
const navLinks = [...document.querySelectorAll(".nav-links a")];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
const revealItems = [...document.querySelectorAll(".reveal")];
const languageBars = document.querySelector(".language-bars");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function updateProgress() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  progress.style.setProperty("--progress", clamp(ratio, 0, 1));

  const active = sections.reduce((current, section) => {
    const top = section.getBoundingClientRect().top;
    return top < window.innerHeight * 0.42 ? section.id : current;
  }, "home");

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${active}`);
  });
}

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (entry.target.contains(languageBars)) {
        languageBars.classList.add("is-visible");
      }
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
  revealObserver.observe(item);
});

if (languageBars) {
  const barObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        languageBars.classList.add("is-visible");
        barObserver.disconnect();
      }
    },
    { threshold: 0.28 }
  );
  barObserver.observe(languageBars);
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll(".magnetic").forEach((item) => {
  item.addEventListener("mousemove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    item.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
    cursor?.classList.add("is-active");
  });

  item.addEventListener("mouseleave", () => {
    item.style.transform = "";
    cursor?.classList.remove("is-active");
  });
});

window.addEventListener(
  "mousemove",
  (event) => {
    if (!cursor) return;
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    root.style.setProperty("--pointer-x", `${event.clientX}px`);
    root.style.setProperty("--pointer-y", `${event.clientY}px`);
  },
  { passive: true }
);

const canvas = document.getElementById("orbital-canvas");
const ctx = canvas?.getContext("2d");
const points = [];
let animationFrame;
let width = 0;
let height = 0;
let lastTime = 0;

function createPoints() {
  points.length = 0;
  const count = Math.floor(clamp(width / 18, 46, 92));
  for (let i = 0; i < count; i += 1) {
    points.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.7 + 0.6,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.offsetWidth;
  height = canvas.offsetHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  createPoints();
}

function draw(time = 0) {
  if (!ctx || !canvas) return;
  const delta = Math.min(time - lastTime, 32);
  lastTime = time;

  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(width * 0.68, height * 0.32, 0, width * 0.68, height * 0.32, width * 0.54);
  gradient.addColorStop(0, "rgba(63, 140, 255, 0.17)");
  gradient.addColorStop(1, "rgba(63, 140, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  points.forEach((point, index) => {
    point.x += point.vx * delta;
    point.y += point.vy * delta;
    point.phase += 0.006 * delta;

    if (point.x < -20) point.x = width + 20;
    if (point.x > width + 20) point.x = -20;
    if (point.y < -20) point.y = height + 20;
    if (point.y > height + 20) point.y = -20;

    for (let j = index + 1; j < points.length; j += 1) {
      const other = points[j];
      const dx = point.x - other.x;
      const dy = point.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 142) continue;
      const opacity = (1 - distance / 142) * 0.18;
      ctx.strokeStyle = `rgba(234, 216, 167, ${opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(other.x, other.y);
      ctx.stroke();
    }

    ctx.fillStyle = index % 6 === 0 ? "rgba(234, 216, 167, 0.88)" : "rgba(255, 255, 255, 0.66)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r + Math.sin(point.phase) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  animationFrame = requestAnimationFrame(draw);
}

if (canvas && ctx) {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });
  animationFrame = requestAnimationFrame(draw);
}

window.addEventListener("pagehide", () => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
