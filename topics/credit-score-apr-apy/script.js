(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function fmtMoney(x) { return '$' + Math.round(x).toLocaleString('en-US'); }

  var gauge = document.getElementById('gauge');
  var CX = 200, CY = 200, R = 160;
  var BANDS = [
    { from: 300, to: 580, color: '#e34948', key: 'band_poor' },
    { from: 580, to: 670, color: '#eb6834', key: 'band_fair' },
    { from: 670, to: 740, color: '#eda100', key: 'band_good' },
    { from: 740, to: 800, color: '#7cb342', key: 'band_verygood' },
    { from: 800, to: 850, color: '#0ca30c', key: 'band_excellent' }
  ];

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

  function angleFor(score) {
    var t = (score - 300) / 550;
    return Math.PI * (1 - t);
  }
  function pt(angle, r) { return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)]; }

  function computeScore() {
    var onTime = +document.getElementById('ontime').value;
    var util = +document.getElementById('util').value;
    var history = +document.getElementById('history').value;
    var mix = +document.getElementById('mix').value;
    var inquiries = +document.getElementById('inquiries').value;

    var s01 = 0.35 * (onTime / 100)
      + 0.30 * ((100 - util) / 100)
      + 0.15 * Math.min(history / 10, 1)
      + 0.10 * ((mix - 1) / 5)
      + 0.10 * ((10 - inquiries) / 10);
    s01 = Math.max(0, Math.min(1, s01));
    return Math.round(300 + s01 * 550);
  }

  function bandFor(score) {
    return BANDS.find(function (b) { return score >= b.from && score < b.to; }) || BANDS[BANDS.length - 1];
  }

  function drawGauge(score) {
    gauge.innerHTML = '';
    BANDS.forEach(function (b) {
      var a0 = angleFor(b.from), a1 = angleFor(b.to);
      var p0 = pt(a0, R), p1 = pt(a1, R);
      var large = 0;
      var d = 'M ' + p0[0] + ' ' + p0[1] + ' A ' + R + ' ' + R + ' 0 ' + large + ' 0 ' + p1[0] + ' ' + p1[1];
      gauge.appendChild(el('path', { d: d, fill: 'none', stroke: b.color, 'stroke-width': 26, 'stroke-linecap': 'butt' }));
    });
    var needleAngle = angleFor(score);
    var tip = pt(needleAngle, R - 36);
    gauge.appendChild(el('line', { x1: CX, y1: CY, x2: tip[0], y2: tip[1], style: 'stroke:var(--text-primary);stroke-width:4;stroke-linecap:round' }));
    gauge.appendChild(el('circle', { cx: CX, cy: CY, r: 9, style: 'fill:var(--text-primary)' }));

    var scoreText = el('text', { x: CX, y: CY - 50, 'text-anchor': 'middle', style: 'font-size:42px;font-weight:700;fill:var(--text-primary);font-family:system-ui,sans-serif' });
    scoreText.textContent = score;
    gauge.appendChild(scoreText);

    var band = bandFor(score);
    var bandText = el('text', { x: CX, y: CY - 16, 'text-anchor': 'middle', style: 'font-size:15px;fill:' + band.color + ';font-family:system-ui,sans-serif;font-weight:600' });
    bandText.textContent = dict()[band.key];
    gauge.appendChild(bandText);

    [300, 580, 670, 740, 800, 850].forEach(function (s) {
      var a = angleFor(s), p = pt(a, R + 16);
      var t = el('text', { x: p[0], y: p[1] + 4, 'text-anchor': 'middle', class: 'axis-label' });
      t.textContent = s;
      gauge.appendChild(t);
    });
  }

  function refreshScore() {
    ['ontime', 'util', 'history', 'mix', 'inquiries'].forEach(function (id) {
      var el2 = document.getElementById(id);
      var v = document.getElementById('v-' + id);
      v.textContent = (id === 'ontime' || id === 'util') ? el2.value + '%' : el2.value;
    });
    var score = computeScore();
    drawGauge(score);
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var band = bandFor(score);
    var insight = document.getElementById('insight-text');
    if (lang === 'ru') {
      insight.innerHTML = 'Рейтинг <b>' + score + '</b> (' + dict()[band.key].toLowerCase() + ') сильнее всего зависит от платежей вовремя (35%) и использования лимита (30%) — это две трети результата.';
    } else {
      insight.innerHTML = 'A score of <b>' + score + '</b> (' + dict()[band.key].toLowerCase() + ') is driven mostly by on-time payments (35%) and utilization (30%) — together two-thirds of the result.';
    }
  }

  var compoundN = 12;
  function refreshApr() {
    var apr = +document.getElementById('apr').value / 100;
    var apy = Math.pow(1 + apr / compoundN, compoundN) - 1;
    document.getElementById('v-apr').textContent = (apr * 100).toFixed(1) + '%';
    document.getElementById('st-apr').textContent = (apr * 100).toFixed(1) + '%';
    document.getElementById('st-apy').textContent = (apy * 100).toFixed(1) + '%';
    document.getElementById('meter-apr').style.width = Math.min(100, apr / 0.35 * 100) + '%';
    document.getElementById('meter-apy').style.width = Math.min(100, apy / 0.35 * 100) + '%';
  }

  ['ontime', 'util', 'history', 'mix', 'inquiries'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', refreshScore);
  });
  document.getElementById('apr').addEventListener('input', refreshApr);
  document.getElementById('freq-seg').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button');
    if (!btn) return;
    this.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    compoundN = +btn.getAttribute('data-n');
    refreshApr();
  });
  document.addEventListener('fe-lang-changed', function () { refreshScore(); refreshApr(); });

  refreshScore();
  refreshApr();
})();
