(function () {
  var root = document.documentElement;

  function getTheme() {
    return localStorage.getItem('fe-theme') || 'auto';
  }
  function setTheme(t) {
    localStorage.setItem('fe-theme', t);
    if (t === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', t);
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
    document.dispatchEvent(new CustomEvent('fe-theme-changed'));
  }

  function getLang() {
    return localStorage.getItem('fe-lang') || 'ru';
  }
  function applyI18n(lang) {
    localStorage.setItem('fe-lang', lang);
    root.setAttribute('lang', lang);
    var dict = window.I18N && window.I18N[lang];
    if (dict) {
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (dict[key] != null) el.textContent = dict[key];
      });
    }
    var btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang === 'ru' ? 'EN' : 'RU';
    document.dispatchEvent(new CustomEvent('fe-lang-changed', { detail: { lang: lang } }));
  }

  function initTopbarControls() {
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var current = getTheme();
        var mq = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var effectiveDark = current === 'dark' || (current === 'auto' && mq);
        setTheme(effectiveDark ? 'light' : 'dark');
      });
    }
    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        applyI18n(getLang() === 'ru' ? 'en' : 'ru');
      });
    }
  }

  setTheme(getTheme());
  document.addEventListener('DOMContentLoaded', function () {
    initTopbarControls();
    applyI18n(getLang());
  });

  window.FE = { getLang: getLang, applyI18n: applyI18n };
})();
