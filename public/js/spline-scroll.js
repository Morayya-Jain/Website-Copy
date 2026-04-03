/**
 * Scroll-driven Spline 3D animation.
 * Positions camera straight-on facing the laptop, starts closed,
 * opens the lid as user scrolls down.
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

    // Log all objects for debugging
    var allObjects = spline.getAllObjects()
    console.log('Spline objects:', allObjects.map(function (o) {
      return o.name
    }))

    // Position camera straight-on, looking at the laptop from the front
    var camera = spline.findObjectByName('Camera')
    if (camera) {
      // Straight-on view: centered, slightly above, pulled back
      camera.position.x = 0
      camera.position.y = 100
      camera.position.z = 1200
      camera.rotation.x = 0
      camera.rotation.y = 0
      camera.rotation.z = 0
      console.log('Camera set to front view')
    }

    // Find the Macbook group and reset its rotation so it faces straight
    var macbook = spline.findObjectByName('Macbook')
    if (macbook) {
      macbook.rotation.x = 0
      macbook.rotation.y = 0
      macbook.rotation.z = 0
    }

    // Find the screen/lid
    var screenObj = spline.findObjectByName('Screen')
    if (!screenObj) {
      console.warn('Screen object not found in scene')
      return
    }

    console.log('Screen default rotation x:', screenObj.rotation.x)
    var openRotationX = screenObj.rotation.x

    if (reducedMotion) return

    // Start with lid closed (rotated 90 degrees shut)
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

      // Closed (progress=0) -> Open (progress=1)
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
