/**
 * Linked devices: list and unlink. Reads from devices table, delete to unlink.
 * Shows OS-specific icons (Apple, Windows, Linux) next to each device.
 */

import { supabase } from '../supabase.js'
import { initDashboardLayout } from '../dashboard-layout.js'
import { escapeHtml, showInlineError } from '../utils.js'
import { t, getLocale } from '../dashboard-i18n.js'

import { logError } from '../logger.js'

// Inline SVGs for OS icons (kept small and simple)
const APPLE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`
const WINDOWS_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 12V6.5l8-1.1V12H3zm0 .5h8v6.6l-8-1.1V12.5zm9 0h9V3l-9 1.2V12.5zm0 .5v6.3L21 21v-8H12z"/></svg>`
const LINUX_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.5 2C10.8 2 9.9 3.5 9.6 4.6c-.3 1-.4 2.1-.3 3.1.1 1 .3 1.9.3 2.5 0 .7-.3 1.1-.7 1.8-.4.7-.9 1.5-1.2 2.6-.3 1.2-.1 2.1.4 2.9.4.6 1 1.1 1.4 1.5-.3.5-.6 1.1-.7 1.7-.1.8.2 1.5.8 2 .5.4 1.2.5 1.9.3.6-.2 1.1-.5 1.5-.5s.9.3 1.5.5c.7.2 1.4.1 1.9-.3.6-.5.9-1.2.8-2-.1-.6-.4-1.2-.7-1.7.4-.4 1-.9 1.4-1.5.5-.8.7-1.7.4-2.9-.3-1.1-.8-1.9-1.2-2.6-.4-.7-.7-1.1-.7-1.8 0-.6.2-1.5.3-2.5.1-1 0-2.1-.3-3.1C15.1 3.5 14.2 2 12.5 2z"/></svg>`
const DEVICE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`

/**
 * Return the appropriate OS icon SVG based on the os string.
 */
function getOsIcon(os) {
  if (!os) return DEVICE_SVG
  const lower = os.toLowerCase()
  if (lower.includes('mac') || lower.includes('darwin') || lower.includes('ios') || lower.includes('apple')) {
    return APPLE_SVG
  }
  if (lower.includes('win')) return WINDOWS_SVG
  if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('fedora') || lower.includes('debian')) {
    return LINUX_SVG
  }
  return DEVICE_SVG
}

async function loadDevices(userId) {
  /** Fetch all linked devices for this user, newest first. */
  const { data, error } = await supabase.from('devices').select('id, device_name, machine_id, os, last_seen, app_version').eq('user_id', userId).order('last_seen', { ascending: false })
  if (error) throw error
  return data || []
}

async function unlinkDevice(deviceId, userId) {
  /** Remove a device link with explicit ownership check. */
  const { error } = await supabase.from('devices').delete().eq('id', deviceId).eq('user_id', userId)
  if (error) throw error
}

function formatRelativeTime(iso) {
  /** Human-readable relative time from ISO string. */
  if (!iso) return t('dashboard.devices.never', 'Never')
  const d = new Date(iso)
  const now = new Date()
  const sec = Math.floor((now - d) / 1000)
  if (sec < 60) return t('dashboard.devices.justNow', 'Just now')
  if (sec < 3600) {
    const mins = Math.floor(sec / 60)
    return `${mins} ${mins === 1 ? t('dashboard.devices.minAgo', 'min ago') : t('dashboard.devices.minsAgo', 'mins ago')}`
  }
  if (sec < 86400) {
    const hrs = Math.floor(sec / 3600)
    return `${hrs} ${hrs === 1 ? t('dashboard.devices.hourAgo', 'hour ago') : t('dashboard.devices.hoursAgo', 'hours ago')}`
  }
  if (sec < 604800) {
    const days = Math.floor(sec / 86400)
    return `${days} ${days === 1 ? t('dashboard.devices.dayAgo', 'day ago') : t('dashboard.devices.daysAgo', 'days ago')}`
  }
  return d.toLocaleDateString(getLocale())
}

function render(main, devices, userId, credits) {
  const base = window.location.origin
  const isFreeTier = credits?.is_free_tier === true
  const atDeviceLimit = isFreeTier && devices.length >= 1

  main.innerHTML = `
    <h1 class="dashboard-page-title">${t('dashboard.devices.title', 'Linked Devices')}</h1>
    <p class="dashboard-page-subtitle">
      ${t('dashboard.devices.subtitle', 'Devices where you have signed in with BrainDock. Unlinking will require signing in again on that device.')}
    </p>
    ${atDeviceLimit ? `
    <div class="dashboard-banner dashboard-banner-info" role="status">
      ${t('dashboard.devices.freeTierLimit', 'Free tier accounts are limited to 1 device. Upgrade to use BrainDock on more devices.')}
    </div>
    ` : ''}

    <div class="dashboard-card">
      ${devices.length === 0
        ? `
        <div class="dashboard-empty">
          <p class="dashboard-empty-title">${t('dashboard.devices.noDevicesTitle', 'No linked devices')}</p>
          <p>${t('dashboard.devices.noDevicesDesc', 'Download BrainDock and sign in to link a device.')}</p>
          <a href="${base}/download/" class="btn btn-primary nav-cta dashboard-empty-cta">
            <span>${t('dashboard.actions.download', 'Download')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
        </div>
        `
        : `
        <ul class="dashboard-list">
          ${devices.map((d) => `
            <li class="dashboard-list-item" data-device-id="${escapeHtml(d.id)}">
              <div class="dashboard-device-info">
                <span class="dashboard-device-os-icon">${getOsIcon(d.os)}</span>
                <div>
                  <strong>${escapeHtml(d.device_name || d.machine_id || t('dashboard.devices.unknownDevice', 'Unknown device'))}</strong><br>
                  <span class="dashboard-meta">${escapeHtml(d.os || '')} &middot; ${t('dashboard.devices.lastActive', 'Last active:')} ${formatRelativeTime(d.last_seen)}</span><br>
                  <span class="dashboard-meta-sub">${t('dashboard.devices.appVersion', 'App version:')} ${escapeHtml(d.app_version || '-')}</span>
                </div>
              </div>
              <button type="button" class="btn btn-secondary dashboard-btn-sm device-unlink-btn">${t('dashboard.actions.unlink', 'Unlink')}</button>
            </li>
          `).join('')}
        </ul>
        `}
      <p class="dashboard-meta dashboard-devices-footer">
        ${t('dashboard.devices.linkNewDevice', 'To link a new device, download BrainDock and sign in with your account.')}
      </p>
      <a href="${base}/download/" class="btn btn-primary nav-cta dashboard-devices-download-link">
        <span>${t('dashboard.actions.download', 'Download')}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </a>
    </div>
  `

  main.querySelectorAll('.device-unlink-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const li = btn.closest('[data-device-id]')
      const id = li?.dataset.deviceId
      if (!id || !confirm(t('dashboard.devices.unlinkConfirm', 'Unlink this device? You will need to sign in again on it.'))) return
      btn.disabled = true
      try {
        await unlinkDevice(id, userId)
        li.remove()
        // If no devices remain, re-render to show the empty state
        if (main.querySelectorAll('[data-device-id]').length === 0) {
          render(main, [], userId, credits)
        }
      } catch (err) {
        logError('Device unlink failed:', err)
        showInlineError(main, t('dashboard.devices.unlinkFailed', 'Failed to unlink. Please try again.'))
        btn.disabled = false
      }
    })
  })
}

async function main() {
  const result = await initDashboardLayout()
  if (!result) return

  const mainEl = document.querySelector('.dashboard-main')
  if (!mainEl) return

  mainEl.innerHTML = `<div class="dashboard-loading"><div class="dashboard-spinner"></div><p>${t('dashboard.devices.loading', 'Loading devices...')}</p></div>`

  const userId = result.user.id

  try {
    const [devices, credits] = await Promise.all([loadDevices(userId), result.creditsPromise])
    render(mainEl, devices, userId, credits)
  } catch (err) {
    logError('Devices page load failed:', err)
    mainEl.innerHTML = `
      <div class="dashboard-empty">
        <p class="dashboard-empty-title">${t('dashboard.devices.errorTitle', 'Could not load devices')}</p>
        <p>${t('dashboard.common.tryAgain', 'Please try again.')}</p>
      </div>
    `
  }
}

main()
