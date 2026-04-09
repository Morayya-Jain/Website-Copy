/**
 * Scroll-driven frame sequence animation.
 * Preloads all 60 frames, then swaps <img> src on scroll
 * for instant, flicker-free frame changes.
 */
;(function () {
  'use strict'

  var img = document.getElementById('scroll-frame-img')
  if (!img) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  var track = document.getElementById('scroll-frame-track')
  var sticky = document.getElementById('scroll-frame-sticky')
  var hint = document.getElementById('scroll-hint')
  if (!track || !sticky) return

  var TOTAL_FRAMES = 60
  var currentFrame = -1
  var ticking = false
  var hintHidden = false

  // Derive base path from the img src set in HTML
  var basePath = img.src.replace(/frame_0001\.jpg.*$/, '')

  // Build frame paths (1-indexed, 4-digit)
  var framePaths = []
  for (var i = 1; i <= TOTAL_FRAMES; i++) {
    var num = i < 10 ? '000' + i : (i < 100 ? '00' + i : '0' + i)
    framePaths.push(basePath + 'frame_' + num + '.jpg')
  }

  // Preload every frame as an Image object so the browser caches them
  var images = []
  var loaded = 0
  for (var j = 0; j < TOTAL_FRAMES; j++) {
    var pre = new Image()
    pre.onload = pre.onerror = onLoad
    pre.src = framePaths[j]
    images.push(pre)
  }

  function onLoad() {
    loaded++
    // Start scroll listener as soon as all frames are cached
    if (loaded === TOTAL_FRAMES) {
      window.addEventListener('scroll', onScroll, { passive: true })
      // Draw current scroll position immediately
      update()
    }
  }

  // Also listen right away so it works even if some frames are slow
  window.addEventListener('scroll', onScroll, { passive: true })

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update)
      ticking = true
    }
  }

  function update() {
    ticking = false

    var rect = track.getBoundingClientRect()
    var range = track.offsetHeight - window.innerHeight
    if (range <= 0) return

    var scrolled = -rect.top
    var progress = Math.max(0, Math.min(1, scrolled / range))
    var frameIndex = Math.min(TOTAL_FRAMES - 1, Math.round(progress * (TOTAL_FRAMES - 1)))

    if (frameIndex !== currentFrame) {
      img.src = framePaths[frameIndex]
      currentFrame = frameIndex
    }

    // Fade scroll hint
    if (!hintHidden && progress > 0.02 && hint) {
      hint.style.opacity = '0'
      hintHidden = true
    } else if (hintHidden && progress <= 0.01 && hint) {
      hint.style.opacity = ''
      hintHidden = false
    }
  }
})()
