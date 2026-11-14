import { ChestCarousel } from './chest-carousel.js';
const C = window.DigibonkCore,
  demo = document.querySelector('#demo'),
  carousel = new ChestCarousel(demo);
let run;
for (const [egg, [name, description]] of Object.entries(C.eggPassives)) {
  const card = document.createElement('article'),
    icon = document.createElement('img'),
    title = document.createElement('strong'),
    text = document.createElement('p');
  icon.src = 'assets/passives/' + egg + '.svg';
  icon.alt = egg;
  title.textContent = egg + ' · ' + name;
  text.textContent = description;
  card.append(icon, title, text);
  document.querySelector('#icons').append(card);
}
for (const src of [
  'data-card-1.svg',
  'data-card-2.svg',
  'data-card-3.svg',
  'data-card-4.svg',
  'collector-basic.png',
  'collector-evolved.png',
]) {
  const img = document.createElement('img');
  img.src = 'assets/' + src;
  img.alt = src;
  document.querySelector('#sprites').append(img);
}
Promise.all([...document.images].map((img) => img.decode()))
  .then(
    () => (document.querySelector('#assets').textContent = '18 recursos cargados correctamente.'),
  )
  .catch(() => (document.querySelector('#assets').textContent = 'Error al cargar un recurso.'));
function showWheel() {
  carousel.show(
    run.s.choice,
    {
      canRisk: () => false,
      stop: (token, position) => {
        if (run.stopChestWheel(token, position)) {
          sessionStorage.setItem('passive-preview-wheel', JSON.stringify(run.snapshot()));
          showWheel();
        }
      },
      claim: (id) => {
        run.choose(id);
        sessionStorage.removeItem('passive-preview-wheel');
        carousel.clear();
        demo.textContent = 'Recompensa recogida en la simulación.';
      },
      discard: () => {
        sessionStorage.removeItem('passive-preview-wheel');
        carousel.clear();
        demo.textContent = 'Prueba terminada.';
      },
    },
    [],
  );
}
document.querySelector('#wheel').onclick = () => {
  run = new C.Run('YukimiBotamon', { seed: 17 });
  run.s.hatch = 0;
  run.s.choice = run.chestChoices();
  showWheel();
};
document.querySelector('#refresh').onclick = () => {
  carousel.clear();
  run = new C.Run('Choromon', { seed: 33 });
  run.s.hatch = 0;
  run.s.choice = run.choices();
  const show = () => {
    demo.replaceChildren();
    const text = document.createElement('p');
    text.textContent = run.passiveInfo();
    demo.append(text);
    for (const card of run.s.choice.cards) {
      const p = document.createElement('p');
      p.textContent = card.rarity + ' · ' + card.title + ' · ' + card.text;
      demo.append(p);
    }
    const button = document.createElement('button');
    button.textContent = 'Renovar tarjetas';
    button.disabled = !run.canRefreshLevel();
    button.onclick = () => {
      run.refreshLevel();
      show();
    };
    demo.append(button);
  };
  show();
};
const saved = sessionStorage.getItem('passive-preview-wheel');
if (saved) {
  run = new C.Run(null, { saved: JSON.parse(saved) });
  showWheel();
}
