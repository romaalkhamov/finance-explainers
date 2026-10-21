(function () {
  var svg = document.getElementById('chart');
  var tooltip = document.getElementById('tooltip');
  var N_PATHS = 50;

  var els = {
    portfolio: document.getElementById('portfolio'), withdraw: document.getElementById('withdraw'),
    years: document.getElementById('years'), expReturn: document.getElementById('expReturn'), vol: document.getElementById('vol'),
    vPortfolio: document.getElementById('v-portfolio'), vWithdraw: document.getElementById('v-withdraw'),
    vYears: document.getElementById('v-years'), vReturn: document.getElementById('v-return'), vVol: document.getElementById('v-vol'),
    insight: document.getElementById('insight-text'),
    stSuccess: document.getElementById('st-success'), stWorst: document.getElementById('st-worst')
  };

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

  function gaussian() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function simulate() {
    var portfolio = +els.portfolio.value;
    var withdrawRate = +els.withdraw.value / 100;
    var years = +els.years.value;
    var mu = +els.expReturn.value / 100;
    var sigma = +els.vol.value / 100;
    var withdrawal = portfolio * withdrawRate;

    var paths = [];
    for (var p = 0; p < N_PATHS; p++) {
      var bal = [portfolio];
      var ruined = false;
      for (var t = 1; t <= years; t++) {
        var prev = bal[t - 1];
        if (ruined || prev <= 0) { bal.push(0); continue; }
        var ret = mu + sigma * gaussian();
        var next = Math.max(0, prev * (1 + ret) - withdrawal);
        if (next <= 0) ruined = true;
        bal.push(next);
      }
      paths.push(bal);
    }

    var median = [];
    for (var t2 = 0; t2 <= years; t2++) {
      var vals = paths.map(function (p) { return p[t2]; }).sort(function (a, b) { return a - b; });
      median.push(vals[Math.floor(vals.length / 2)]);
    }

    var successCount = paths.filter(function (p) { return Math.min.apply(null, p) > 0; }).length;
    var finals = paths.map(function (p) { return p[p.length - 1]; });
    var worst = Math.min.apply(null, finals);

    return { years: years, paths: paths, median: median, successRate: successCount / N_PATHS, worst: worst };
  }

  function draw(data) {
    var d = dict();
    var xEvery = data.years <= 20 ? 5 : 10;
    var series = data.paths.map(function (p) { return { values: p, color: 'var(--series-1)', width: 1, opacity: 0.18, skipHover: true }; });
    series.push({ values: data.median, color: 'var(--series-2)', width: 3, endLabel: d.end_median });
    FEChart.render(svg, tooltip, {
      n: data.years + 1,
      padL: 70,
      xTickEvery: xEvery,
      series: series,
      tooltipHtml: function (idx) {
        var d2 = dict();
        return '<div class="row"><span class="muted">' + d2.tt_year + '</span><b>' + idx + '</b></div>' +
          '<div class="row"><span class="muted">' + d2.tt_median + '</span><b>' + FEChart.fmtMoney(data.median[idx]) + '</b></div>';
      }
    });
  }

  function renderInsight(data) {
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var pct = Math.round(data.successRate * 100);
    els.stSuccess.textContent = pct + '%';
    els.stSuccess.className = 'value ' + (pct >= 85 ? 'good' : pct < 60 ? 'bad' : '');
    els.stWorst.textContent = FEChart.fmtMoney(data.worst);

    var html;
    if (lang === 'ru') {
      html = 'Из 50 симулированных рынков счёт продержался все ' + data.years + ' лет в <b>' + pct + '%</b> случаев. ' +
        (pct >= 85 ? 'Это близко к классическому результату для правила 4%.' : pct < 60 ? 'Это заметно хуже классических 4% — на такой волатильности или ставке снятия риск обнулить счёт высок.' : 'Это немного ниже хрестоматийных 95% — стоит присмотреться к ставке снятия.');
    } else {
      html = 'Out of 50 simulated markets, the portfolio lasted the full ' + data.years + ' years in <b>' + pct + '%</b> of them. ' +
        (pct >= 85 ? 'That\'s close to the textbook result for the 4% rule.' : pct < 60 ? 'That\'s notably worse than the textbook 4% — at this volatility or withdrawal rate, the risk of running out is real.' : 'That\'s a bit below the textbook ~95% — worth reconsidering the withdrawal rate.');
    }
    els.insight.innerHTML = html;
  }

  function updateLabels() {
    els.vPortfolio.textContent = FEChart.fmtMoney(+els.portfolio.value);
    els.vWithdraw.textContent = els.withdraw.value + '%';
    els.vYears.textContent = els.years.value;
    els.vReturn.textContent = els.expReturn.value + '%';
    els.vVol.textContent = els.vol.value + '%';
  }

  var lastData = null;
  function refresh() {
    updateLabels();
    lastData = simulate();
    draw(lastData);
    renderInsight(lastData);
  }

  [els.portfolio, els.withdraw, els.years, els.expReturn, els.vol].forEach(function (input) {
    input.addEventListener('input', refresh);
  });
  document.getElementById('rerun').addEventListener('click', refresh);
  document.addEventListener('fe-lang-changed', function () { updateLabels(); draw(lastData); renderInsight(lastData); });

  refresh();
})();
