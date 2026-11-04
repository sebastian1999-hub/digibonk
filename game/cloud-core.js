(function (root) {
  'use strict';
  const VERSION = '1.3.0';
  function username(value) {
    const name = String(value || '')
      .trim()
      .toLowerCase();
    if (!/^[a-z][a-z0-9_-]{2,23}$/.test(name)) throw new Error('USERNAME');
    return name;
  }
  function record(s, owner) {
    if (!s?.done || !owner || s.onlineOwner !== owner || s.cloudVersion !== VERSION) return null;
    const r = {
      id: s.id,
      score: Math.floor(s.score),
      time: Math.floor(s.time),
      kills: s.kills,
      level: s.level,
      species: s.player.species,
      version: VERSION,
      finished: true,
    };
    if (
      !r.id ||
      !Number.isSafeInteger(r.score) ||
      !Number.isSafeInteger(r.time) ||
      r.score < 0 ||
      r.score > 100000000 ||
      r.time < 0 ||
      r.time > 86400 ||
      !Number.isInteger(r.kills) ||
      !Number.isInteger(r.level)
    )
      return null;
    return r;
  }
  function loginEmail(value) {
    const input = String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase();
    if (input.includes('@')) {
      if (input.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input))
        throw new Error('USERNAME');
      return input;
    }
    return username(input) + '@players.digital-ranch.invalid';
  }
  class Queue {
    constructor(storage) {
      this.storage = storage;
      this.busy = false;
    }
    key(uid) {
      return 'digibonk.pending.v1:' + uid;
    }
    read(uid) {
      try {
        return JSON.parse(this.storage.getItem(this.key(uid))) || [];
      } catch {
        return [];
      }
    }
    write(uid, rows) {
      this.storage.setItem(this.key(uid), JSON.stringify(rows));
    }
    add(uid, run) {
      if (!uid || !run) return;
      const list = this.read(uid).filter((r) => r.id !== run.id);
      list.push(run);
      list.sort((a, b) => b.score - a.score || b.time - a.time);
      this.write(uid, list.slice(0, 20));
    }
    async flush(uid, send, isCurrent = () => true) {
      if (this.busy || !uid) return;
      this.busy = true;
      try {
        for (const run of this.read(uid)) {
          if (!isCurrent()) break;
          await send(run);
          const remaining = this.read(uid).filter((r) => r.id !== run.id);
          this.write(uid, remaining);
        }
      } finally {
        this.busy = false;
      }
    }
  }
  const api = { VERSION, username, loginEmail, record, Queue };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkCloudCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
