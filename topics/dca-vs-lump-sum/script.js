(function () {
  var svg = document.getElementById('chart');
  var tooltip = document.getElementById('tooltip');

  var els = {
    amount: document.getElementById('amount'),
    dcaMonths: document.getElementById('dcaMonths'),
    years: document.getElementById('years'),
    expReturn: document.getElementById('expReturn'),
    vol: document.getElementById('vol'),
    vAmount: document.getElementById('v-amount'),
    vDca: document.getElementById('v-dca'),
    vYears: document.getElementById('v-years'),
    vReturn: document.getElementById('v-return'),
    vVol: document.getElementById('v-vol'),
    insight: document.getElementById('insight-text'),
    stRuns: document.getElementById('st-runs'),
    stLumpWins: document.getElementById('st-lumpwins')
  };

  var runs = 0, lumpWins = 0;
  var lastData = null;

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

  function gaussian() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function simulate() {
    var amount = +els.amount.value;
    var dcaMonths = Math.min(+els.dcaMonths.value, +els.years.value * 12);
    var months = +els.years.value * 12;
    var mu = +els.expReturn.value / 100;
    var sigma = +els.vol.value / 100;

    var price = [100];
    for (var m = 1; m <= months; m++) {
      var z = gaussian();
      price.push(price[m - 1] * Math.exp((mu - 0.5 * sigma * sigma) / 12 + (sigma / Math.sqrt(12)) * z));
    }

    var lumpShares = amount / price[0];
    var lumpValue = price.map(function (p) { return lumpShares * p; });

    var perMonth = amount / dcaMonths;
    var dcaShares = 0;
    var dcaValue = [];
    for (var t = 0; t <= months; t++) {
      if (t < dcaMonths) dcaShares += perMonth / price[t];
      dcaValue.push(dcaShares * price[t]);
    }

    return { months: months, price: price, lumpValue: lumpValue, dcaValue: dcaValue, amount: amount, dcaMonths: dcaMonths };
  }

  function draw(data) {
    var d = dict();
    var xEvery = data.months <= 60 ? 12 : 24;
    FEChart.render(svg, tooltip, {
      n: data.lumpValue.length,
      xTickEvery: xEvery,
      xTickLabel: function (i) { return Math.round(i / 12); },
      series: [
        { values: data.dcaValue, color: 'var(--series-2)', endLabel: d.end_dca },
        { values: data.lumpValue, color: 'var(--series-1)', endLabel: d.end_lump }
      ],
      tooltipHtml: function (idx) {
        var d2 = dict();
        return '<div class="row"><span class="muted">' + d2.tt_month + '</span><b>' + idx + '</b></div>' +
          '<div class="row"><span class="muted">' + d2.tt_lump + '</span><b>' + FEChart.fmtMoney(data.lumpValue[idx]) + '</b></div>' +
          '<div class="row"><span class="muted">' + d2.tt_dca + '</span><b>' + FEChart.fmtMoney(data.dcaValue[idx]) + '</b></div>';
      }
    });
  }

  function renderInsight(data, isNewRun) {
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var finalLump = data.lumpValue[data.lumpValue.length - 1];
    var finalDca = data.dcaValue[data.dcaValue.length - 1];
    var winner = finalLump > finalDca ? 'lump' : 'dca';
    if (isNewRun) { runs++; if (winner === 'lump') lumpWins++; }
    els.stRuns.textContent = runs;
    var pct = Math.round((lumpWins / runs) * 100);
    els.stLumpWins.textContent = lumpWins + ' (' + pct + '%)';

    var diff = Math.abs(finalLump - finalDca);
    var html;
    if (lang === 'ru') {
      html = (winner === 'lump'
        ? 'В этом прогоне разовая инвестиция обогнала DCA на <span class="num">' + FEChart.fmtMoney(diff) + '</span>'
        : 'В этом прогоне DCA обогнал разовую инвестицию на <span class="num">' + FEChart.fmtMoney(diff) + '</span>')
        + ' за ' + (data.months / 12) + ' лет. Исторически разовая инвестиция побеждает чаще — потому что рынки в среднем растут, и каждый месяц ожидания вне рынка стоит упущенного роста.';
    } else {
      html = (winner === 'lump'
        ? 'In this run, lump sum beat DCA by <span class="num">' + FEChart.fmtMoney(diff) + '</span>'
        : 'In this run, DCA beat lump sum by <span class="num">' + FEChart.fmtMoney(diff) + '</span>')
        + ' over ' + (data.months / 12) + ' years. Historically lump sum wins more often — markets trend up on average, so every month spent waiting on the sidelines costs expected growth.';
    }
    els.insight.innerHTML = html;
  }

  function updateLabels() {
    els.vAmount.textContent = FEChart.fmtMoney(+els.amount.value);
    els.vDca.textContent = els.dcaMonths.value;
    els.vYears.textContent = els.years.value;
    els.vReturn.textContent = els.expReturn.value + '%';
    els.vVol.textContent = els.vol.value + '%';
  }

  function refresh(isNewRun) {
    updateLabels();
    lastData = simulate();
    draw(lastData);
    renderInsight(lastData, isNewRun !== false);
  }

  [els.amount, els.dcaMonths, els.years, els.expReturn, els.vol].forEach(function (input) {
    input.addEventListener('input', function () { runs = 0; lumpWins = 0; refresh(true); });
  });
  document.getElementById('reroll').addEventListener('click', function () { refresh(true); });
  document.addEventListener('fe-lang-changed', function () { updateLabels(); draw(lastData); renderInsight(lastData, false); });

  refresh(true);
})();
