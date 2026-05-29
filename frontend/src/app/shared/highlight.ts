// Podświetla fragment tekstu pasujący do query przez owinięcie w <strong> z kolorem.
// escapeHtml zabezpiecza przed XSS - używane w [innerHTML] w location-picker i tech-picker.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function highlightMatch(name: string, query: string, color: string): string {
  const q = query.trim();
  if (!q) return escapeHtml(name);
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(name);
  return (
    escapeHtml(name.slice(0, idx)) +
    `<strong style="color:${color};font-weight:700">${escapeHtml(name.slice(idx, idx + q.length))}</strong>` +
    escapeHtml(name.slice(idx + q.length))
  );
}
