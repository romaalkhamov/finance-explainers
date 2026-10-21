(function () {
  var svg = document.getElementById('chart');
  var tooltip = document.getElementById('tooltip');

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

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

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

  function draw(data) {
    var d = dict();
    var xEvery = data.years <= 10 ? 1 : data.years <= 25 ? 5 : 10;
    FEChart.render(svg, tooltip, {
      n: data.nominal.length,
      xTickEvery: xEvery,
      series: [
        { values: data.real, color: 'var(--series-2)', endLabel: d.end_real },
        { values: data.nominal, color: 'var(--series-1)', endLabel: d.end_nominal }
      ],
      tooltipHtml: function (idx) {
        var d2 = dict();
        return '<div class="row"><span class="muted">' + d2.tt_year + '</span><b>' + idx + '</b></div>' +
          '<div class="row"><span class="muted">' + d2.tt_nominal + '</span><b>' + FEChart.fmtMoney(data.nominal[idx]) + '</b></div>' +
          '<div class="row"><span class="muted">' + d2.tt_real + '</span><b>' + FEChart.fmtMoney(data.real[idx]) + '</b></div>';
      }
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
      html = 'За <b>' + data.years + '</b> лет номинальная сумма вырастет до <span class="num">' + FEChart.fmtMoney(finalNominal) +
        '</span>, но в сегодняшней покупательной способности это <span class="num">' + FEChart.fmtMoney(finalReal) +
        '</span> — инфляция «съела» <b>' + eatenPct + '%</b> номинального роста.';
    } else {
      html = 'Over <b>' + data.years + '</b> years the nominal amount grows to <span class="num">' + FEChart.fmtMoney(finalNominal) +
        '</span>, but in today\'s purchasing power that\'s <span class="num">' + FEChart.fmtMoney(finalReal) +
        '</span> — inflation ate <b>' + eatenPct + '%</b> of the nominal growth.';
    }
    els.insight.innerHTML = html;
  }

  function updateLabels() {
    els.vPrincipal.textContent = FEChart.fmtMoney(+els.principal.value);
    els.vRate.textContent = els.rate.value + '%';
    els.vYears.textContent = els.years.value;
    els.vInflation.textContent = els.inflation.value + '%';
  }

  function refresh() {
    updateLabels();
    var data = compute();
    draw(data);
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
