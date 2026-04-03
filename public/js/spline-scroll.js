/**
 * Scroll-driven Spline 3D animation.
 * Centers the laptop, disables interaction, opens lid on scroll.
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

    // Log everything so we can debug
    var allObjects = spline.getAllObjects()
    allObjects.forEach(function (o) {
      console.log(o.name,
        'pos(' + Math.round(o.position.x) + ',' + Math.round(o.position.y) + ',' + Math.round(o.position.z) + ')',
        'rot(' + Math.round(o.rotation.x * 57.3) + ',' + Math.round(o.rotation.y * 57.3) + ',' + Math.round(o.rotation.z * 57.3) + ')')
    })

    // Adjust camera relative to its default - pull back and center
    var camera = spline.findObjectByName('Camera')
    if (camera) {
      console.log('Camera BEFORE:', camera.position.x, camera.position.y, camera.position.z)
      camera.position.x = 0
      camera.position.y = 50
      camera.position.z = camera.position.z * 3
      camera.rotation.x = -0.1
      camera.rotation.y = 0
      camera.rotation.z = 0
      console.log('Camera AFTER:', camera.position.x, camera.position.y, camera.position.z)
    }

    // Find the screen/lid
    var screenObj = spline.findObjectByName('Screen')
    if (!screenObj) {
      console.warn('Screen not found')
      return
    }

    var openRotationX = screenObj.rotation.x

    if (reducedMotion) return

    // Start closed
    screenObj.rotation.x = openRotationX + (90 * Math.PI / 180)
    setupScrollListener(screenObj, openRotationX)
  })

  function setupScrollListener(screenObj, openRotationX) {
    var track = document.getElementById('spline-scroll-track')
    var sticky = document.getElementById('spline-sticky')
    if (!track || !sticky) return

    var ticking = false
    var hintHidden = false

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
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
        })
        ticking = true
      }
    }, { passive: true })
  }
})()
