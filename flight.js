(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SVG_NS = "http://www.w3.org/2000/svg";
  const duration = 1600;
  let currentRun = null;
  let sequence = 0;

  function svgElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
  }

  function createFeathers(parent, gradient) {
    for (let index = 21; index >= 0; index -= 1) {
      const progress = index / 21;
      const start = { x: -20 - progress * 82, y: -12 + progress * 36 };
      const tip = {
        x: -(124 + 400 * Math.sin(progress * Math.PI * 0.84)),
        y: -275 + 420 * Math.pow(progress, 1.08)
      };
      const dx = tip.x - start.x;
      const dy = tip.y - start.y;
      const length = Math.hypot(dx, dy);
      const normal = { x: -dy / length, y: dx / length };
      const width = 12 + Math.sin(progress * Math.PI) * 15;
      const point = (along, across) => `${(start.x + dx * along + normal.x * width * across).toFixed(2)},${(start.y + dy * along + normal.y * width * across).toFixed(2)}`;
      const feather = svgElement("g", { class: "flight-feather" });
      feather.append(svgElement("path", {
        d: `M${point(0, -0.2)} C${point(0.34, -1.12)} ${point(0.82, -0.42)} ${point(1, 0)} C${point(0.79, 0.65)} ${point(0.29, 0.86)} ${point(0, 0.27)} Q${point(-0.04, 0.04)} ${point(0, -0.2)}Z`,
        fill: `url(#${gradient})`,
        stroke: "#e2bf78", "stroke-width": 0.62, "stroke-opacity": 0.56
      }));
      feather.append(svgElement("path", {
        d: `M${point(0.03, 0)} Q${point(0.48, 0.16)} ${point(0.98, 0)}`,
        fill: "none", stroke: "#f9e4ac", "stroke-width": 0.8, "stroke-opacity": 0.47
      }));
      for (let vein = 1; vein <= 4; vein += 1) {
        const along = 0.2 + vein * 0.13;
        feather.append(svgElement("path", {
          d: `M${point(along, 0.05)} Q${point(along + 0.07, -0.31)} ${point(along + 0.15, -0.37)} M${point(along, 0.06)} Q${point(along + 0.05, 0.35)} ${point(along + 0.13, 0.4)}`,
          fill: "none", stroke: "#f9e4ac", "stroke-width": 0.38, "stroke-opacity": 0.21
        }));
      }
      parent.append(feather);
    }
    parent.append(svgElement("path", {
      d: "M-1 2C-87-34-175-101-284-145C-352-172-421-186-471-170C-392-144-320-94-259-59C-163-4-80 28-1 16Z",
      fill: `url(#${gradient})`, stroke: "#e2bf78", "stroke-width": 0.75, "stroke-opacity": 0.62,
      class: "flight-wing-ridge"
    }));
    parent.append(svgElement("path", {
      d: "M-12 5C-155-68-282-154-440-170",
      fill: "none", stroke: "#f9e4ac", "stroke-width": 1.2, "stroke-opacity": 0.62
    }));
  }

  function buildOverlay() {
    const id = `flight-${++sequence}`;
    const overlay = document.createElement("div");
    overlay.className = "flight-overlay";
    overlay.setAttribute("aria-hidden", "true");
    const ambience = document.createElement("div");
    ambience.className = "flight-ambience";
    const stage = document.createElement("div");
    stage.className = "flight-stage";
    const sculpture = svgElement("svg", {
      viewBox: "-640 -400 1280 800", class: "flight-sculpture", focusable: "false"
    });
    const definitions = svgElement("defs");
    const metal = svgElement("linearGradient", {
      id: `${id}-metal`, x1: "-480", y1: "-240", x2: "5", y2: "100", gradientUnits: "userSpaceOnUse"
    });
    [["0", "#8b6234"], [".19", "#f9e4ac"], [".42", "#b78c49"], [".63", "#e2bf78"], [".82", "#8f652e"], ["1", "#f5d896"]].forEach(([offset, color]) => {
      metal.append(svgElement("stop", { offset, "stop-color": color }));
    });
    const coreGradient = svgElement("radialGradient", { id: `${id}-core` });
    [["0", "#f9e4ac", "1"], [".17", "#e2bf78", ".93"], [".45", "#d3a34e", ".25"], ["1", "#bd8130", "0"]].forEach(([offset, color, opacity]) => {
      coreGradient.append(svgElement("stop", { offset, "stop-color": color, "stop-opacity": opacity }));
    });
    definitions.append(metal, coreGradient);
    const left = svgElement("g", { class: "flight-wing flight-wing--left" });
    const right = svgElement("g", { class: "flight-wing flight-wing--right" });
    const mirror = svgElement("g", { transform: "scale(-1 1)" });
    createFeathers(left, `${id}-metal`);
    createFeathers(mirror, `${id}-metal`);
    right.append(mirror);
    const core = svgElement("g", { class: "flight-core" });
    core.append(svgElement("circle", { r: "112", fill: `url(#${id}-core)` }));
    core.append(svgElement("ellipse", { rx: "31", ry: "11", transform: "rotate(-34)", fill: "none", stroke: "#e2bf78", "stroke-width": "1", "stroke-opacity": ".65" }));
    core.append(svgElement("ellipse", { rx: "23", ry: "27", fill: "none", stroke: "#e2bf78", "stroke-width": ".6", "stroke-opacity": ".45" }));
    core.append(svgElement("path", { d: "M0-46 4-8 43 0 4 8 0 46-4 8-43 0-4-8Z", fill: "#f9e4ac", opacity: ".83" }));
    core.append(svgElement("circle", { r: "7", fill: "#f9e4ac" }));
    sculpture.append(definitions, left, right, core);
    stage.append(sculpture);

    const road = svgElement("svg", {
      viewBox: "0 0 1440 1000", preserveAspectRatio: "none", class: "flight-road", focusable: "false"
    });
    const roadDefs = svgElement("defs");
    const roadFill = svgElement("linearGradient", { id: `${id}-road`, x1: "0", y1: "0", x2: "0", y2: "1" });
    [["0", ".05"], [".3", ".3"], ["1", ".025"]].forEach(([offset, opacity]) => {
      roadFill.append(svgElement("stop", { offset, "stop-color": "#e2bf78", "stop-opacity": opacity }));
    });
    const laneGlow = svgElement("filter", { id: `${id}-glow`, x: "-100%", y: "-20%", width: "300%", height: "150%" });
    laneGlow.append(svgElement("feGaussianBlur", { stdDeviation: "4" }));
    roadDefs.append(roadFill, laneGlow);
    road.append(roadDefs);
    road.append(svgElement("path", { d: "M716 378H724L1260 1080H180Z", fill: `url(#${id}-road)` }));
    const rays = [];
    const endpoints = [[-150, 60], [-200, 420], [-120, 800], [100, 1100], [300, 1200], [510, 1250], [710, 1300], [930, 1250], [1140, 1200], [1370, 1100], [1560, 800], [1630, 420], [1560, 60], [1240, -120], [900, -200], [540, -200], [200, -120]];
    endpoints.forEach(([x, y], index) => {
      const length = Math.hypot(x - 720, y - 378);
      const ray = svgElement("path", {
        d: `M720 378L${x} ${y}`, class: "flight-speedline", fill: "none",
        stroke: index % 3 === 0 ? "#f9e4ac" : "#e2bf78", "stroke-width": index % 3 === 0 ? "1.7" : ".75",
        "stroke-dasharray": `${Math.round(length * 0.2)} ${Math.round(length)}`, "stroke-dashoffset": length,
        opacity: "0"
      });
      rays.push({ element: ray, length, index });
      road.append(ray);
    });
    const laneGroup = svgElement("g", { class: "flight-lanes" });
    [-540, -420, -270, -130, 0, 130, 270, 420, 540].forEach((offset, index) => {
      const path = `M${720 + offset * 0.005} 378L${720 + offset} 1080`;
      if (index === 0 || index === 8) laneGroup.append(svgElement("path", {
        d: path, fill: "none", stroke: "#e2bf78", "stroke-width": "10", opacity: ".36", filter: `url(#${id}-glow)`
      }));
      laneGroup.append(svgElement("path", {
        d: path, fill: "none", stroke: index % 2 === 0 ? "#f9e4ac" : "#e2bf78",
        "stroke-width": index === 0 || index === 8 ? "2" : ".8", opacity: index === 0 || index === 8 ? ".95" : ".3"
      }));
    });
    [405, 432, 471, 525, 604, 718, 875, 1080].forEach((y) => {
      const spread = (y - 378) * 0.77;
      laneGroup.append(svgElement("path", {
        d: `M${720 - spread} ${y}H${720 + spread}`, fill: "none", stroke: "#e2bf78", "stroke-width": ".7", opacity: ".14"
      }));
    });
    road.append(laneGroup);
    const horizon = document.createElement("div");
    horizon.className = "flight-horizon";
    const launch = document.createElement("div");
    launch.className = "flight-launch";
    const clock = document.createElement("span");
    clock.className = "flight-clock";
    overlay.append(ambience, road, horizon, stage, launch, clock);
    return { overlay, stage, left, right, core, road, rays, horizon, launch, clock };
  }

  function moveToTarget(run) {
    if (run.navigated) return;
    run.navigated = true;
    const previous = root.style.getPropertyValue("scroll-behavior");
    const priority = root.style.getPropertyPriority("scroll-behavior");
    root.style.setProperty("scroll-behavior", "auto", "important");
    try {
      try { run.target.scrollIntoView({ behavior: "instant", block: "start" }); }
      catch { run.target.scrollIntoView({ behavior: "auto", block: "start" }); }
      if (window.location.hash !== run.hash) window.history.pushState(null, "", run.hash);
    } finally {
      if (previous) root.style.setProperty("scroll-behavior", previous, priority);
      else root.style.removeProperty("scroll-behavior");
    }
  }

  function focusTarget(target) {
    const previous = target.getAttribute("tabindex");
    if (previous === null) target.setAttribute("tabindex", "-1");
    try { target.focus({ preventScroll: true }); }
    catch { target.focus(); }
    if (previous === null) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }

  function finish(run, navigate = true, focus = true) {
    if (!run || run.finished) return;
    run.finished = true;
    try {
      if (navigate) moveToTarget(run);
    } catch {
      // Cleanup remains guaranteed if the target or history changes during flight.
    } finally {
      window.clearTimeout(run.safetyTimer);
      run.animations.forEach((animation) => animation.cancel());
      run.elements?.overlay.remove();
      document.body.classList.remove("flight-active");
      document.removeEventListener("keydown", run.onEscape);
      document.removeEventListener("visibilitychange", run.onVisibility);
      window.removeEventListener("pagehide", run.onHide);
      if (currentRun === run) currentRun = null;
      if (navigate && focus) focusTarget(run.target);
    }
  }

  function flyTo(target, hash) {
    const run = { target, hash, animations: [], navigated: false, finished: false, elements: null, safetyTimer: null };
    currentRun = run;
    try {
      run.elements = buildOverlay();
      const parts = run.elements;
      document.body.append(parts.overlay);
      document.body.classList.add("flight-active");
      run.onEscape = (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        finish(run);
      };
      run.onVisibility = () => { if (document.hidden) finish(run, false, false); };
      run.onHide = () => finish(run, false, false);
      document.addEventListener("keydown", run.onEscape);
      document.addEventListener("visibilitychange", run.onVisibility);
      window.addEventListener("pagehide", run.onHide);
      run.safetyTimer = window.setTimeout(() => finish(run), 2100);
      const animate = (element, frames, options) => {
        const animation = element.animate(frames, { fill: "both", ...options });
        run.animations.push(animation);
        return animation;
      };
      const flight = animate(parts.overlay, [
        { opacity: 0, offset: 0 }, { opacity: 1, offset: 0.08 },
        { opacity: 1, offset: 0.78 }, { opacity: 0, offset: 1 }
      ], { duration, easing: "linear" });
      animate(parts.left, [
        { transform: "translate(20px,52px) rotate(58deg) scale(.12,.72)", opacity: 0 },
        { transform: "translate(0,0) rotate(-4deg) scale(1,1)", opacity: 1, offset: 0.91 },
        { transform: "translate(0,0) rotate(-6deg) scale(1.025,1.02)", opacity: 1 }
      ], { duration: 650, easing: "cubic-bezier(.16,.72,.22,1)" });
      animate(parts.right, [
        { transform: "translate(-20px,52px) rotate(-58deg) scale(.12,.72)", opacity: 0 },
        { transform: "translate(0,0) rotate(4deg) scale(1,1)", opacity: 1, offset: 0.91 },
        { transform: "translate(0,0) rotate(6deg) scale(1.025,1.02)", opacity: 1 }
      ], { duration: 650, easing: "cubic-bezier(.16,.72,.22,1)" });
      animate(parts.stage, [
        { transform: "translate3d(0,2vh,0) scale(.88)", opacity: 1, offset: 0, easing: "cubic-bezier(.2,.7,.3,1)" },
        { transform: "translate3d(0,0,0) scale(1.04)", opacity: 1, offset: 0.68, easing: "cubic-bezier(.5,0,.9,.25)" },
        { transform: "translate3d(0,-7vh,-450px) scale(.34)", opacity: 0.86, offset: 0.88, easing: "cubic-bezier(.15,.75,.3,1)" },
        { transform: "translate3d(0,-10vh,-1400px) scale(.015)", opacity: 0, offset: 1 }
      ], { duration: 970, easing: "linear" });
      animate(parts.core, [
        { transform: "scale(.3)", opacity: .25 },
        { transform: "scale(1.08)", opacity: 1, offset: .66 },
        { transform: "scale(1.75)", opacity: 1, offset: .81 },
        { transform: "scale(.45)", opacity: 0 }
      ], { duration: 950, easing: "linear" });
      animate(parts.launch, [
        { transform: "translate(-50%,-50%) scaleX(.04)", opacity: 0 },
        { transform: "translate(-50%,-50%) scaleX(1)", opacity: .92, offset: .4 },
        { transform: "translate(-50%,-50%) scaleX(1.45)", opacity: 0 }
      ], { duration: 380, delay: 615, easing: "cubic-bezier(.2,.75,.2,1)" });
      animate(parts.road, [
        { opacity: 0, transform: "scale(.72)", offset: 0 },
        { opacity: .72, transform: "scale(.96)", offset: .32 },
        { opacity: 1, transform: "scale(1.09)", offset: .68 },
        { opacity: .25, transform: "scale(1.19)", offset: 1 }
      ], { duration: 850, delay: 740, easing: "cubic-bezier(.16,.6,.25,1)" });
      animate(parts.horizon, [
        { opacity: 0, transform: "translate(-50%,-50%) scale(.2)" },
        { opacity: .92, transform: "translate(-50%,-50%) scale(1)", offset: .43 },
        { opacity: .1, transform: "translate(-50%,-50%) scale(1.65)" }
      ], { duration: 800, delay: 650, easing: "ease-out" });
      parts.rays.forEach(({ element, length, index }) => {
        animate(element, [
          { strokeDashoffset: String(length), opacity: 0 },
          { strokeDashoffset: String(length * .48), opacity: .75, offset: .35 },
          { strokeDashoffset: String(-length * .35), opacity: 0 }
        ], { duration: 540 + index % 4 * 55, delay: 700 + index % 3 * 45, easing: "cubic-bezier(.35,0,.75,1)" });
      });
      animate(parts.clock, [{ opacity: 0 }, { opacity: 0 }], { duration: 820 }).finished.then(() => {
        if (!run.finished) {
          try { moveToTarget(run); }
          catch { finish(run); }
        }
      }).catch(() => {});
      flight.finished.then(() => finish(run)).catch(() => finish(run));
    } catch {
      finish(run);
    }
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.("a[data-flight]");
    if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    if (reduceMotion.matches || root.classList.contains("motion-paused") || !Element.prototype.animate) return;
    let url;
    try { url = new URL(anchor.href, window.location.href); }
    catch { return; }
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !url.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); }
    catch { return; }
    if (!target) return;
    event.preventDefault();
    if (currentRun) return;
    flyTo(target, url.hash);
  });
})();
