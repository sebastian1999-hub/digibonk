(function (root) {
  'use strict';
  const defaults = {
    up: ['w', 'arrowup'],
    down: ['s', 'arrowdown'],
    left: ['a', 'arrowleft'],
    right: ['d', 'arrowright'],
    dash: [' ', ''],
    interact: ['e', ''],
    special: ['q', ''],
    pause: ['p', ''],
    map: ['m', ''],
  };
  const names = {
    up: 'Mover arriba',
    down: 'Mover abajo',
    left: 'Mover a la izquierda',
    right: 'Mover a la derecha',
    dash: 'Esquivar',
    interact: 'Interactuar',
    special: 'Habilidad de evolución',
    pause: 'Pausar',
    map: 'Abrir / cerrar mapa',
  };
  const labels = {
    ' ': 'Espacio',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    shiftleft: 'Mayús izq.',
    shiftright: 'Mayús der.',
  };
  function token(event) {
    const code = event.code || '';
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (code === 'Space') return ' ';
    if (code) return code.toLowerCase();
    return String(event.key || '').toLowerCase();
  }
  function allowed(key) {
    return /^[a-z0-9]$/.test(key) || Object.hasOwn(labels, key) || /^numpad[0-9]$/.test(key);
  }
  class InputState extends Set {
    constructor(saved = {}) {
      super();
      this.held = new Set();
      this.bindings = structuredClone(defaults);
      if (saved && typeof saved === 'object') {
        const candidate = { ...structuredClone(defaults), ...saved },
          used = new Set();
        if (!saved.map) {
          const occupied = new Set(Object.values(saved).filter(Array.isArray).flat());
          candidate.map = [
            ['m', 'n', 'b', 'v', 'c', 'x', 'z'].find((k) => !occupied.has(k)) || '0',
            '',
          ];
        }
        let valid = true;
        for (const action of Object.keys(defaults)) {
          const pair = candidate[action];
          if (!Array.isArray(pair) || pair.length !== 2 || !pair[0]) {
            valid = false;
            break;
          }
          for (const key of pair) {
            if (key && (!allowed(key) || used.has(key))) {
              valid = false;
              break;
            }
            if (key) used.add(key);
          }
        }
        if (valid) this.bindings = structuredClone(candidate);
      }
    }
    track(event) {
      this.held.add(token(event));
    }
    suspend() {
      super.clear();
    }
    clear() {
      super.clear();
      this.held.clear();
    }
    restoreMovement() {
      for (const action of ['up', 'down', 'left', 'right'])
        for (const key of this.bindings[action]) if (key && this.held.has(key)) this.add(key);
    }
    down(event) {
      this.track(event);
      this.add(token(event));
    }
    up(event) {
      this.held.delete(token(event));
      this.delete(token(event));
    }
    actionFor(event) {
      const key = token(event);
      return Object.keys(defaults).find((a) => this.bindings[a].includes(key)) || null;
    }
    pressed(action) {
      return this.bindings[action].some((k) => k && this.has(k));
    }
    label(action) {
      return this.bindings[action].filter(Boolean).map(InputState.keyLabel).join(' / ');
    }
    bind(action, slot, event) {
      const key = typeof event === 'string' ? event : token(event);
      if (!defaults[action] || ![0, 1].includes(slot))
        return { ok: false, message: 'Acción no válida.' };
      if (!key && slot === 1) {
        this.bindings[action][slot] = '';
        this.clear();
        return { ok: true };
      }
      if (!allowed(key))
        return {
          ok: false,
          message: 'Usa una letra, número, flecha, Espacio o Mayús. Esc cancela.',
        };
      for (const a of Object.keys(defaults))
        for (let i = 0; i < 2; i++)
          if (this.bindings[a][i] === key && (a !== action || i !== slot))
            return {
              ok: false,
              message:
                InputState.keyLabel(key) +
                ' ya está asignada a ' +
                names[a] +
                '. Cambia esa asignación primero.',
            };
      this.bindings[action][slot] = key;
      this.clear();
      return { ok: true };
    }
    resetBindings() {
      this.bindings = structuredClone(defaults);
      this.clear();
    }
    resumeMovement() {
      this.restoreMovement();
      const movement = new Set(['up', 'down', 'left', 'right'].flatMap((a) => this.bindings[a]));
      for (const key of this) if (!movement.has(key)) this.delete(key);
    }
    static keyLabel(key) {
      return labels[key] || (/^numpad/.test(key) ? 'Num ' + key.slice(6) : key.toUpperCase());
    }
  }
  InputState.defaults = defaults;
  InputState.names = names;
  InputState.token = token;
  if (typeof module !== 'undefined') module.exports = InputState;
  else root.DigibonkInput = InputState;
})(typeof window !== 'undefined' ? window : globalThis);
