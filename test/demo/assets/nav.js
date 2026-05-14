(() => {
  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.topbar')) return;

    const title = document.title ? escapeHtml(document.title) : 'Demo';
    const topbar = document.createElement('div');
    topbar.className = 'topbar';
    topbar.innerHTML = `<a href="/test/demo/">← All demos</a><span class="title">${title}</span>`;
    document.body.prepend(topbar);
    document.body.classList.add('with-topbar');
  });
})();
