/**
 * Scroll-driven frame sequence animation.
 * Preloads 60 JPG frames and swaps an <img> src
 * based on scroll position within .scroll-frame-track.
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
  var currentFrame = 0
  var ticking = false
  var hintHidden = false

  // Derive the base path from the first frame's src (set in HTML)
  var basePath = img.src.replace(/frame_0001\.jpg$/, '')

  // Build all frame paths (1-indexed, 4-digit: frame_0001.jpg to frame_0060.jpg)
  var framePaths = []
  for (var i = 1; i <= TOTAL_FRAMES; i++) {
    var num = i < 10 ? '000' + i : (i < 100 ? '00' + i : (i < 1000 ? '0' + i : '' + i))
    framePaths.push(basePath + 'frame_' + num + '.jpg')
  }

  // Preload all frames into browser cache
  for (var j = 0; j < TOTAL_FRAMES; j++) {
    var preload = new Image()
    preload.src = framePaths[j]
  }

  // Start listening immediately - frame 1 is already set as img src
  window.addEventListener('scroll', onScroll, { passive: true })

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateFrame)
      ticking = true
    }
  }

  function updateFrame() {
    ticking = false

    var trackRect = track.getBoundingClientRect()
    var scrollRange = track.offsetHeight - sticky.offsetHeight
    if (scrollRange <= 0) return

    var scrolled = -trackRect.top
    var progress = Math.max(0, Math.min(1, scrolled / scrollRange))

    var frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES))

    if (frameIndex !== currentFrame) {
      img.src = framePaths[frameIndex]
      currentFrame = frameIndex
    }

    // Fade scroll hint
    if (!hintHidden && progress > 0.03 && hint) {
      hint.style.opacity = '0'
      hintHidden = true
    } else if (hintHidden && progress <= 0.01 && hint) {
      hint.style.opacity = ''
      hintHidden = false
    }
  }
})()
