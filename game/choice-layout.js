// Fit the complete choice interface, including seller rewards, inside the viewport.
export function installChoiceFitter(overlay) {
  const shell = overlay.querySelector('.choice-shell');
  let queued = false;
  const fit = () => {
    queued = false;
    if (overlay.hidden) return;
    const availableWidth = Math.max(1, overlay.clientWidth - 24),
      availableHeight = Math.max(1, overlay.clientHeight - 24),
      width = Math.max(shell.offsetWidth, shell.scrollWidth),
      height = Math.max(shell.offsetHeight, shell.scrollHeight),
      preferred = Number(document.documentElement.style.getPropertyValue('--ui-scale')) || 1,
      scale = Math.min(preferred, availableWidth / width, availableHeight / height);
    shell.style.setProperty('--choice-scale', scale);
  };
  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(fit);
    }
  };
  new ResizeObserver(schedule).observe(shell);
  window.addEventListener('resize', schedule);
  return schedule;
}
