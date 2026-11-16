let ctx: AudioContext | null = null;

/** Bipes curtos (alerta de parada estourando). Só toca depois de algum toque na tela. */
export function bipe(vezes = 1, freq = 1320) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    for (let i = 0; i < vezes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      const ini = t0 + i * 0.26;
      g.gain.setValueAtTime(0.0001, ini);
      g.gain.exponentialRampToValueAtTime(0.18, ini + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.17);
      o.connect(g).connect(ctx.destination);
      o.start(ini);
      o.stop(ini + 0.2);
    }
  } catch {
    /* sem áudio */
  }
}
