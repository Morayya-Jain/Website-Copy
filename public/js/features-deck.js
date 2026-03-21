/**
 * Features Deck - Stacked card interaction.
 * All cards start tilted in stack. Front card is always green.
 * Click picks a card (centers, flattens, bigger). Click outside to dismiss.
 * Description text always visible but blurred; clears on hover/active.
 */
;(function () {
  'use strict'

  var DESKTOP_OFFSETS = [
    { x: -100, y: 0   },
    { x: -30,  y: 50  },
    { x: 40,   y: 100 },
    { x: 110,  y: 150 }
  ]
  var DESKTOP_ACTIVE = { x: 0, y: -20 }

  var MOBILE_OFFSETS = [
    { x: -60, y: 0  },
    { x: -20, y: 30 },
    { x: 20,  y: 60 },
    { x: 60,  y: 90 }
  ]
  var MOBILE_ACTIVE = { x: 0, y: -15 }

  var cards = []
  var activeIndex = -1

  function isMobile() {
    return window.innerWidth < 768
  }

  function getOffsets() {
    return isMobile() ? MOBILE_OFFSETS : DESKTOP_OFFSETS
  }

  function getActivePos() {
    return isMobile() ? MOBILE_ACTIVE : DESKTOP_ACTIVE
  }

  /**
   * Recompute positions. Active card goes to center-front.
   * The highest z-index inactive card gets the 'deck-front' class (always green).
   */
  function updateDeck() {
    var offsets = getOffsets()
    var activePos = getActivePos()
    var totalCards = cards.length
    var positionIndex = 0
    var hasActive = activeIndex >= 0
    var highestInactivePos = -1

    for (var i = 0; i < totalCards; i++) {
      var card = cards[i]
      var desc = card.querySelector('p')

      card.classList.remove('deck-front')

      if (i === activeIndex) {
        card.style.setProperty('--deck-offset-x', activePos.x + 'px')
        card.style.setProperty('--deck-offset-y', activePos.y + 'px')
        card.style.setProperty('--deck-z', String(totalCards + 1))
        card.classList.add('active')
        card.setAttribute('aria-pressed', 'true')
        card.setAttribute('tabindex', '0')
        if (desc) desc.removeAttribute('aria-hidden')
      } else {
        var offset = offsets[positionIndex] || offsets[offsets.length - 1]
        card.style.setProperty('--deck-offset-x', offset.x + 'px')
        card.style.setProperty('--deck-offset-y', offset.y + 'px')
        card.style.setProperty('--deck-z', String(positionIndex + 1))
        card.classList.remove('active')
        card.setAttribute('aria-pressed', 'false')
        card.setAttribute('tabindex', hasActive ? '-1' : '0')
        if (desc) desc.setAttribute('aria-hidden', 'true')
        highestInactivePos = i
        positionIndex++
      }
    }

    // Mark the front card of the stack (highest z inactive) as 'deck-front'
    if (highestInactivePos >= 0) {
      cards[highestInactivePos].classList.add('deck-front')
    }
  }

  function toggleCard(index) {
    if (index === activeIndex) {
      activeIndex = -1
    } else {
      activeIndex = index
    }
    updateDeck()
  }

  function deactivate() {
    if (activeIndex >= 0) {
      activeIndex = -1
      updateDeck()
    }
  }

  function init() {
    var deck = document.querySelector('.features-deck')
    if (!deck) return

    var cardElements = deck.querySelectorAll('.feature-card')
    if (cardElements.length === 0) return

    cards = Array.prototype.slice.call(cardElements)

    // Strip any pre-set active class
    cards.forEach(function (card) {
      card.classList.remove('active')
    })

    activeIndex = -1
    updateDeck()

    cards.forEach(function (card, i) {
      card.addEventListener('click', function (e) {
        e.stopPropagation()
        toggleCard(i)
        if (activeIndex >= 0) {
          cards[activeIndex].focus()
        }
      })

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleCard(i)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          deactivate()
          card.focus()
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          var next = (i + 1) % cards.length
          cards[next].focus()
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          var prev = (i - 1 + cards.length) % cards.length
          cards[prev].focus()
        }
      })
    })

    // Click anywhere outside cards to dismiss active card
    document.addEventListener('click', function () {
      deactivate()
    })

    var resizeTimer
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(updateDeck, 200)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
