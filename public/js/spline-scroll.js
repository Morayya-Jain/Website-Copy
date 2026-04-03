/**
 * Scroll-driven Spline 3D animation.
 * Uses the scene's default camera (don't override it).
 * Disables mouse interaction via HTML attributes.
 * Opens laptop lid on scroll down, closes on scroll up.
 */
;(function () {
  'use strict'

  var viewer = document.getElementById('spline-viewer')
  if (!viewer) return

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var hint = document.querySelector('.spline-scroll-hint')

  viewer.addEventListener('load', function () {
    var spline = viewer.spline
    if (!spline) return

    // Log all objects and their rotations
    var allObjects = spline.getAllObjects()
    allObjects.forEach(function (o) {
      console.log(o.name, 'rot:', o.rotation.x, o.rotation.y, o.rotation.z)
    })

    // Find the screen/lid
    var screenObj = spline.findObjectByName('Screen')
    if (!screenObj) {
      console.warn('Screen object not found')
      return
    }

    var openRotationX = screenObj.rotation.x
    console.log('Screen open rotation x:', openRotationX)

    if (reducedMotion) return

    // Start with lid closed
    screenObj.rotation.x = openRotationX + (90 * Math.PI / 180)
    setupScrollListener(screenObj, openRotationX)
  })

  function setupScrollListener(screenObj, openRotationX) {
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

      var trackRect = track.getBoundingClientRect()
      var scrollRange = track.offsetHeight - sticky.offsetHeight
      if (scrollRange <= 0) return

      var scrolled = -trackRect.top
      var progress = Math.max(0, Math.min(1, scrolled / scrollRange))

      screenObj.rotation.x = openRotationX + (90 * Math.PI / 180) * (1 - progress)

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
