export function normalizeUiScale(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0.7, Math.min(1.3, value))
    : 1;
}

export function bindUiScale(settings, save) {
  const input = document.querySelector('#ui-scale'),
    output = document.querySelector('#ui-scale-value');
  const apply = (value) => {
    settings.uiScale = normalizeUiScale(value);
    const percent = Math.round(settings.uiScale * 100);
    input.value = String(percent);
    output.textContent = percent + ' %';
    document.documentElement.style.setProperty('--ui-scale', settings.uiScale);
    window.dispatchEvent(new Event('resize'));
  };
  apply(settings.uiScale);
  input.oninput = () => {
    apply(Number(input.value) / 100);
    save();
  };
  document.querySelector('#ui-scale-reset').onclick = () => {
    apply(1);
    save();
  };
}
