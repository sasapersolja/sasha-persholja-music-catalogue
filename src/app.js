document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-platform]');
  if (!link || typeof window.gtag !== 'function') return;

  window.gtag('event', 'select_platform', {
    platform: link.dataset.platform,
    song_slug: link.closest('[data-song-slug]')?.dataset.songSlug || '',
    link_url: link.href,
    transport_type: 'beacon'
  });
});
