(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function fmtMoney(x) { return '$' + Math.round(x).toLocaleString('en-US'); }

  var BRACKETS = [
    { from: 0, to: 11600, rate: 0.10, color: '#86b6ef' },
    { from: 11600, to: 47150, rate: 0.12, color: '#6da7ec' },
    { from: 47150, to: 100525, rate: 0.22, color: '#5598e7' },
    { from: 100525, to: 191950, rate: 0.24, color: '#3987e5' },
    { from: 191950, to: 243725, rate: 0.32, color: '#2a78d6' },
    { from: 243725, to: 609350, rate: 0.35, color: '#1c5cab' },
    { from: 609350, to: Infinity, rate: 0.37, color: '#104281' }
  ];
  var DOMAIN_MAX = 700000;

  var svg = document.getElementById('brackets');
  var tooltip = document.getElementById('tooltip');
  var incomeInput = document.getElementById('income');
  var vIncome = document.getElementById('v-income');
  var insight = document.getElementById('insight-text');
  var stMarginal = document.getElementById('st-marginal');
  var stEffective = document.getElementById('st-effective');
  var stTax = document.getElementById('st-tax');
  var meterMarginal = document.getElementById('meter-marginal');
  var meterEffective = document.getElementById('meter-effective');

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

  function computeTax(income) {
    var tax = 0, marginal = BRACKETS[0].rate;
    BRACKETS.forEach(function (b) {
      if (income > b.from) {
        var top = Math.min(income, b.to);
        tax += (top - b.from) * b.rate;
        marginal = b.rate;
      }
    });
    return { tax: tax, marginal: marginal, effective: income > 0 ? tax / income : 0 };
  }

  function xScale(v) { return (Math.min(v, DOMAIN_MAX) / DOMAIN_MAX) * 760; }

  function draw(income) {
    svg.innerHTML = '';
    var barY = 10, barH = 44;
    BRACKETS.forEach(function (b) {
      var x0 = xScale(b.from), x1 = xScale(Math.min(b.to, DOMAIN_MAX));
      if (x1 <= x0) return;
      var reached = income > b.from;
      var rect = el('rect', { x: x0, y: barY, width: x1 - x0, height: barH, fill: b.color, opacity: reached ? 1 : 0.22, 'data-from': b.from, 'data-to': b.to, 'data-rate': b.rate });
      svg.appendChild(rect);
      if (x1 - x0 > 30) {
        var label = el('text', { x: (x0 + x1) / 2, y: barY + barH / 2 + 4, 'text-anchor': 'middle', style: 'fill:#fff;font-size:11px;font-family:system-ui,sans-serif;font-weight:600' });
        label.textContent = Math.round(b.rate * 100) + '%';
        svg.appendChild(label);
      }
    });
    // income marker
    var mx = xScale(income);
    svg.appendChild(el('line', { x1: mx, x2: mx, y1: barY - 6, y2: barY + barH + 6, style: 'stroke:var(--text-primary);stroke-width:2' }));
    var mLabel = el('text', { x: Math.min(Math.max(mx, 30), 730), y: barY - 12, 'text-anchor': 'middle', class: 'axis-label' });
    mLabel.textContent = fmtMoney(income);
    svg.appendChild(mLabel);

    // bottom axis ticks at bracket boundaries
    BRACKETS.forEach(function (b) {
      if (b.from === 0) return;
      var x = xScale(b.from);
      var t = el('text', { x: x, y: barY + barH + 20, 'text-anchor': 'middle', class: 'axis-label' });
      t.textContent = '$' + Math.round(b.from / 1000) + 'k';
      svg.appendChild(t);
    });

    var capture = el('rect', { x: 0, y: barY, width: 760, height: barH, fill: 'transparent' });
    capture.style.cursor = 'crosshair';
    svg.appendChild(capture);
    capture.addEventListener('mousemove', function (ev) {
      var rect = svg.getBoundingClientRect();
      var svgX = ((ev.clientX - rect.left) / rect.width) * 760;
      var val = (svgX / 760) * DOMAIN_MAX;
      var b = BRACKETS.find(function (b) { return val >= b.from && val < b.to; }) || BRACKETS[BRACKETS.length - 1];
      var d = dict();
      tooltip.innerHTML = '<div class="row"><span class="muted">' + d.tt_range + '</span><b>' + fmtMoney(b.from) + (b.to === Infinity ? '+' : ' – ' + fmtMoney(b.to)) + '</b></div>' +
        '<div class="row"><span class="muted">' + d.tt_rate + '</span><b>' + Math.round(b.rate * 100) + '%</b></div>';
      tooltip.style.visibility = 'visible';
      var scale = rect.width / 760;
      var left = svgX * scale + 10;
      if (left + 160 > rect.width) left = svgX * scale - 170;
      tooltip.style.left = left + 'px';
      tooltip.style.top = (barY * scale) + 'px';
    });
    capture.addEventListener('mouseleave', function () { tooltip.style.visibility = 'hidden'; });
  }

  function renderInsight(income, r) {
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var html;
    if (lang === 'ru') {
      html = 'При доходе <span class="num">' + fmtMoney(income) + '</span> последний доллар облагается по <b>' + Math.round(r.marginal * 100) + '%</b>, но в среднем по всем ступеням ты платишь лишь <b>' + (r.effective * 100).toFixed(1) + '%</b> дохода — потому что нижние ступени всегда облагаются по низким ставкам, независимо от того, насколько ты богат.';
    } else {
      html = 'At <span class="num">' + fmtMoney(income) + '</span> income, the last dollar is taxed at <b>' + Math.round(r.marginal * 100) + '%</b>, but averaged across all the brackets below it you only pay <b>' + (r.effective * 100).toFixed(1) + '%</b> of income — because the lower brackets are always taxed at their lower rates, no matter how high your income climbs.';
    }
    insight.innerHTML = html;
  }

  function refresh() {
    var income = +incomeInput.value;
    vIncome.textContent = fmtMoney(income);
    var r = computeTax(income);
    draw(income);
    renderInsight(income, r);
    stMarginal.textContent = Math.round(r.marginal * 100) + '%';
    stEffective.textContent = (r.effective * 100).toFixed(1) + '%';
    stTax.textContent = fmtMoney(r.tax);
    meterMarginal.style.width = Math.round(r.marginal / 0.4 * 100) + '%';
    meterEffective.style.width = Math.round(r.effective / 0.4 * 100) + '%';
  }

  incomeInput.addEventListener('input', refresh);
  document.addEventListener('fe-lang-changed', refresh);
  refresh();
})();
