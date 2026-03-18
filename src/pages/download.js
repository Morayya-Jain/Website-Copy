/**
 * Download page: links to desktop app (macOS, Windows). Static content.
 */

import { initDashboardLayout } from '../dashboard-layout.js'
import { t } from '../dashboard-i18n.js'
import { MACOS_URL, WINDOWS_URL } from '../constants.js'
import { appleIcon, windowsIcon, linuxIcon } from '../icons.js'
import { track, EVENTS } from '../analytics.js'

function render(main) {
  main.innerHTML = `
    <h1 class="dashboard-page-title">${t('dashboard.downloadPage.title', 'Download BrainDock')}</h1>
    <p class="dashboard-page-subtitle">
      ${t('dashboard.downloadPage.subtitle', 'Install the desktop app to start tracking your focus. Available for macOS and Windows.')}
    </p>

    <div class="dashboard-card">
      <div class="download-buttons">
        <a href="${MACOS_URL}" class="btn btn-primary btn-download">
          ${appleIcon(22)}
          ${t('dashboard.downloadPage.macOS', 'macOS')}
        </a>
        <a href="${WINDOWS_URL}" class="btn btn-primary btn-download">
          ${windowsIcon(20)}
          ${t('dashboard.downloadPage.windows', 'Windows')}
        </a>
        <button type="button" class="btn btn-primary btn-download btn-disabled" disabled>
          ${linuxIcon(20)}
          ${t('dashboard.downloadPage.linuxComingSoon', 'Linux (Coming Soon)')}
        </button>
      </div>
      <p class="dashboard-download-footer">
        ${t('dashboard.downloadPage.afterInstalling', 'After installing, open BrainDock and sign in with your account to link this device.')}
      </p>
    </div>
  `
}

async function main() {
  const result = await initDashboardLayout()
  if (!result) return

  const mainEl = document.querySelector('.dashboard-main')
  if (!mainEl) return

  render(mainEl)

  mainEl.querySelectorAll('.btn-download[href]').forEach((link) => {
    link.addEventListener('click', () => {
      const platform = link.getAttribute('href') === MACOS_URL ? 'macos' : 'windows'
      track(EVENTS.DOWNLOAD_CLICKED, { platform })
    })
  })
}

main()
