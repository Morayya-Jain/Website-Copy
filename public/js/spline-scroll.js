/**
 * Scroll-driven Spline 3D animation.
 * Maps scroll position within the .spline-scroll-track to the laptop
 * Screen object rotation, opening/closing the lid as you scroll.
 */
;(function () {
  'use strict'

  var wrapper = document.getElementById('spline-scroll-wrapper')
  if (!wrapper) return

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  var SCENE_URL = 'https://prod.spline.design/MscmfVQqaOCiTGvA/scene.splinecode'

  var canvas = document.getElementById('spline-canvas')
  if (!canvas) return

  var splineApp = null
  var screenObj = null
  var hint = document.querySelector('.spline-scroll-hint')

  // The lid rotation range (X axis): closed -> open
  var LID_CLOSED_X = -90  // degrees - lid flat/closed
  var LID_OPEN_X = 0      // degrees - lid fully open

  function degToRad(deg) {
    return deg * (Math.PI / 180)
  }

  import('https://unpkg.com/@splinetool/runtime@1.9.30/build/runtime.js')
    .then(function (module) {
      var Application = module.Application
      splineApp = new Application(canvas)
      return splineApp.load(SCENE_URL)
    })
    .then(function () {
      wrapper.classList.add('spline-loaded')

      screenObj = splineApp.findObjectByName('Screen')

      if (!screenObj) {
        console.warn('Spline: "Screen" object not found in scene')
        return
      }

      // Record the initial rotation as the "open" state
      LID_OPEN_X = screenObj.rotation.x

      if (reducedMotion) {
        // Show laptop open
        return
      }

      // Start with lid closed
      screenObj.rotation.x = LID_OPEN_X + degToRad(90)
      setupScrollListener()
    })
    .catch(function (err) {
      console.warn('Spline scene failed to load:', err)
      wrapper.classList.add('spline-fallback')
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

      // Interpolate rotation: closed (progress=0) -> open (progress=1)
      // closed = LID_OPEN_X + 90deg, open = LID_OPEN_X
      screenObj.rotation.x = LID_OPEN_X + degToRad(90) * (1 - progress)

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
