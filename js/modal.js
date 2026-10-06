let trigger = null;
let background = [];
const modal = () => document.getElementById('modal');
const focusable = () => [...modal().querySelectorAll('a[href], button, [tabindex="0"]')].filter(el => !el.disabled);

export function showModal(content) {
  const dialog = modal();
  if (!dialog.classList.contains('open')) {
    trigger = document.activeElement;
    background = [...document.querySelectorAll('.site-header, main, footer')].map(el => [el, el.inert]);
    background.forEach(([el]) => { el.inert = true; });
  }
  document.getElementById('modalBody').innerHTML = content;
  dialog.classList.add('open');
  dialog.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  document.getElementById('modalClose').focus();
}

export function closeModal() {
  const dialog = modal();
  if (!dialog.classList.contains('open')) return;
  dialog.classList.remove('open');
  dialog.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  background.forEach(([el, inert]) => { el.inert = inert; });
  background = [];
  if (trigger?.isConnected) trigger.focus();
  trigger = null;
}

export function bindModal() {
  document.getElementById('modalClose').onclick = closeModal;
  modal().onclick = event => { if (event.target === modal()) closeModal(); };
  document.addEventListener('keydown', event => {
    if (!modal().classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
    if (event.key === 'Tab') {
      const items = focusable();
      const first = items[0], last = items[items.length - 1];
      if (!items.includes(document.activeElement)) {
        event.preventDefault(); first?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
}
