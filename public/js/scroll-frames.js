/**
 * Scroll-driven frame sequence animation.
 * Preloads 60 JPG frames and draws them to a canvas
 * based on scroll position within .scroll-frame-track.
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
  var currentFrame = 0
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
    // Once first frame is loaded, size the canvas and draw it
    if (loadedCount === 1) {
      sizeCanvas(frames[0])
      drawFrame(0)
    }
    if (loadedCount === TOTAL_FRAMES) {
      ready = true
      window.addEventListener('scroll', onScroll, { passive: true })
      // Draw current position in case user already scrolled during load
      updateFrame()
    }
  }

  function sizeCanvas(img) {
    // Use the native image dimensions for crisp rendering
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
  }

  function drawFrame(index) {
    var img = frames[index]
    if (!img || !img.complete) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
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

    // Map progress to frame index
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

  // Re-size canvas on window resize to keep it responsive
  window.addEventListener('resize', function () {
    if (frames[0] && frames[0].complete) {
      sizeCanvas(frames[0])
      drawFrame(currentFrame)
    }
  })
})()
