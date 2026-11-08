const $ = (s) => document.querySelector(s),
  Core = window.DigibonkCloudCore;
export class Cloud {
  constructor() {
    this.user = null;
    this.member = null;
    this.epoch = 0;
    this.queue = new Core.Queue(localStorage);
    this.lastRefresh = 0;
    this.busy = false;
    this.client = null;
    this.onChange = () => {};
    this.onRewards = () => {};
    this.onBeforeChange = () => {};
    this.portraits = [];
    this.bind();
  }
  status(text) {
    $('#cloud-status').textContent = text;
  }
  bind() {
    $('#login-form').onsubmit = async (e) => {
      e.preventDefault();
      if (this.busy || !this.client) return;
      this.busy = true;
      $('#login-submit').disabled = true;
      this.status('Iniciando sesión…');
      try {
        const email = Core.loginEmail($('#login-username').value),
          password = $('#login-password').value;
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        $('#login-password').value = '';
        if (error) throw error;
        await this.apply(data.user);
      } catch (error) {
        this.status(this.error(error));
      } finally {
        this.busy = false;
        $('#login-submit').disabled = false;
      }
    };
    $('#cloud-signout').onclick = async () => {
      this.onBeforeChange();
      try {
        const { error } = await this.client.auth.signOut({ scope: 'local' });
        if (error) throw error;
        await this.apply(null);
      } catch (error) {
        this.status(this.error(error));
      }
    };
    $('#leaderboard-refresh').onclick = () => void this.refresh();
    window.addEventListener('online', () => {
      if (this.user) void this.refresh();
    });
  }
  error(e) {
    if (e?.message === 'USERNAME')
      return 'Escribe tu usuario del grupo o el correo completo de tu cuenta.';
    if (e?.code === 'invalid_credentials') return 'Usuario o contraseña incorrectos.';
    if (e?.code === '42501') return 'Esta cuenta no pertenece al grupo activo.';
    if (['PGRST202', '42P01'].includes(e?.code))
      return 'La clasificación todavía no está disponible en el servidor.';
    if (e?.status === 429) return 'Demasiados intentos. Espera un momento.';
    return 'No se pudo conectar. Tu partida y los resultados pendientes siguen guardados en este PC.';
  }
  async initialize() {
    try {
      const config = window.DWC_CLOUD_CONFIG;
      this.client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          storageKey: 'digibonk-auth-v1',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        global: {
          fetch: async (url, options = {}) => {
            const controller = new AbortController(),
              timer = setTimeout(() => controller.abort(), 12000);
            const abort = () => controller.abort();
            options.signal?.addEventListener('abort', abort, { once: true });
            try {
              if (options.signal?.aborted) controller.abort();
              return await fetch(url, { ...options, signal: controller.signal });
            } finally {
              clearTimeout(timer);
              options.signal?.removeEventListener('abort', abort);
            }
          },
        },
      });
      this.client.auth.onAuthStateChange((event, session) => {
        if (['SIGNED_OUT', 'SIGNED_IN', 'USER_UPDATED'].includes(event))
          setTimeout(() => {
            if ((session?.user?.id || null) !== (this.user?.id || null))
              void this.apply(session?.user || null);
          }, 0);
      });
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      await this.apply(data.session?.user || null);
    } catch (e) {
      this.status(this.error(e));
    } finally {
      $('#login-submit').disabled = !this.client;
    }
  }
  async apply(user) {
    if (user?.id && this.user?.id === user.id) {
      void this.refresh();
      return;
    }
    const epoch = ++this.epoch;
    let member = null;
    if (user) {
      try {
        const { data, error } = await this.client.rpc('dwc_my_membership');
        if (error) throw error;
        member = data?.[0];
        if (!member?.active) throw { code: '42501' };
      } catch (error) {
        if (epoch === this.epoch) this.status(this.error(error));
        return;
      }
    }
    if (epoch !== this.epoch) return;
    this.onBeforeChange();
    this.user = user;
    this.member = member;
    $('#login-form').hidden = !!user;
    $('#signed-account').hidden = !user;
    $('#leaderboard').hidden = !user;
    $('#cloud-identity').textContent = member ? 'Conectado como ' + member.display_name : '';
    this.onChange(user?.id || null);
    this.status(
      user
        ? 'Cargando clasificación…'
        : 'Entra con tu usuario del grupo o el correo completo de tu cuenta y su contraseña.',
    );
    if (user) await this.refresh();
    else {
      $('#leaderboard-list').replaceChildren();
      this.portraits = [];
    }
  }
  finish(state) {
    const uid = this.user?.id,
      record = Core.record(state, uid);
    if (!record) return;
    try {
      this.queue.add(uid, record);
      void this.refresh();
    } catch {
      this.status('No se pudo guardar el resultado pendiente en este PC.');
    }
  }
  async refresh() {
    const user = this.user;
    if (!user || !this.client) return;
    const epoch = this.epoch;
    $('#leaderboard-refresh').disabled = true;
    try {
      const account = await this.client.auth.getUser();
      if (this.epoch !== epoch) return;
      if (!account.error && account.data.user?.id === user.id)
        this.onRewards(user.id, account.data.user.app_metadata?.digibonk_rewards);
      await this.queue.flush(
        user.id,
        async (run) => {
          const { error } = await this.client.rpc('digibonk_submit_run', { p_run: run });
          if (error) throw error;
        },
        () => this.user?.id === user.id && this.epoch === epoch,
      );
      if (this.epoch !== epoch) return;
      const { data, error } = await this.client.rpc('digibonk_leaderboard');
      if (error) throw error;
      if (this.epoch !== epoch) return;
      this.render(data || []);
      const pending = this.queue.read(user.id).length;
      this.status(
        pending
          ? 'Hay resultados pendientes de envío.'
          : 'Clasificación semanal · mejor partida de cada jugador esta semana',
      );
      this.lastRefresh = Date.now();
    } catch (error) {
      if (epoch === this.epoch) this.status(this.error(error));
    } finally {
      if (epoch === this.epoch) $('#leaderboard-refresh').disabled = false;
    }
  }
  render(rows) {
    this.portraits = [];
    const list = $('#leaderboard-list');
    list.replaceChildren();
    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'empty-board';
      p.textContent =
        'Aún no hay récords esta semana. Termina una partida con la sesión iniciada para estrenar la clasificación.';
      list.append(p);
      return;
    }
    for (const row of rows) {
      const item = document.createElement('li');
      item.className = 'leader-row' + (row.username === this.member?.username ? ' own-record' : '');
      const rank = document.createElement('b');
      rank.textContent = String(row.rank).padStart(2, '0');
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 72;
      canvas.setAttribute('aria-label', row.species);
      const text = document.createElement('div'),
        name = document.createElement('strong'),
        details = document.createElement('small'),
        score = document.createElement('span');
      name.textContent = row.display_name;
      details.textContent =
        row.species +
        ' · ' +
        Math.floor(row.survival_seconds / 60) +
        ':' +
        String(row.survival_seconds % 60).padStart(2, '0');
      score.textContent = Number(row.score).toLocaleString('es-ES');
      text.append(name, details);
      item.append(rank, canvas, text, score);
      list.append(item);
      this.portraits.push({ canvas, species: row.species });
    }
  }
  draw(time) {
    for (const { canvas, species } of this.portraits) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.DigiSprites.drawGrounded(ctx, species, 'idle', 40, 66, 56, time);
    }
  }
  tick(home, time) {
    if (home) {
      this.draw(time);
      if (this.user && Date.now() - this.lastRefresh > 45000) {
        this.lastRefresh = Date.now();
        void this.refresh();
      }
    }
  }
}
