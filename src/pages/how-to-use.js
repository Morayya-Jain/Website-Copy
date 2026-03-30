/**
 * How to Use / Tutorial: static content with icons. No Supabase calls.
 */

import { initDashboardLayout } from '../dashboard-layout.js'
import { t } from '../dashboard-i18n.js'
import { appleIcon, windowsIcon } from '../icons.js'
import { BASE_PATH } from '../base-path.js'

// Inline SVG icons (Lucide-style, 24x24 viewBox)
const ICONS = {
  download: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  play: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
  camera: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
  monitor: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  layers: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  shield: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  lightbulb: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
  helpCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  appleSmall: appleIcon(16).replace('<svg ', '<svg style="vertical-align:-2px" '),
  windowsSmall: windowsIcon(14).replace('<svg ', '<svg style="vertical-align:-2px" '),
}

function render(main) {
  const base = BASE_PATH

  main.innerHTML = `
    <h1 class="dashboard-page-title">${t('dashboard.howToUse.title', 'How to Use BrainDock')}</h1>
    <p class="dashboard-page-subtitle">${t('dashboard.howToUse.subtitle', 'A simple guide to get you started.')}</p>

    <div class="howto-stack">

      <!-- 1. Get Set Up -->
      <div class="dashboard-card">
        <div class="howto-icon howto-icon--accent">${ICONS.download}</div>
        <h2 class="dashboard-section-title">${t('dashboard.howToUse.getSetUp', 'Get Set Up')}</h2>
        <div class="howto-step"><span class="howto-step-num">1</span><span>${t('dashboard.howToUse.step1Download', 'Download the app from the <a href="%URL%/download/">Download</a> page.').replace('%URL%', base)}</span></div>
        <div class="howto-step"><span class="howto-step-num">2</span><span>${t('dashboard.howToUse.step2Account', 'Create an account or sign in on this website.')}</span></div>
        <div class="howto-step"><span class="howto-step-num">3</span><span>${t('dashboard.howToUse.step3SignIn', 'Open BrainDock and sign in with the same account (or use the login code from this site).')}</span></div>

        <hr class="howto-divider">
        <p class="dashboard-meta mb-s">${t('dashboard.howToUse.firstLaunch', 'First launch on your platform:')}</p>
        <div class="howto-platform-tabs">
          <button type="button" class="howto-platform-tab active" data-platform="macos">${ICONS.appleSmall} ${t('dashboard.howToUse.platformMac', 'macOS')}</button>
          <button type="button" class="howto-platform-tab" data-platform="windows">${ICONS.windowsSmall} ${t('dashboard.howToUse.platformWin', 'Windows')}</button>
        </div>
        <div class="howto-platform-panel active" id="platform-macos">
          <div class="howto-step"><span class="howto-step-num">1</span><span>${t('dashboard.howToUse.macStep1', '<strong>Right-click</strong> (or Control-click) on BrainDock.app and choose <strong>Open</strong>.')}</span></div>
          <div class="howto-step"><span class="howto-step-num">2</span><span>${t('dashboard.howToUse.macStep2', 'Click "Open" in the dialog. This only happens once.')}</span></div>
          <div class="howto-step"><span class="howto-step-num">3</span><span>${t('dashboard.howToUse.macStep3', 'When asked for camera access, click <strong>OK</strong>.')}</span></div>
        </div>
        <div class="howto-platform-panel" id="platform-windows">
          <div class="howto-step"><span class="howto-step-num">1</span><span>${t('dashboard.howToUse.winStep1', 'Run <strong>BrainDock-Setup.exe</strong>. If SmartScreen appears, click <strong>More info</strong> then <strong>Run anyway</strong>.')}</span></div>
          <div class="howto-step"><span class="howto-step-num">2</span><span>${t('dashboard.howToUse.winStep2', 'Follow the installer. A desktop shortcut and Start Menu entry will be created.')}</span></div>
          <div class="howto-step"><span class="howto-step-num">3</span><span>${t('dashboard.howToUse.winStep3', 'When asked for camera access, click <strong>Allow</strong>.')}</span></div>
        </div>
      </div>

      <!-- 2. Start a Session -->
      <div class="dashboard-card">
        <div class="howto-icon howto-icon--success">${ICONS.play}</div>
        <h2 class="dashboard-section-title">${t('dashboard.howToUse.startSession', 'Start a Session')}</h2>
        <div class="howto-step"><span class="howto-step-num">1</span><span>${t('dashboard.howToUse.sessionStep1', 'Click the BrainDock icon in the menu bar (macOS) or system tray (Windows).')}</span></div>
        <div class="howto-step"><span class="howto-step-num">2</span><span>${t('dashboard.howToUse.sessionStep2', 'Pick your mode: Camera, Screen, or Both.')}</span></div>
        <div class="howto-step"><span class="howto-step-num">3</span><span>${t('dashboard.howToUse.sessionStep3', 'Press "Start Session". Pause or stop any time from the menu.')}</span></div>
        <p class="dashboard-meta mt-m mb-s">${t('dashboard.howToUse.statusColours', 'Status colours:')}</p>
        <div class="howto-status-row">
          <span class="howto-status-item"><span class="howto-dot howto-dot--focused"></span> ${t('dashboard.howToUse.statusFocussed', 'Focussed')}</span>
          <span class="howto-status-item"><span class="howto-dot howto-dot--away"></span> ${t('dashboard.howToUse.statusAway', 'Away')}</span>
          <span class="howto-status-item"><span class="howto-dot howto-dot--gadget"></span> ${t('dashboard.howToUse.statusGadget', 'Gadget')}</span>
          <span class="howto-status-item"><span class="howto-dot howto-dot--screen"></span> ${t('dashboard.howToUse.statusScreen', 'Screen')}</span>
        </div>
      </div>

      <!-- 3. Focus Modes + Tips -->
      <div class="dashboard-card">
        <div class="howto-icon howto-icon--accent">${ICONS.lightbulb}</div>
        <h2 class="dashboard-section-title">${t('dashboard.howToUse.focusModes', 'Focus Modes')}</h2>
        <div class="howto-modes">
          <div class="howto-mode-item howto-icon--accent">
            ${ICONS.camera}
            <div class="howto-mode-label">${t('dashboard.howToUse.modeCamera', 'Camera')}</div>
            <div class="howto-mode-desc">${t('dashboard.howToUse.modeCameraDesc', 'Uses AI to notice when you step away or pick up a phone/tablet. No video is saved.')}</div>
          </div>
          <div class="howto-mode-item howto-icon--accent">
            ${ICONS.monitor}
            <div class="howto-mode-label">${t('dashboard.howToUse.modeScreen', 'Screen')}</div>
            <div class="howto-mode-desc">${t('dashboard.howToUse.modeScreenDesc', 'Checks your active window against your blocklist. Works offline.')}</div>
          </div>
          <div class="howto-mode-item howto-icon--accent">
            ${ICONS.layers}
            <div class="howto-mode-label">${t('dashboard.howToUse.modeBoth', 'Both')}</div>
            <div class="howto-mode-desc">${t('dashboard.howToUse.modeBothDesc', 'Camera and screen combined for full coverage.')}</div>
          </div>
        </div>

        <hr class="howto-divider">
        <p class="dashboard-meta mb-s"><strong>${t('dashboard.howToUse.tips', 'Tips')}</strong></p>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.tip1', 'Good lighting on your face helps accuracy.')}</span></div>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.tip2', 'Sit facing the camera, within 1 to 2 metres.')}</span></div>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.tip3', 'Keep one person in the frame at a time.')}</span></div>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.tip4', 'Only active gadget use is flagged. A phone on the desk while you work is fine.')}</span></div>
      </div>

      <!-- 4. Your Blocklist -->
      <div class="dashboard-card">
        <div class="howto-icon howto-icon--accent">${ICONS.shield}</div>
        <h2 class="dashboard-section-title">${t('dashboard.howToUse.yourBlocklist', 'Your Blocklist')}</h2>
        <p>${t('dashboard.howToUse.blocklistDesc', 'Choose which sites and apps count as off-task in <a href="%URL%/settings/blocklist/">Settings &rarr; Blocklist</a>.').replace('%URL%', base)}</p>
        <p>${t('dashboard.howToUse.blocklistDesc2', 'Use Quick Block for common sites, enable whole categories, or add your own URLs and app names. Changes sync to the app when you start your next session.')}</p>
      </div>

      <!-- 5. Your Reports -->
      <div class="dashboard-card">
        <div class="howto-icon howto-icon--accent">${ICONS.fileText}</div>
        <h2 class="dashboard-section-title">${t('dashboard.howToUse.yourReports', 'Your Reports')}</h2>
        <p>${t('dashboard.howToUse.reportsIntro', 'After each session a PDF is saved to your Downloads folder. It includes:')}</p>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.reportItem1', 'Session duration and focus percentage')}</span></div>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.reportItem2', 'Away time and gadget/screen events')}</span></div>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.reportItem3', 'A visual timeline of your session')}</span></div>
        <div class="howto-tip">${ICONS.check}<span>${t('dashboard.howToUse.reportItem4', 'AI-generated insights and personalised suggestions')}</span></div>
        <p class="mt-m">${t('dashboard.howToUse.reportsCta', 'You can also view past sessions on the <a href="%URL%/sessions/">Sessions</a> page.').replace('%URL%', base)}</p>
      </div>

      <!-- 6. FAQ -->
      <div class="dashboard-card">
        <div class="howto-icon howto-icon--muted">${ICONS.helpCircle}</div>
        <h2 class="dashboard-section-title">${t('dashboard.howToUse.faqTitle', 'FAQ')}</h2>

        <div class="howto-qa">
          <div class="howto-qa-q">${t('dashboard.howToUse.faq1Q', 'How do I pause or stop a session?')}</div>
          <div class="howto-qa-a">${t('dashboard.howToUse.faq1A', 'Click the BrainDock icon in your menu bar or system tray, then choose Pause or Stop. You can resume a paused session at any time.')}</div>
        </div>

        <div class="howto-qa">
          <div class="howto-qa-q">${t('dashboard.howToUse.faq2Q', 'How do I change my focus mode?')}</div>
          <div class="howto-qa-a">${t('dashboard.howToUse.faq2A', 'Open the BrainDock popup from the menu bar or system tray and pick Camera, Screen, or Both before starting a session.')}</div>
        </div>

        <div class="howto-qa">
          <div class="howto-qa-q">${t('dashboard.howToUse.faq3Q', 'Where are my PDF reports saved?')}</div>
          <div class="howto-qa-a">${t('dashboard.howToUse.faq3A', 'Reports are automatically saved to your Downloads folder when a session ends. You can also view session history on the Sessions page of this website.')}</div>
        </div>

        <div class="howto-qa">
          <div class="howto-qa-q">${t('dashboard.howToUse.faq4Q', 'How do I add a website or app to my blocklist?')}</div>
          <div class="howto-qa-a">${t('dashboard.howToUse.faq4A', 'Go to Settings &rarr; Blocklist on this website. You can toggle common sites, enable categories, or type in a custom URL or app name. Your changes sync to the desktop app automatically.')}</div>
        </div>

        <div class="howto-qa">
          <div class="howto-qa-q">${t('dashboard.howToUse.faq5Q', 'Can I use BrainDock on more than one computer?')}</div>
          <div class="howto-qa-a">${t('dashboard.howToUse.faq5A', 'Yes. Install the app on each computer and sign in with the same account. Your settings and blocklist sync across all your devices.')}</div>
        </div>

        <div class="howto-qa">
          <div class="howto-qa-q">${t('dashboard.howToUse.faq6Q', 'Does screen-only mode work without internet?')}</div>
          <div class="howto-qa-a">${t('dashboard.howToUse.faq6A', 'Yes. Screen-only mode runs entirely on your computer and does not need an internet connection. Camera mode needs internet for the AI.')}</div>
        </div>

        <div class="howto-qa">
          <div class="howto-qa-q">${t('dashboard.howToUse.faq7Q', 'A phone on my desk was incorrectly flagged. Why?')}</div>
          <div class="howto-qa-a">${t('dashboard.howToUse.faq7A', 'BrainDock only flags active gadget use (e.g. scrolling or looking at a phone). If this still happens, try adjusting your camera angle or improving lighting. You can also turn off specific gadget types in Settings &rarr; Configuration.')}</div>
        </div>
      </div>

    </div>
  `

  // Platform tab toggle
  const tabs = main.querySelectorAll('.howto-platform-tab')
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const platform = tab.dataset.platform
      tabs.forEach((tabEl) => tabEl.classList.remove('active'))
      tab.classList.add('active')
      main.querySelectorAll('.howto-platform-panel').forEach((p) => p.classList.remove('active'))
      const panel = main.querySelector(`#platform-${platform}`)
      if (panel) panel.classList.add('active')
    })
  })

  // 3D stacking scroll effect — return cleanup function for SPA navigation
  return initStackEffect(main)
}

/**
 * Smooth 3D stacking effect. As the next card scrolls over a stuck card,
 * the stuck card scales down and fades, creating depth.
 *
 * Works on both desktop (dashboard-main scrolls) and mobile (document scrolls)
 * by detecting the actual scroll container at init time.
 */
function initStackEffect(main) {
  const cards = Array.from(main.querySelectorAll('.howto-stack > .dashboard-card'))
  if (cards.length === 0) return

  // Detect the real scroll container: on desktop (>=768px) it's .dashboard-main,
  // on mobile the page itself scrolls (document/window).
  function getScrollParent() {
    const dm = main.closest('.dashboard-main')
    if (dm) {
      const style = getComputedStyle(dm)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return dm
    }
    return null // null means document/window is the scroller
  }

  let scrollEl = getScrollParent()

  // Cache each card's sticky top offset (read from CSS, changes on resize)
  let stickyTops = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0)

  // Tuning
  const COVER_PX = 250
  const SCALE_MIN = 0.93
  const OPACITY_MIN = 0.5

  let ticking = false

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }

  function update() {
    ticking = false

    // The reference Y: top of the scroll container's viewport
    // On desktop: dashboard-main's bounding top
    // On mobile: 0 (document viewport top)
    const refTop = scrollEl ? scrollEl.getBoundingClientRect().top : 0

    for (let i = 0; i < cards.length; i++) {
      const next = cards[i + 1]
      if (!next) {
        cards[i].style.transform = ''
        cards[i].style.opacity = ''
        cards[i].style.boxShadow = ''
        continue
      }

      // Where this card's top edge sits when stuck
      const myStuckY = refTop + stickyTops[i]
      const myBottom = myStuckY + cards[i].offsetHeight
      const nextTop = next.getBoundingClientRect().top

      // How far the next card has overlapped into this card (0 = none, 1 = fully covered)
      const overlap = myBottom - nextTop
      const progress = Math.max(0, Math.min(1, overlap / COVER_PX))

      if (progress > 0.001) {
        const s = 1 - (1 - SCALE_MIN) * progress
        const o = 1 - (1 - OPACITY_MIN) * progress
        cards[i].style.transform = `scale(${s})`
        cards[i].style.opacity = o
        cards[i].style.boxShadow = `0 2px ${8 + 16 * progress}px rgba(0,0,0,${0.05 + 0.08 * progress})`
      } else {
        cards[i].style.transform = ''
        cards[i].style.opacity = ''
        cards[i].style.boxShadow = ''
      }
    }
  }

  let prevScrollEl = scrollEl

  function recache() {
    const newScrollEl = getScrollParent()
    // Re-attach scroll listener if the scroll container changed (e.g. mobile to desktop)
    if (newScrollEl !== prevScrollEl) {
      if (prevScrollEl) prevScrollEl.removeEventListener('scroll', onScroll)
      if (newScrollEl) newScrollEl.addEventListener('scroll', onScroll, { passive: true })
      prevScrollEl = newScrollEl
    }
    scrollEl = newScrollEl
    stickyTops = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0)
    update()
  }

  // Attach to the correct scroll target + always listen on window for mobile
  if (scrollEl) scrollEl.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  // Recache on resize and orientation change (sticky tops + scroll container may change)
  window.addEventListener('resize', recache)
  window.addEventListener('orientationchange', recache)
  update()

  // Return cleanup function for SPA navigation
  return function cleanup() {
    if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
    if (prevScrollEl && prevScrollEl !== scrollEl) prevScrollEl.removeEventListener('scroll', onScroll)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', recache)
    window.removeEventListener('orientationchange', recache)
  }
}

// Module-level cleanup for SPA navigation
let _cleanupStackEffect = null

async function main() {
  // Clean up previous listeners if re-entering from SPA navigation
  if (_cleanupStackEffect) {
    _cleanupStackEffect()
    _cleanupStackEffect = null
  }

  const result = await initDashboardLayout()
  if (!result) return

  const mainEl = document.querySelector('.dashboard-main')
  if (!mainEl) return

  _cleanupStackEffect = render(mainEl)
}

main()
