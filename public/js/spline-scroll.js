/**
 * Scroll-driven Spline 3D animation.
 * Waits for scene to fully render before attempting any manipulation.
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

    // Wait for the scene's built-in start animation to finish
    // before we take over control
    setTimeout(function () {
      var allObjects = spline.getAllObjects()
      allObjects.forEach(function (o) {
        console.log(o.name,
          'pos(' + Math.round(o.position.x) + ',' + Math.round(o.position.y) + ',' + Math.round(o.position.z) + ')',
          'rot(' + Math.round(o.rotation.x * 57.3) + ',' + Math.round(o.rotation.y * 57.3) + ',' + Math.round(o.rotation.z * 57.3) + ')')
      })

      var screenObj = spline.findObjectByName('Screen')
      if (!screenObj) {
        console.warn('Screen not found')
        return
      }

      var openRotationX = screenObj.rotation.x
      console.log('Screen openRotationX:', openRotationX)

      if (reducedMotion) return

      // Close the lid
      screenObj.rotation.x = openRotationX + (90 * Math.PI / 180)
      setupScrollListener(screenObj, openRotationX)
    }, 2000)
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
