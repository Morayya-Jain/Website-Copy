/**
 * BrainDock Internationalization (i18n) Module
 * Handles language switching, translation loading, and DOM updates
 */

const I18n = {
  // Configuration
  STORAGE_KEY: 'braindock-language',
  SCROLL_KEY: 'braindock-scroll-position',
  DEFAULT_LANG: 'en',
  SUPPORTED_LANGUAGES: ['en', 'ja', 'de', 'fr', 'zh', 'hi'],
  
  // Current translations cache
  translations: null,
  currentLang: null,

  /**
   * Initialize the i18n system.
   * Called on page load to set up translations and language toggle.
   */
  async init() {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    this.currentLang = this.getSavedLanguage();
    
    // Load translations
    await this.loadTranslations(this.currentLang);
    
    // Apply translations to the page
    this.applyTranslations();
    
    // Initialize language toggle dropdown
    this.initLanguageToggle();
    
    // Restore scroll position after language change
    this.restoreScrollPosition();
  },

  /**
   * Get the saved language from localStorage, or return default.
   * @returns {string} Language code
   */
  getSavedLanguage() {
    // Check URL query parameter first (for hreflang support)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && this.SUPPORTED_LANGUAGES.includes(urlLang)) {
      this.saveLanguage(urlLang);
      // Strip ?lang= from URL so it doesn't override future language toggle changes
      urlParams.delete('lang');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      history.replaceState(null, '', newUrl);
      return urlLang;
    }

    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved && this.SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }
    return this.DEFAULT_LANG;
  },

  /**
   * Save language preference to localStorage.
   * @param {string} lang - Language code
   */
  saveLanguage(lang) {
    localStorage.setItem(this.STORAGE_KEY, lang);
  },

  /**
   * Load translation JSON file for the specified language.
   * @param {string} lang - Language code
   */
  async loadTranslations(lang) {
    try {
      // Determine the base path (handle both root and subdirectory pages)
      const basePath = this.getBasePath();
      const response = await fetch(`${basePath}js/translations/${lang}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${lang}`);
      }
      
      this.translations = await response.json();
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to English if loading fails
      if (lang !== this.DEFAULT_LANG) {
        await this.loadTranslations(this.DEFAULT_LANG);
      }
    }
  },

  /**
   * Get base path for assets based on current page location.
   * @returns {string} Base path
   */
  getBasePath() {
    // Use absolute path so translations load from any page location
    return '/';
  },

  /**
   * Get a nested translation value using dot notation.
   * @param {string} key - Translation key (e.g., "nav.features")
   * @returns {string|null} Translation value or null if not found
   */
  getTranslation(key) {
    if (!this.translations) return null;
    
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return typeof value === 'string' ? value : null;
  },

  /**
   * Apply translations to all elements with data-i18n attributes.
   */
  applyTranslations() {
    if (!this.translations) return;

    // Update page title
    this.updatePageTitle();
    
    // Update html lang attribute
    document.documentElement.lang = this.currentLang;

    // Update all elements with data-i18n attribute (text content)
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.getTranslation(key);
      if (translation) {
        element.textContent = translation;
      }
    });

    // Update all elements with data-i18n-html attribute (HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      const translation = this.getTranslation(key);
      if (translation) {
        element.innerHTML = translation;
      }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.getTranslation(key);
      if (translation) {
        element.placeholder = translation;
      }
    });

    // Update alt attributes on images
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
      const key = element.getAttribute('data-i18n-alt');
      const translation = this.getTranslation(key);
      if (translation) {
        element.setAttribute('alt', translation);
      }
    });

    // Update the current language display in the toggle
    this.updateLanguageToggleDisplay();
  },

  /**
   * Update the page title based on current page.
   */
  updatePageTitle() {
    const path = window.location.pathname.toLowerCase();
    let titleKey = 'meta.title.index';
    
    if (path.includes('privacy')) {
      titleKey = 'meta.title.privacy';
    } else if (path.includes('terms')) {
      titleKey = 'meta.title.terms';
    } else if (path.includes('about')) {
      titleKey = 'meta.title.about';
    }
    
    const title = this.getTranslation(titleKey);
    if (title) {
      document.title = title;
    }
  },

  /**
   * Initialize the language toggle dropdown functionality.
   * Handles footer language selector.
   */
  initLanguageToggle() {
    // Footer language selector
    const footerToggle = document.querySelector('.language-toggle');
    const footerDropdown = document.querySelector('.language-dropdown');
    
    // Store all toggle/dropdown pairs for unified handling
    const selectors = [];
    
    if (footerToggle && footerDropdown) {
      selectors.push({ toggle: footerToggle, dropdown: footerDropdown });
    }
    
    if (selectors.length === 0) return;
    
    // Initialize each language selector
    selectors.forEach(({ toggle, dropdown }) => {
      // Toggle dropdown on button click
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close other dropdowns first
        selectors.forEach(({ toggle: otherToggle, dropdown: otherDropdown }) => {
          if (otherToggle !== toggle) {
            otherToggle.setAttribute('aria-expanded', 'false');
            otherDropdown.classList.remove('active');
          }
        });
        
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        dropdown.classList.toggle('active');
      });

      // Handle language selection (click + keyboard)
      const langOptions = dropdown.querySelectorAll('[data-lang]');
      langOptions.forEach((option, idx) => {
        function selectLang(e) {
          e.stopPropagation();
          const newLang = option.getAttribute('data-lang');
          if (newLang && newLang !== I18n.currentLang) {
            I18n.changeLanguage(newLang);
          }
          toggle.setAttribute('aria-expanded', 'false');
          dropdown.classList.remove('active');
        }
        option.addEventListener('click', selectLang);
        option.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectLang(e);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = langOptions[(idx + 1) % langOptions.length];
            if (next) next.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = langOptions[(idx - 1 + langOptions.length) % langOptions.length];
            if (prev) prev.focus();
          }
        });
      });
    });

    // Close all dropdowns when clicking outside
    document.addEventListener('click', () => {
      selectors.forEach(({ toggle, dropdown }) => {
        toggle.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('active');
      });
    });

    // Close all on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        selectors.forEach(({ toggle, dropdown }) => {
          toggle.setAttribute('aria-expanded', 'false');
          dropdown.classList.remove('active');
        });
      }
    });

    // Mark current language as selected
    this.updateLanguageToggleDisplay();
  },

  /**
   * Update the language toggle to show current language.
   * Handles footer language selector.
   */
  updateLanguageToggleDisplay() {
    const langName = this.getTranslation(`language.${this.currentLang}`);
    
    // Update footer language selector display text
    const footerCurrentDisplay = document.querySelector('.language-current');
    if (footerCurrentDisplay && langName) {
      footerCurrentDisplay.textContent = langName;
    }

    // Update selected state in footer dropdown
    document.querySelectorAll('.language-dropdown [data-lang]').forEach(option => {
      const lang = option.getAttribute('data-lang');
      option.classList.toggle('selected', lang === this.currentLang);
      option.setAttribute('aria-selected', lang === this.currentLang);
    });
  },

  /**
   * Change the current language and refresh the page.
   * @param {string} newLang - New language code
   */
  changeLanguage(newLang) {
    if (!this.SUPPORTED_LANGUAGES.includes(newLang)) {
      console.error(`Unsupported language: ${newLang}`);
      return;
    }

    // Save scroll position before reload
    this.saveScrollPosition();

    // Save the new language preference
    this.saveLanguage(newLang);
    
    // Refresh the page to apply the new language
    window.location.reload();
  },

  /**
   * Save current scroll position to sessionStorage.
   */
  saveScrollPosition() {
    const scrollY = window.scrollY;
    sessionStorage.setItem(this.SCROLL_KEY, scrollY.toString());
  },

  /**
   * Restore scroll position from sessionStorage after language change.
   */
  restoreScrollPosition() {
    const savedPosition = sessionStorage.getItem(this.SCROLL_KEY);
    
    if (savedPosition === null) return;
    
    const scrollY = parseInt(savedPosition, 10);
    
    // Clear immediately to prevent multiple restorations
    sessionStorage.removeItem(this.SCROLL_KEY);
    
    // Function to perform the scroll
    const doScroll = () => {
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
    
    // Wait for fonts to load, then scroll
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        // Double requestAnimationFrame ensures layout is complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            doScroll();
          });
        });
      });
    } else {
      // Fallback for browsers without font loading API
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          doScroll();
        });
      });
    }
  }
};

// Initialize i18n when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  I18n.init();
});
