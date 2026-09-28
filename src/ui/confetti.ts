/** Canvas confetti + short WebAudio fanfare. */

export function launchConfetti(durationMs = 4200): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    const div = document.createElement("div");
    div.className = "confetti-static";
    div.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:60;background:radial-gradient(circle at 20% 20%, rgba(61,184,255,.25), transparent 40%), radial-gradient(circle at 80% 30%, rgba(42,157,143,.2), transparent 40%);";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), durationMs);
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const resize = (): void => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const colors = ["#3DB8FF", "#2A9D8F", "#F0B429", "#9B7EDE", "#E23D51", "#C7D0D8"];
  const parts = Array.from({ length: 90 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight * -0.4,
    w: 4 + Math.random() * 6,
    h: 8 + Math.random() * 10,
    vy: 1.5 + Math.random() * 3,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.1 + Math.random() * 0.2,
    color: colors[(Math.random() * colors.length) | 0],
  }));

  const t0 = performance.now();
  const tick = (t: number): void => {
    const elapsed = t - t0;
    if (elapsed > durationMs) {
      canvas.remove();
      window.removeEventListener("resize", resize);
      return;
    }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > window.innerHeight + 20) {
        p.y = -20;
        p.x = Math.random() * window.innerWidth;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function playFanfare(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ac.destination);
      const start = ac.currentTime + i * 0.12;
      o.start(start);
      o.stop(start + 0.2);
    });
    setTimeout(() => ac.close(), 1200);
  } catch {
    // audio optional
  }
}
