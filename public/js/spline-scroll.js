/**
 * Scroll-driven Spline 3D animation.
 * Placeholder - scene loads via <spline-viewer>, this script
 * will add scroll interaction once we confirm the scene renders.
 */
;(function () {
  'use strict'

  var viewer = document.getElementById('spline-viewer')
  if (!viewer) return

  viewer.addEventListener('load', function () {
    var spline = viewer.spline
    if (!spline) {
      console.warn('Spline: no spline instance found')
      return
    }

    var allObjects = spline.getAllObjects()
    console.log('Spline loaded. Objects:', allObjects.map(function (o) {
      return o.name + ' (rot: ' + Math.round(o.rotation.x * 180 / Math.PI) + ',' + Math.round(o.rotation.y * 180 / Math.PI) + ',' + Math.round(o.rotation.z * 180 / Math.PI) + ')'
    }))
  })
})()
