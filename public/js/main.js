/**
 * BrainDock Website - Shared JavaScript
 * Handles mobile menu toggle, responsive nav, and FAQ accordion functionality
 */

/** Detect user's OS and return the matching direct download URL. */
function getDownloadUrl() {
  const ua = navigator.userAgent || ''
  // Exclude mobile devices first - BrainDock is desktop-only
  if (/iPhone|iPad|iPod|Android/.test(ua)) return null
  if (/Mac/.test(ua)) return 'https://github.com/Morayya-Jain/BrainDock/releases/latest/download/BrainDock-macOS.dmg'
  if (/Win/.test(ua)) return 'https://github.com/Morayya-Jain/BrainDock/releases/latest/download/BrainDock-Setup.exe'
  return null // unknown OS - keep default #download anchor
}

// Mobile menu toggle and responsive navigation
document.addEventListener('DOMContentLoaded', function() {
  const nav = document.querySelector('.nav');
  const navContainer = document.querySelector('.nav-container');
  const navToggle = document.querySelector('.nav-toggle');
  const navMobile = document.getElementById('nav-mobile');
  const navLinks = document.querySelector('.nav-links');
  const navLogo = document.querySelector('.nav-logo');
  const navCta = document.querySelector('.nav-cta');

  // Point header + hero download buttons directly to OS-specific download
  const downloadUrl = getDownloadUrl()
  if (downloadUrl) {
    document.querySelectorAll('a[href="#download"].btn-primary.nav-cta, .hero-ctas a[href="#download"].btn-primary').forEach(function(btn) {
      btn.href = downloadUrl
    })
  }

  /**
   * Dynamically check if navigation elements fit in the container.
   * Adds 'nav-compact' class to nav when elements would overflow.
   */
  /**
   * Three nav states based on viewport width:
   * 1. Full: logo + links + Sign Up + Download
   * 2. Compact (nav-compact): logo + Download + hamburger
   * 3. Mini (nav-mini): scaled-down compact for very small screens
   * Widths are measured once and cached to prevent flicker on scroll/resize.
   */
  var cachedFullWidth = 0;
  var cachedCompactWidth = 0;

  function measureNavWidths() {
    if (!nav || !navContainer) return;
    // Measure full nav
    nav.classList.remove('nav-compact', 'nav-mini');
    void nav.offsetWidth;
    cachedFullWidth = nav.offsetWidth;
    // Measure compact nav
    nav.classList.add('nav-compact');
    nav.classList.remove('nav-mini');
    void nav.offsetWidth;
    cachedCompactWidth = nav.offsetWidth;
    // Reset
    nav.classList.remove('nav-compact', 'nav-mini');
  }

  function checkNavFit() {
    if (!nav || !navContainer) return;
    if (cachedFullWidth === 0) measureNavWidths();

    var buffer = 40;

    if (window.innerWidth < cachedCompactWidth + buffer) {
      nav.classList.add('nav-compact', 'nav-mini');
    } else if (window.innerWidth < cachedFullWidth + buffer) {
      nav.classList.remove('nav-mini');
      nav.classList.add('nav-compact');
    } else {
      nav.classList.remove('nav-compact', 'nav-mini');
    }
  }

  // Re-measure after fonts load (only time we need to re-measure)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      cachedFullWidth = 0;
      cachedCompactWidth = 0;
      checkNavFit();
    });
  }

  // Mark that JS is handling responsive nav (for CSS fallback)
  if (nav) {
    nav.setAttribute('data-js-ready', 'true');
  }

  /**
   * Dynamically check if hero CTA buttons fit in a row.
   * Adds 'hero-compact' class to body when buttons would wrap.
   */
  const heroCtas = document.querySelector('.hero-ctas');
  const heroCtaButtons = heroCtas ? heroCtas.querySelectorAll('.btn') : [];

  function checkHeroCtasFit() {
    if (!heroCtas || heroCtaButtons.length < 2) return;

    // Temporarily remove compact mode to measure true widths
    document.body.classList.remove('hero-compact');

    // Force a reflow to get accurate measurements
    void heroCtas.offsetWidth;

    // Get the container's available width
    const containerWidth = heroCtas.clientWidth;

    // Measure total width of all buttons plus gaps
    let totalButtonsWidth = 0;
    heroCtaButtons.forEach(btn => {
      totalButtonsWidth += btn.offsetWidth;
    });

    // Get gap between buttons
    const gap = parseFloat(getComputedStyle(heroCtas).gap) || 16;
    const totalGaps = (heroCtaButtons.length - 1) * gap;

    const requiredWidth = totalButtonsWidth + totalGaps;

    // Add buffer for safety (10px)
    const buffer = 10;

    // If not enough space, switch to compact/stacked mode
    if (requiredWidth + buffer > containerWidth) {
      document.body.classList.add('hero-compact');
    }
  }

  // Run all responsive checks
  function runAllResponsiveChecks() {
    checkNavFit();
    checkHeroCtasFit();
    drawRoadmapPath();
  }

  // Run checks on load and after fonts are ready
  runAllResponsiveChecks();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(runAllResponsiveChecks);
  }

  // Debounced resize handler for all responsive checks
  let responsiveResizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(responsiveResizeTimeout);
    responsiveResizeTimeout = setTimeout(runAllResponsiveChecks, 150);
  });

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', function() {
      const isOpen = navMobile.classList.toggle('active');
      nav.classList.toggle('nav-menu-open', isOpen); // Safari 15.0-15.3 compat (replaces :has())
      this.setAttribute('aria-expanded', isOpen);
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-mobile a').forEach(link => {
      link.addEventListener('click', () => {
        navMobile.classList.remove('active');
        nav.classList.remove('nav-menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navMobile.classList.contains('active') && 
          !navMobile.contains(e.target) && 
          !navToggle.contains(e.target)) {
        navMobile.classList.remove('active');
        nav.classList.remove('nav-menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close mobile menu when nav exits compact mode
    let menuResizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(menuResizeTimeout);
      menuResizeTimeout = setTimeout(function() {
        if (!nav.classList.contains('nav-compact') && navMobile.classList.contains('active')) {
          navMobile.classList.remove('active');
          nav.classList.remove('nav-menu-open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      }, 100);
    });
  }

  // FAQ accordion toggle (only on pages with FAQ)
  const faqQuestions = document.querySelectorAll('.faq-question');
  if (faqQuestions.length > 0) {
    faqQuestions.forEach(button => {
      button.addEventListener('click', () => {
        const faqItem = button.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Close all other FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
          item.classList.remove('active');
          item.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });
        
        // Toggle current item
        if (!isActive) {
          faqItem.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // Note: drawRoadmapPath() already called by runAllResponsiveChecks() above

  // Made For You audience pill switcher
  initMadeForYou();

});

/**
 * Draw the organic S-curve SVG path connecting roadmap dots.
 * Measures dot positions dynamically so the path adapts to any content height.
 * Only active on desktop (768px+); mobile uses a CSS fallback line.
 */
function drawRoadmapPath() {
  const container = document.querySelector('.roadmap-container');
  const svg = document.querySelector('.roadmap-svg');
  const path = document.querySelector('.roadmap-path');
  const dots = document.querySelectorAll('.roadmap-dot');

  if (!container || !svg || !path || dots.length < 2) return;

  // Only draw the SVG curve on desktop (768px+)
  if (window.innerWidth < 768) {
    path.removeAttribute('d');
    return;
  }

  const containerRect = container.getBoundingClientRect();

  // Collect the center coordinates of each dot relative to the container
  const points = [];
  dots.forEach(dot => {
    const dotRect = dot.getBoundingClientRect();
    points.push({
      x: dotRect.left + dotRect.width / 2 - containerRect.left,
      y: dotRect.top + dotRect.height / 2 - containerRect.top
    });
  });

  // Build the SVG path using cubic Bezier curves
  // Start at the first dot
  let d = `M ${points[0].x},${points[0].y}`;

  // Connect each consecutive pair with a smooth S-curve
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const verticalGap = (next.y - current.y) / 2;

    // Control points create a vertical-tangent curve (smooth S shape)
    const cp1x = current.x;
    const cp1y = current.y + verticalGap;
    const cp2x = next.x;
    const cp2y = next.y - verticalGap;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  // Update the SVG viewBox to match the container dimensions
  svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);
  path.setAttribute('d', d);
}

/**
 * Initialize the "Made For You" audience pill switcher.
 * Implements WAI-ARIA Tabs pattern with arrow key navigation.
 * Also rewrites download buttons to OS-specific URLs.
 */
function initMadeForYou() {
  const pills = document.querySelectorAll('.mfy-pill');
  const panels = document.querySelectorAll('.mfy-panel');

  if (!pills.length || !panels.length) return;

  /** Activate a pill and show its corresponding panel. */
  function activateTab(pill) {
    // Deactivate all pills
    pills.forEach(p => {
      p.classList.remove('active');
      p.setAttribute('aria-selected', 'false');
      p.setAttribute('tabindex', '-1');
    });

    // Hide all panels
    panels.forEach(p => p.classList.remove('active'));

    // Activate the selected pill
    pill.classList.add('active');
    pill.setAttribute('aria-selected', 'true');
    pill.setAttribute('tabindex', '0');
    pill.focus();

    // Show the matching panel
    const panelId = pill.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');
  }

  // Click handler for each pill
  pills.forEach(pill => {
    pill.addEventListener('click', () => activateTab(pill));
  });

  // Arrow key navigation (WAI-ARIA Tabs pattern)
  pills.forEach((pill, index) => {
    pill.addEventListener('keydown', (e) => {
      let newIndex;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        newIndex = (index + 1) % pills.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        newIndex = (index - 1 + pills.length) % pills.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = pills.length - 1;
      }
      if (newIndex !== undefined) {
        activateTab(pills[newIndex]);
      }
    });
  });

  // Rewrite download buttons to OS-specific URL (same as nav CTA)
  const downloadUrl = getDownloadUrl();
  if (downloadUrl) {
    document.querySelectorAll('.mfy-download-btn').forEach(btn => {
      btn.href = downloadUrl;
    });
  }
}


// ========== BINARY TEXT BANNER ==========
// Renders "BrainDock" formed by dense 0s and 1s with a Matrix-rain
// reveal and continuous character scrambling.

/** Initialise the binary text banner canvas animation. */
function initBinaryBanner() {
  var canvas = document.getElementById('binaryCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Grid of binary characters - scale down on small screens for readability
  var FONT_SIZE, CELL_W, CELL_H;

  var W, H, cols, rows, mask, dripMask, centerWeight, edgeNoise, grid, rainY, settled, animId;

  // Hover spotlight state - soft glow + scramble near cursor
  var SPOT_RADIUS = 30; // cells
  var mouseCol = -1;
  var mouseRow = -1;

  /** Set canvas dimensions and rebuild everything. */
  function setup() {
    W = canvas.parentElement.clientWidth;
    // Fixed height on small screens, proportional on larger ones
    if (W < 600) {
      H = 220;
    } else {
      H = Math.max(280, Math.min(500, W * 0.38));
    }

    // Scale grid cells based on screen width for readable text at all sizes
    if (W < 600) {
      FONT_SIZE = 7; CELL_W = 4; CELL_H = 7;
    } else if (W < 900) {
      FONT_SIZE = 9; CELL_W = 5; CELL_H = 9;
    } else {
      FONT_SIZE = 11; CELL_W = 7; CELL_H = 12;
    }

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(W / CELL_W);
    rows = Math.ceil(H / CELL_H);

    buildMask();
    initGrid();
  }

  /** Render "BrainDock" at full canvas resolution, sample at each grid cell. */
  function buildMask() {
    var off = document.createElement('canvas');
    off.width = Math.ceil(W * dpr);
    off.height = Math.ceil(H * dpr);
    var oc = off.getContext('2d');
    oc.scale(dpr, dpr);

    // Large bold text covering ~65% of banner height
    var fontSize = Math.min(H * 0.38, W * 0.16); // Cap by width so text fits on small screens
    oc.font = '800 ' + fontSize + 'px "Inter", sans-serif';
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    // Stroke for extra thickness (thinner to preserve letter details like i dot and C opening)
    oc.lineWidth = W < 600 ? fontSize * 0.02 : fontSize * 0.04;
    oc.strokeStyle = '#000';
    // Center text vertically within the canvas (CSS handles nav offset on mobile)
    var textY = H * 0.50;
    oc.strokeText('BrainDock', W / 2, textY);
    oc.fillStyle = '#000';
    oc.fillText('BrainDock', W / 2, textY);

    var data = oc.getImageData(0, 0, off.width, off.height).data;

    // Sample the pixel at the center of each grid cell
    mask = [];
    for (var r = 0; r < rows; r++) {
      mask[r] = [];
      for (var c = 0; c < cols; c++) {
        var cx = Math.floor((c * CELL_W + CELL_W / 2) * dpr);
        var cy = Math.floor((r * CELL_H + CELL_H / 2) * dpr);
        if (cx >= off.width) cx = off.width - 1;
        if (cy >= off.height) cy = off.height - 1;
        var idx = (cy * off.width + cx) * 4;
        mask[r][c] = data[idx + 3] > 25;
      }
    }

    // Drip mask: 2D bleed around text for soft halo (vertical + horizontal)
    dripMask = [];
    for (var r2 = 0; r2 < rows; r2++) {
      dripMask[r2] = [];
      for (var c2 = 0; c2 < cols; c2++) {
        if (mask[r2][c2]) {
          dripMask[r2][c2] = 0;
          continue;
        }
        var nearest = 99;
        for (var dr = -14; dr <= 14; dr++) {
          for (var dc = -30; dc <= 30; dc++) {
            var rr = r2 + dr;
            var cc = c2 + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && mask[rr][cc]) {
              var d = Math.sqrt(dr * dr + dc * dc);
              if (d < nearest) nearest = d;
            }
          }
        }
        dripMask[r2][c2] = nearest < 99 ? Math.max(0, 0.55 - nearest * 0.015) : 0;
      }
    }

    // Center-weight map: elliptical Gaussian falloff for background noise density
    var halfW = W / 2;
    var centerY = H * 0.45; // Match text vertical offset
    centerWeight = [];
    for (var r3 = 0; r3 < rows; r3++) {
      centerWeight[r3] = [];
      for (var c3 = 0; c3 < cols; c3++) {
        var dx = (c3 * CELL_W + CELL_W / 2 - halfW) / halfW;
        var dy = (r3 * CELL_H + CELL_H / 2 - centerY) / (H / 2);
        var d2 = dx * dx * 0.3 + dy * dy * 0.3; // Subtle horizontal fade, gentle vertical
        centerWeight[r3][c3] = Math.exp(-d2 * 1.0);
      }
    }

    // Edge noise map: per-cell random offset for organic/cloud-like fade boundary
    edgeNoise = [];
    for (var r4 = 0; r4 < rows; r4++) {
      edgeNoise[r4] = [];
      for (var c4 = 0; c4 < cols; c4++) {
        edgeNoise[r4][c4] = Math.random() * 0.18; // 0 to 0.18 random offset
      }
    }
  }

  /** Fill grid with random binary chars and stagger rain start positions. */
  function initGrid() {
    grid = [];
    rainY = [];
    settled = false;

    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = Math.random() > 0.5 ? '1' : '0';
      }
    }
    for (var c = 0; c < cols; c++) {
      rainY[c] = -(Math.random() * rows * 1.5);
    }
  }

  var frame = 0;

  /** Main render loop. */
  function draw() {
    frame++;

    ctx.clearRect(0, 0, W, H);

    ctx.font = FONT_SIZE + 'px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Advance rain
    if (!settled) {
      var allDone = true;
      for (var c = 0; c < cols; c++) {
        rainY[c] += 0.5 + Math.random() * 0.3;
        if (rainY[c] < rows + 5) allDone = false;
      }
      if (allDone) settled = true;
    }

    // Draw every cell
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var isText = mask[r][c];
        var drip = dripMask[r][c];
        var rainPos = rainY[c];
        var visible = r <= rainPos;

        // Cursor proximity (0 = far away, 1 = right on cursor)
        var proximity = 0;
        if (mouseCol >= 0) {
          var mdc = c - mouseCol;
          var mdr = r - mouseRow;
          var mDist = Math.sqrt(mdc * mdc + mdr * mdr);
          if (mDist < SPOT_RADIUS) proximity = 1 - mDist / SPOT_RADIUS;
        }

        if (!visible && proximity === 0) continue;

        // Scramble characters (faster near cursor)
        if (proximity > 0.3 && Math.random() < proximity * 0.4) {
          grid[r][c] = Math.random() > 0.5 ? '1' : '0';
        }
        if (!isText && frame % 3 === 0 && Math.random() > 0.95) {
          grid[r][c] = Math.random() > 0.5 ? '1' : '0';
        }
        if (isText && frame % 5 === 0 && Math.random() > 0.92) {
          grid[r][c] = Math.random() > 0.5 ? '1' : '0';
        }

        // Determine opacity
        var dist = rainPos - r;
        var alpha;

        if (isText) {
          alpha = settled ? 1.0 : Math.min(1.0, dist / 2.5);
        } else {
          // Use the brighter of drip halo and background noise - no gaps between zones
          var cw = centerWeight[r][c];
          var baseAlpha = 0.28 * cw;
          var dripAlpha = drip > 0 ? drip : 0;
          alpha = Math.max(dripAlpha, baseAlpha);
          if (!settled) alpha = Math.min(alpha, dist / 6);
        }

        // Soft spotlight glow near cursor
        if (proximity > 0) {
          alpha = Math.min(1.0, alpha + proximity * 0.2);
        }

        // Bottom-only organic fade - digits dissolve well before canvas edge
        var bottomProgress = (r - rows * 0.5) / (rows * 0.5); // 0 at midpoint, 1 at bottom
        if (bottomProgress > 0) {
          var noiseOffset = isText ? 0 : edgeNoise[r][c];
          var fadeFactor = Math.max(0, 1.0 - (bottomProgress - noiseOffset) * 1.6);
          alpha *= fadeFactor;
        }

        if (alpha < 0.01) continue;

        var cx = c * CELL_W + CELL_W / 2;
        var cy = r * CELL_H + CELL_H / 2;
        if (isText) {
          // Pure black, drawn twice for subtle extra weight
          ctx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')';
          ctx.fillText(grid[r][c], cx, cy);
          ctx.fillText(grid[r][c], cx, cy);
        } else {
          ctx.fillStyle = 'rgba(28,28,30,' + alpha.toFixed(3) + ')';
          ctx.fillText(grid[r][c], cx, cy);
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  // Pause when scrolled out of viewport for performance
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !animId && !reducedMotion) draw();
      if (!vis && animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }, { threshold: 0 });
    observer.observe(canvas);
  }

  // Mouse + touch tracking for hover spotlight (skip for reduced-motion)
  if (!reducedMotion) {
    /** Convert a pointer/touch event to grid cell coordinates. */
    function updatePointer(e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
      var y = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;
      mouseCol = Math.floor((x - rect.left) / CELL_W);
      mouseRow = Math.floor((y - rect.top) / CELL_H);
    }
    function clearPointer() {
      mouseCol = -1;
      mouseRow = -1;
    }

    // Mouse
    canvas.addEventListener('mousemove', updatePointer);
    canvas.addEventListener('mouseleave', clearPointer);

    // Touch (passive so it doesn't block scrolling)
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) updatePointer(e);
    }, { passive: true });
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) updatePointer(e);
    }, { passive: true });
    canvas.addEventListener('touchend', clearPointer, { passive: true });
    canvas.addEventListener('touchcancel', clearPointer, { passive: true });
  }

  // --- Init ---
  setup();

  if (reducedMotion) {
    settled = true;
    for (var c = 0; c < cols; c++) rainY[c] = rows + 10;
    draw();
    cancelAnimationFrame(animId);
    animId = null;
  } else {
    draw();
  }

  // Debounced resize handler
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      frame = 0;
      setup();
      if (reducedMotion) {
        settled = true;
        for (var c2 = 0; c2 < cols; c2++) rainY[c2] = rows + 10;
        draw();
        cancelAnimationFrame(animId);
        animId = null;
      } else {
        draw();
      }
    }, 250);
  });
}

// Run binary banner after fonts are loaded (mask needs Inter 800)
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(initBinaryBanner);
} else {
  window.addEventListener('load', initBinaryBanner);
}

/**
 * "How BrainDock Helps" typing animation.
 * Types text one character at a time inside a fake editor mockup,
 * then shows a completion popup. Triggers once when the section
 * scrolls into view via IntersectionObserver.
 */
function initHbhTypingAnimation() {
  const textEl = document.getElementById('hbhTypedText');
  const cursor = document.getElementById('hbhCursor');
  const popup = document.getElementById('hbhCompletePopup');

  if (!textEl) return;

  // Use translated text if available, otherwise fall back to English
  const defaultText =
    'I met the lawyer in a quiet office, discussing contracts, deadlines, and risks. ' +
    'Papers rustled, coffee cooled, and advice flowed calmly, leaving me relieved, ' +
    'informed, and cautiously optimistic about next steps after a long morning.';
  const fullText = (typeof I18n !== 'undefined' && I18n.getTranslation)
    ? (I18n.getTranslation('howBrainDockHelps.typingText') || defaultText)
    : defaultText;

  let started = false;

  /** Types characters with human-like variable speed. */
  function runTyping() {
    let i = 0;

    function typeChar() {
      if (i >= fullText.length) {
        // Typing done: hide cursor, show popup after a short delay
        if (cursor) cursor.classList.add('hidden');
        setTimeout(function () {
          if (popup) popup.classList.add('visible');
        }, 3000);
        return;
      }

      textEl.textContent += fullText[i];
      i++;

      // Variable delay for a realistic typing feel
      var char = fullText[i - 1];
      var delay;
      if (char === '.' || char === '!') {
        delay = 280 + Math.random() * 120;
      } else if (char === ',') {
        delay = 140 + Math.random() * 80;
      } else if (char === ' ') {
        delay = 50 + Math.random() * 50;
      } else {
        delay = 40 + Math.random() * 70;
      }

      setTimeout(typeChar, delay);
    }

    typeChar();
  }

  // Trigger animation when the wrapper scrolls into view (plays once)
  var wrapper = document.querySelector('.hbh-wrapper');
  if (wrapper && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !started) {
            started = true;
            runTyping();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(wrapper);
  } else if (wrapper) {
    // Fallback: run immediately
    runTyping();
  }
}

// Initialise when the DOM is ready
document.addEventListener('DOMContentLoaded', initHbhTypingAnimation);
