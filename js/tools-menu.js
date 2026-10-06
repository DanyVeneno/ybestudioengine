export function setupTools(tools, onOpen) {
  const orbit = document.getElementById('orbit');
  if (!orbit) return;
  orbit.classList.add('orbit-expanded');
  orbit.querySelectorAll('.tool-node').forEach(node => node.remove());
  tools.forEach((tool, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / tools.length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'node tool-node';
    button.style.left = (50 + 47 * Math.cos(angle)) + '%';
    button.style.top = (50 + 47 * Math.sin(angle)) + '%';
    button.dataset.tool = tool.id;
    button.textContent = tool.title;
    button.setAttribute('aria-label', tool.title + ': ver información');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'modal');
    button.onclick = () => onOpen(tool);
    orbit.appendChild(button);
  });
  document.querySelector('.orbit-note').textContent = `8 dimensiones + ${tools.length} herramientas · un solo ecosistema`;
}
