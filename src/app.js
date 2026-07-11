document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-platform]');
  if (!link || typeof window.gtag !== 'function') return;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const targetBlank = link.target === '_blank';
  let navigated = false;
  const navigateOnce = () => {
    if (navigated || targetBlank) return;
    navigated = true;
    window.location.href = link.href;
  };

  if (!targetBlank) event.preventDefault();

  window.gtag('event', 'select_platform', {
    platform: link.dataset.platform,
    song_slug: link.closest('[data-song-slug]')?.dataset.songSlug || '',
    link_url: link.href,
    outbound: true,
    transport_type: 'beacon',
    event_callback: navigateOnce,
    event_timeout: 800
  });

  if (!targetBlank) window.setTimeout(navigateOnce, 900);
});
