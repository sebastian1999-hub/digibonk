// Original score: minor-key adventure, four harmonic sections and layered synthesis.
// No copyrighted recordings, remote requests, or audio assets are required.
export class Music {
  constructor() {
    this.enabled = true;
    this.volume = 0.3;
    this.step = 0;
    this.next = 0;
    this.running = false;
    this.track = null;
  }
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 0;
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.ratio.value = 4;
      this.bus.connect(compressor);
      compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setEnabled(value) {
    this.enabled = value;
  }
  setVolume(value) {
    this.volume = value;
    if (this.track) this.track.volume = value;
  }
  load(file) {
    this.start();
    if (this.track) {
      this.track.pause();
      URL.revokeObjectURL(this.track.src);
    }
    this.track = new window.Audio(URL.createObjectURL(file));
    this.track.loop = true;
    this.track.volume = this.volume;
    this.enabled = true;
  }
  note(midi, at, duration, volume, type = 'triangle', pan = 0) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain(),
      p = c.createStereoPanner();
    o.type = type;
    o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(volume, at + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    p.pan.value = pan;
    o.connect(g);
    g.connect(p);
    p.connect(this.bus);
    o.start(at);
    o.stop(at + duration + 0.02);
  }
  drum(at, strong) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(strong ? 130 : 1200, at);
    o.frequency.exponentialRampToValueAtTime(strong ? 42 : 250, at + 0.09);
    o.type = strong ? 'sine' : 'triangle';
    g.gain.setValueAtTime(strong ? 0.4 : 0.045, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
    o.connect(g);
    g.connect(this.bus);
    o.start(at);
    o.stop(at + 0.15);
  }
  tick(playing) {
    if (!this.ctx) return;
    const audible = playing && this.enabled;
    this.bus.gain.setTargetAtTime(
      audible && !this.track ? this.volume * 0.6 : 0,
      this.ctx.currentTime,
      0.12,
    );
    if (this.track) {
      if (audible && this.track.paused) void this.track.play().catch(() => {});
      else if (!audible && !this.track.paused) this.track.pause();
      return;
    }
    if (!audible) {
      this.next = this.ctx.currentTime + 0.08;
      return;
    }
    const beat = 60 / 132 / 2;
    if (this.next < this.ctx.currentTime) this.next = this.ctx.currentTime + 0.05;
    while (this.next < this.ctx.currentTime + 0.15) {
      const n = this.step++,
        bar = Math.floor(n / 16),
        i = n % 16,
        root = [45, 41, 48, 43][bar % 4],
        chord = [0, 3, 7, 12],
        melodies = [
          [12, 19, 15, 19, 22, 19, 15, 14, 12, 15, 19, 24, 22, 19, 15, 19],
          [12, 15, 19, 22, 24, 22, 19, 15, 14, 17, 19, 22, 19, 17, 14, 10],
          [19, 22, 24, 27, 24, 22, 19, 15, 19, 22, 26, 24, 22, 19, 17, 15],
          [14, 17, 19, 22, 19, 17, 14, 10, 12, 14, 15, 19, 17, 14, 12, 10],
        ],
        mel = melodies[Math.floor(bar / 4) % 4];
      this.note(root + mel[i], this.next, beat * 0.85, 0.1, 'triangle', 0.25);
      this.note(root + 12 + chord[i % 4], this.next, beat * 0.7, 0.035, 'sine', -0.35);
      if (i % 4 === 0) {
        this.note(root - (i % 8 ? 0 : 12), this.next, beat * 3, 0.16, 'triangle');
        this.drum(this.next, true);
      }
      if (i % 4 === 2) this.drum(this.next, false);
      if (i === 0)
        for (const offset of chord.slice(0, 3))
          this.note(root + 12 + offset, this.next, beat * 12, 0.025, 'sine');
      this.next += beat;
    }
  }
}
