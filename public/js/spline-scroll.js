/**
 * Scroll-driven Spline 3D animation.
 * Adjusts camera to fit laptop in view, then maps scroll position
 * to the laptop Screen object rotation (open/close lid).
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

    var allObjects = spline.getAllObjects()
    console.log('Spline objects:', allObjects.map(function (o) {
      return o.name + ' pos(' + Math.round(o.position.x) + ',' + Math.round(o.position.y) + ',' + Math.round(o.position.z) + ') rot(' + Math.round(o.rotation.x * 180 / Math.PI) + ',' + Math.round(o.rotation.y * 180 / Math.PI) + ',' + Math.round(o.rotation.z * 180 / Math.PI) + ')'
    }))

    // Pull camera back to see the full laptop
    var camera = spline.findObjectByName('Camera')
    if (camera) {
      camera.position.z = camera.position.z + 800
      console.log('Camera adjusted to z:', camera.position.z)
    }

    var screenObj = spline.findObjectByName('Screen')
    if (!screenObj) {
      console.warn('Screen object not found')
      return
    }

    var openRotationX = screenObj.rotation.x

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
