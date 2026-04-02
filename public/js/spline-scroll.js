/**
 * Scroll-driven Spline 3D animation.
 * Waits for the <spline-viewer> to load, then maps scroll position
 * to the laptop Screen object rotation (open/close lid).
 */
;(function () {
  'use strict'

  var viewer = document.getElementById('spline-viewer')
  if (!viewer) return

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var hint = document.querySelector('.spline-scroll-hint')
  var screenObj = null
  var openRotationX = 0

  function degToRad(deg) {
    return deg * (Math.PI / 180)
  }

  viewer.addEventListener('load', function (e) {
    var spline = viewer.spline || (e.detail && e.detail.spline)
    if (!spline) return

    screenObj = spline.findObjectByName('Screen')
    if (!screenObj) return

    // Record the scene's default rotation as "open"
    openRotationX = screenObj.rotation.x

    if (reducedMotion) return

    // Start closed (lid rotated 90 degrees from open)
    screenObj.rotation.x = openRotationX + degToRad(90)
    setupScrollListener()
  })

  function setupScrollListener() {
    var track = document.getElementById('spline-scroll-track')
    var sticky = document.getElementById('spline-sticky')
    if (!track || !sticky) return

    var ticking = false
    var hintHidden = false

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateProgress)
        ticking = true
      }
    }

    function updateProgress() {
      ticking = false
      if (!screenObj) return

      var trackRect = track.getBoundingClientRect()
      var scrollRange = track.offsetHeight - sticky.offsetHeight
      if (scrollRange <= 0) return

      var scrolled = -trackRect.top
      var progress = Math.max(0, Math.min(1, scrolled / scrollRange))

      // Interpolate: closed (progress=0) -> open (progress=1)
      screenObj.rotation.x = openRotationX + degToRad(90) * (1 - progress)

      if (!hintHidden && progress > 0.05 && hint) {
        hint.style.opacity = '0'
        hintHidden = true
      } else if (hintHidden && progress <= 0.02 && hint) {
        hint.style.opacity = ''
        hintHidden = false
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
  }
})()
