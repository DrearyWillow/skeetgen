window.showAltText = function (text) {
  const overlay = document.getElementById('alt-text-overlay');
  const content = document.getElementById('alt-text-content');
  if (!overlay || !content) return;
  content.textContent = text;
  overlay.classList.remove('AltTextOverlay--hidden');
};

window.hideAltText = function () {
  const overlay = document.getElementById('alt-text-overlay');
  if (!overlay) return;
  overlay.classList.add('AltTextOverlay--hidden');
};

document.addEventListener('click', e => {
  const overlay = document.getElementById('alt-text-overlay');
  if (e.target === overlay) overlay.classList.add('AltTextOverlay--hidden');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideAltText();
});
