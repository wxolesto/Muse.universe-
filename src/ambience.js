export class ShoreAmbience {
  constructor() {
    this.context = null;
    this.master = null;
    this.nodes = [];
    this.enabled = false;
    this.volume = 0.32;
    this.layerGains = null;
  }

  async toggle() {
    if (this.enabled) {
      await this.stop();
      return false;
    }
    await this.start();
    return true;
  }

  createNoiseBuffer(context) {
    const length = context.sampleRate * 5;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + .018 * white) / 1.018;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  addNoiseLayer(context, buffer, options) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = options.filter || "lowpass";
    filter.frequency.value = options.frequency;
    filter.Q.value = options.q || .45;
    const gain = context.createGain();
    gain.gain.value = options.gain;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    this.nodes.push(source, filter, gain);
    return gain;
  }

  async start() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Audio is not supported in this browser.");
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContextClass();
    }
    await this.context.resume();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.context.destination);
    this.nodes = [this.master];

    const noise = this.createNoiseBuffer(this.context);
    const ocean = this.addNoiseLayer(this.context, noise, {
      filter:"lowpass", frequency:520, gain:.72, q:.3
    });
    const wind = this.addNoiseLayer(this.context, noise, {
      filter:"lowpass", frequency:210, gain:.28, q:.5
    });
    const distantAir = this.addNoiseLayer(this.context, noise, {
      filter:"bandpass", frequency:1050, gain:.045, q:.22
    });

    const lfo = this.context.createOscillator();
    const oceanMotion = this.context.createGain();
    lfo.type = "sine";
    lfo.frequency.value = .075;
    oceanMotion.gain.value = .13;
    lfo.connect(oceanMotion);
    oceanMotion.connect(ocean.gain);
    lfo.start();
    this.nodes.push(lfo, oceanMotion);

    const windLfo = this.context.createOscillator();
    const windMotion = this.context.createGain();
    windLfo.type = "sine";
    windLfo.frequency.value = .035;
    windMotion.gain.value = .07;
    windLfo.connect(windMotion);
    windMotion.connect(wind.gain);
    windLfo.start();
    this.nodes.push(windLfo, windMotion);

    const mix = this.volume;
    this.layerGains = {ocean,wind,distantAir};
    ocean.gain.setValueAtTime(.72 * mix, this.context.currentTime);
    wind.gain.setValueAtTime(.28 * mix, this.context.currentTime);
    distantAir.gain.setValueAtTime(.045 * mix, this.context.currentTime);
    this.master.gain.setTargetAtTime(1, this.context.currentTime, .9);
    this.enabled = true;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (!this.context || !this.enabled || !this.layerGains) return;
    const now = this.context.currentTime;
    this.layerGains.ocean.gain.setTargetAtTime(.72 * this.volume, now, .15);
    this.layerGains.wind.gain.setTargetAtTime(.28 * this.volume, now, .15);
    this.layerGains.distantAir.gain.setTargetAtTime(.045 * this.volume, now, .15);
  }

  async stop() {
    if (!this.context || !this.enabled) return;
    const context = this.context;
    const master = this.master;
    this.enabled = false;
    master.gain.setTargetAtTime(0, context.currentTime, .18);
    await new Promise(resolve => setTimeout(resolve, 650));
    this.nodes.forEach(node => {
      try {
        if (typeof node.stop === "function") node.stop();
        node.disconnect();
      } catch {}
    });
    this.nodes = [];
    this.master = null;
    this.layerGains = null;
    await context.suspend();
  }
}

export function createShoreAmbience() {
  return new ShoreAmbience();
}
