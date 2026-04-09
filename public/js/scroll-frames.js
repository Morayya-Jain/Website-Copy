/**
 * Scroll-driven frame sequence animation.
 * Preloads 60 JPG frames and draws them to a canvas
 * covering the full viewport, based on scroll position.
 */
;(function () {
  'use strict'

  var canvas = document.getElementById('scroll-frame-canvas')
  if (!canvas) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  var track = document.getElementById('scroll-frame-track')
  var sticky = document.getElementById('scroll-frame-sticky')
  var hint = document.getElementById('scroll-hint')
  if (!track || !sticky) return

  var ctx = canvas.getContext('2d')
  var TOTAL_FRAMES = 60
  var frames = []
  var loadedCount = 0
  var currentFrame = -1
  var ticking = false
  var hintHidden = false
  var ready = false

  // Build frame paths
  function framePath(i) {
    var num = i < 10 ? '00' + i : (i < 100 ? '0' + i : '' + i)
    return '/assets/frames/frame_' + num + '.jpg'
  }

  // Preload all frames
  for (var i = 0; i < TOTAL_FRAMES; i++) {
    var img = new Image()
    img.src = framePath(i)
    img.onload = onFrameLoad
    frames.push(img)
  }

  function onFrameLoad() {
    loadedCount++
    if (loadedCount === 1) {
      sizeCanvas()
      drawFrame(0)
    }
    if (loadedCount === TOTAL_FRAMES) {
      ready = true
      window.addEventListener('scroll', onScroll, { passive: true })
      updateFrame()
    }
  }

  function sizeCanvas() {
    // Match canvas pixels to the viewport for full-bleed drawing
    var dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  /**
   * Draw a frame covering the full canvas (object-fit: cover).
   */
  function drawFrame(index) {
    var img = frames[index]
    if (!img || !img.complete) return

    var cw = window.innerWidth
    var ch = window.innerHeight
    var iw = img.naturalWidth
    var ih = img.naturalHeight

    // Calculate cover dimensions
    var scale = Math.max(cw / iw, ch / ih)
    var dw = iw * scale
    var dh = ih * scale
    var dx = (cw - dw) / 2
    var dy = (ch - dh) / 2

    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, dx, dy, dw, dh)
    currentFrame = index
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateFrame)
      ticking = true
    }
  }

  function updateFrame() {
    ticking = false
    if (!ready) return

    var trackRect = track.getBoundingClientRect()
    var scrollRange = track.offsetHeight - sticky.offsetHeight
    if (scrollRange <= 0) return

    var scrolled = -trackRect.top
    var progress = Math.max(0, Math.min(1, scrolled / scrollRange))

    var frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES))

    if (frameIndex !== currentFrame) {
      drawFrame(frameIndex)
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

  window.addEventListener('resize', function () {
    sizeCanvas()
    if (currentFrame >= 0) {
      drawFrame(currentFrame)
    }
  })
})()
