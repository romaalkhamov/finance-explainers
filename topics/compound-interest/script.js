(function () {
  var svg = document.getElementById('chart');
  var tooltip = document.getElementById('tooltip');
  var chartWrap = svg.closest('.chart-wrap');

  var els = {
    principal: document.getElementById('principal'),
    rate: document.getElementById('rate'),
    years: document.getElementById('years'),
    inflation: document.getElementById('inflation'),
    vPrincipal: document.getElementById('v-principal'),
    vRate: document.getElementById('v-rate'),
    vYears: document.getElementById('v-years'),
    vInflation: document.getElementById('v-inflation'),
    insight: document.getElementById('insight-text')
  };

  var compoundN = 1;
  var W = 760, H = 360, padL = 56, padR = 16, padT = 20, padB = 36;
  var plotW = W - padL - padR, plotH = H - padT - padB;
  var state = null; // { years, nominal[], real[], xScale, yScale }

  function fmtMoney(x) {
    return '$' + Math.round(x).toLocaleString('en-US');
  }
  function niceMax(v) {
    var exp = Math.pow(10, Math.floor(Math.log10(v || 1)));
    var f = v / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  function compute() {
    var principal = +els.principal.value;
    var rate = +els.rate.value / 100;
    var years = +els.years.value;
    var inflation = +els.inflation.value / 100;

    var nominal = [], real = [];
    for (var t = 0; t <= years; t++) {
      var nom = principal * Math.pow(1 + rate / compoundN, compoundN * t);
      nominal.push(nom);
      real.push(nom / Math.pow(1 + inflation, t));
    }
    return { principal: principal, rate: rate, years: years, inflation: inflation, nominal: nominal, real: real };
  }

  function el(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function render(data) {
    svg.innerHTML = '';
    var maxVal = niceMax(Math.max.apply(null, data.nominal) * 1.08);
    var xScale = function (t) { return padL + (t / data.years) * plotW; };
    var yScale = function (v) { return padT + plotH - (v / maxVal) * plotH; };
    state = Object.assign({}, data, { xScale: xScale, yScale: yScale, maxVal: maxVal });

    // gridlines + y labels
    var steps = 4;
    for (var i = 0; i <= steps; i++) {
      var v = (maxVal / steps) * i;
      var y = yScale(v);
      svg.appendChild(el('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: i === 0 ? 'baseline' : 'gridline' }));
      var lbl = el('text', { x: padL - 8, y: y + 4, class: 'axis-label', 'text-anchor': 'end' });
      lbl.textContent = fmtMoney(v);
      svg.appendChild(lbl);
    }

    // x labels
    var xTickEvery = data.years <= 10 ? 1 : data.years <= 25 ? 5 : 10;
    for (var t = 0; t <= data.years; t += xTickEvery) {
      var xl = el('text', { x: xScale(t), y: H - padB + 20, class: 'axis-label', 'text-anchor': 'middle' });
      xl.textContent = t;
      svg.appendChild(xl);
    }

    function path(values, color) {
      var d = values.map(function (v, idx) {
        return (idx === 0 ? 'M' : 'L') + xScale(idx) + ',' + yScale(v);
      }).join(' ');
      svg.appendChild(el('path', { d: d, class: 'series-line', style: 'stroke:' + color }));
    }
    path(data.real, 'var(--series-2)');
    path(data.nominal, 'var(--series-1)');

    // end labels
    function endLabel(values, dy, color, key) {
      var x = xScale(values.length - 1) + 8;
      var y = yScale(values[values.length - 1]) + dy;
      var g = el('g', {});
      g.appendChild(el('circle', { cx: x, cy: y - 4, r: 3, style: 'fill:' + color }));
      var t2 = el('text', { x: x + 8, y: y, class: 'end-label' });
      t2.setAttribute('data-end-label', key);
      svg.appendChild(g);
      svg.appendChild(t2);
    }
    endLabel(data.nominal, 0, 'var(--series-1)', 'nominal');
    endLabel(data.real, data.real[data.real.length - 1] === data.nominal[data.nominal.length - 1] ? 14 : 0, 'var(--series-2)', 'real');

    // hover layer
    var hoverDotNom = el('circle', { r: 5, class: 'hover-dot', style: 'stroke:var(--series-1)', visibility: 'hidden' });
    var hoverDotReal = el('circle', { r: 5, class: 'hover-dot', style: 'stroke:var(--series-2)', visibility: 'hidden' });
    var crosshair = el('line', { class: 'crosshair', y1: padT, y2: H - padB, visibility: 'hidden' });
    svg.appendChild(crosshair);
    svg.appendChild(hoverDotNom);
    svg.appendChild(hoverDotReal);

    var capture = el('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent' });
    capture.style.cursor = 'crosshair';
    svg.appendChild(capture);

    capture.addEventListener('mousemove', function (ev) {
      var rect = svg.getBoundingClientRect();
      var svgX = ((ev.clientX - rect.left) / rect.width) * W;
      var t = Math.round(((svgX - padL) / plotW) * data.years);
      t = Math.max(0, Math.min(data.years, t));
      var x = xScale(t);
      crosshair.setAttribute('x1', x); crosshair.setAttribute('x2', x); crosshair.setAttribute('visibility', 'visible');
      hoverDotNom.setAttribute('cx', x); hoverDotNom.setAttribute('cy', yScale(data.nominal[t])); hoverDotNom.setAttribute('visibility', 'visible');
      hoverDotReal.setAttribute('cx', x); hoverDotReal.setAttribute('cy', yScale(data.real[t])); hoverDotReal.setAttribute('visibility', 'visible');

      var lang = (window.FE && window.FE.getLang()) || 'ru';
      var dict = window.I18N[lang];
      tooltip.innerHTML =
        '<div class="row"><span class="muted">' + dict.tt_year + '</span><b>' + t + '</b></div>' +
        '<div class="row"><span class="muted">' + dict.tt_nominal + '</span><b>' + fmtMoney(data.nominal[t]) + '</b></div>' +
        '<div class="row"><span class="muted">' + dict.tt_real + '</span><b>' + fmtMoney(data.real[t]) + '</b></div>';
      tooltip.style.visibility = 'visible';
      var scale = rect.width / W;
      var left = x * scale + 14;
      if (left + 140 > rect.width) left = x * scale - 154;
      tooltip.style.left = left + 'px';
      tooltip.style.top = (yScale(data.nominal[t]) * scale - 10) + 'px';
    });
    capture.addEventListener('mouseleave', function () {
      crosshair.setAttribute('visibility', 'hidden');
      hoverDotNom.setAttribute('visibility', 'hidden');
      hoverDotReal.setAttribute('visibility', 'hidden');
      tooltip.style.visibility = 'hidden';
    });

    applyEndLabelText();
  }

  function applyEndLabelText() {
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var dict = window.I18N[lang];
    svg.querySelectorAll('[data-end-label]').forEach(function (t2) {
      var key = t2.getAttribute('data-end-label');
      t2.textContent = key === 'nominal' ? dict.end_nominal : dict.end_real;
    });
  }

  function renderInsight(data) {
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var finalNominal = data.nominal[data.nominal.length - 1];
    var finalReal = data.real[data.real.length - 1];
    var eatenPct = Math.round((1 - (finalReal - data.principal) / (finalNominal - data.principal || 1)) * 100);
    eatenPct = Math.max(0, Math.min(99, eatenPct));

    var html;
    if (lang === 'ru') {
      html = 'За <b>' + data.years + '</b> лет номинальная сумма вырастет до <span class="num">' + fmtMoney(finalNominal) +
        '</span>, но в сегодняшней покупательной способности это <span class="num">' + fmtMoney(finalReal) +
        '</span> — инфляция «съела» <b>' + eatenPct + '%</b> номинального роста.';
    } else {
      html = 'Over <b>' + data.years + '</b> years the nominal amount grows to <span class="num">' + fmtMoney(finalNominal) +
        '</span>, but in today\'s purchasing power that\'s <span class="num">' + fmtMoney(finalReal) +
        '</span> — inflation ate <b>' + eatenPct + '%</b> of the nominal growth.';
    }
    els.insight.innerHTML = html;
  }

  function updateLabels() {
    els.vPrincipal.textContent = fmtMoney(+els.principal.value);
    els.vRate.textContent = els.rate.value + '%';
    els.vYears.textContent = els.years.value;
    els.vInflation.textContent = els.inflation.value + '%';
  }

  function refresh() {
    updateLabels();
    var data = compute();
    render(data);
    renderInsight(data);
  }

  [els.principal, els.rate, els.years, els.inflation].forEach(function (input) {
    input.addEventListener('input', refresh);
  });

  document.getElementById('compound-seg').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button');
    if (!btn) return;
    this.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    compoundN = +btn.getAttribute('data-n');
    refresh();
  });

  document.addEventListener('fe-lang-changed', refresh);

  refresh();
})();
