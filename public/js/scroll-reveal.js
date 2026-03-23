/**
 * Scroll-triggered reveal animations.
 * Uses IntersectionObserver to toggle .is-visible on .scroll-reveal elements.
 * Repeating: elements fade out when leaving and fade back in when re-entering.
 */
;(function () {
  'use strict'

  // Respect reduced motion: skip entirely so elements render at full opacity
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  // Mark that JS is handling scroll-reveal (CSS uses this as a qualifier
  // so content stays visible if this script fails to load).
  // IMPORTANT: This script must load synchronously (no defer/async) so
  // the attribute is set before first paint, preventing content flash.
  document.documentElement.setAttribute('data-scroll-reveal-init', '')

  // Fallback for browsers without IntersectionObserver
  if (!('IntersectionObserver' in window)) {
    document.addEventListener('DOMContentLoaded', function () {
      var elements = document.querySelectorAll('.scroll-reveal')
      for (var i = 0; i < elements.length; i++) {
        elements[i].classList.add('is-visible')
      }
    })
    return
  }

  function init() {
    var elements = document.querySelectorAll('.scroll-reveal')
    if (!elements.length) return

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i]
          if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
            // Fade in once 15% is visible
            entry.target.classList.add('is-visible')
          } else if (!entry.isIntersecting) {
            // Fade out only when completely out of viewport.
            // This prevents flicker from iOS Safari rubber-band bounce
            // and address bar show/hide toggling intersection state.
            entry.target.classList.remove('is-visible')
          }
        }
      },
      {
        threshold: [0, 0.15],
        rootMargin: '0px 0px -40px 0px'
      }
    )

    for (var i = 0; i < elements.length; i++) {
      observer.observe(elements[i])
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
