/**
 * Scroll-driven video playback.
 * Maps scroll position within .scroll-video-track to the video
 * currentTime, so scrolling down plays forward and scrolling up
 * plays in reverse.
 */
;(function () {
  'use strict'

  var video = document.getElementById('scroll-video')
  if (!video) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  var track = document.getElementById('scroll-video-track')
  var sticky = document.getElementById('scroll-video-sticky')
  var hint = document.getElementById('scroll-hint')
  if (!track || !sticky) return

  var ticking = false
  var hintHidden = false
  var duration = 0

  // Wait for video metadata to load so we know the duration
  function onReady() {
    duration = video.duration
    if (!duration || isNaN(duration)) return

    // Set to first frame
    video.currentTime = 0
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  if (video.readyState >= 1) {
    onReady()
  } else {
    video.addEventListener('loadedmetadata', onReady)
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateFrame)
      ticking = true
    }
  }

  function updateFrame() {
    ticking = false
    if (!duration) return

    var trackRect = track.getBoundingClientRect()
    var scrollRange = track.offsetHeight - sticky.offsetHeight
    if (scrollRange <= 0) return

    var scrolled = -trackRect.top
    var progress = Math.max(0, Math.min(1, scrolled / scrollRange))

    // Map scroll progress to video time
    video.currentTime = progress * duration

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
