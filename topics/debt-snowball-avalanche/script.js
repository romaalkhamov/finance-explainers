(function () {
  var svg = document.getElementById('chart');
  var tooltip = document.getElementById('tooltip');

  var els = {
    extra: document.getElementById('extra'),
    vExtra: document.getElementById('v-extra'),
    insight: document.getElementById('insight-text'),
    stMonthsSb: document.getElementById('st-months-sb'),
    stMonthsAv: document.getElementById('st-months-av'),
    stInterestDiff: document.getElementById('st-interest-diff')
  };

  var BASE_DEBTS = [
    { name: 'card', balance: 6000, apr: 0.22, min: 150 },
    { name: 'car', balance: 2000, apr: 0.10, min: 90 },
    { name: 'student', balance: 15000, apr: 0.05, min: 160 }
  ];

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

  function simulate(order, extra) {
    var debts = BASE_DEBTS.map(function (d) { return { balance: d.balance, apr: d.apr, min: d.min }; });
    var idxOrder = order.map(function (name) { return BASE_DEBTS.findIndex(function (d) { return d.name === name; }); });
    var totalSeries = [debts.reduce(function (s, d) { return s + d.balance; }, 0)];
    var totalInterest = 0;
    var month = 0;
    while (debts.some(function (d) { return d.balance > 0.01; }) && month < 600) {
      month++;
      debts.forEach(function (d) {
        if (d.balance > 0) {
          var interest = d.balance * d.apr / 12;
          totalInterest += interest;
          d.balance += interest;
        }
      });
      debts.forEach(function (d) {
        if (d.balance > 0) {
          var pay = Math.min(d.min, d.balance);
          d.balance -= pay;
        }
      });
      var pool = extra + debts.reduce(function (s, d) { return s + (d.balance <= 0.01 ? d.min : 0); }, 0);
      idxOrder.forEach(function (i) {
        if (pool <= 0) return;
        var d = debts[i];
        if (d.balance <= 0) return;
        var pay = Math.min(pool, d.balance);
        d.balance -= pay;
        pool -= pay;
      });
      totalSeries.push(debts.reduce(function (s, d) { return s + Math.max(0, d.balance); }, 0));
    }
    return { months: month, series: totalSeries, totalInterest: totalInterest };
  }

  function run() {
    var extra = +els.extra.value;
    var snowballOrder = BASE_DEBTS.slice().sort(function (a, b) { return a.balance - b.balance; }).map(function (d) { return d.name; });
    var avalancheOrder = BASE_DEBTS.slice().sort(function (a, b) { return b.apr - a.apr; }).map(function (d) { return d.name; });
    var sb = simulate(snowballOrder, extra);
    var av = simulate(avalancheOrder, extra);
    var n = Math.max(sb.series.length, av.series.length);
    function pad(arr) {
      var out = arr.slice();
      while (out.length < n) out.push(0);
      return out;
    }
    return { sb: sb, av: av, n: n, sbSeries: pad(sb.series), avSeries: pad(av.series) };
  }

  function draw(data) {
    var d = dict();
    var xEvery = data.n <= 120 ? 12 : data.n <= 300 ? 24 : 36;
    FEChart.render(svg, tooltip, {
      n: data.n,
      padL: 70,
      xTickEvery: xEvery,
      xTickLabel: function (i) { return Math.round(i / 12); },
      series: [
        { values: data.avSeries, color: 'var(--series-2)', endLabel: d.end_av, dashed: true },
        { values: data.sbSeries, color: 'var(--series-1)', endLabel: d.end_sb }
      ],
      tooltipHtml: function (idx) {
        var d2 = dict();
        return '<div class="row"><span class="muted">' + d2.tt_month + '</span><b>' + idx + '</b></div>' +
          '<div class="row"><span class="muted">' + d2.tt_sb + '</span><b>' + FEChart.fmtMoney(data.sbSeries[idx]) + '</b></div>' +
          '<div class="row"><span class="muted">' + d2.tt_av + '</span><b>' + FEChart.fmtMoney(data.avSeries[idx]) + '</b></div>';
      }
    });
  }

  function renderInsight(data) {
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var interestDiff = data.sb.totalInterest - data.av.totalInterest;
    var monthsDiff = data.sb.months - data.av.months;
    els.stMonthsSb.textContent = data.sb.months;
    els.stMonthsAv.textContent = data.av.months;
    els.stInterestDiff.textContent = FEChart.fmtMoney(Math.max(0, interestDiff));

    var html;
    if (lang === 'ru') {
      html = 'Avalanche освобождает от долгов ' + (monthsDiff > 0 ? 'на <b>' + monthsDiff + ' мес. быстрее</b> и ' : '') + 'экономит <span class="num">' + FEChart.fmtMoney(interestDiff) + '</span> на процентах по сравнению со Snowball — потому что бьёт по самой дорогой ставке первой. Но Snowball закрывает мелкий долг раньше — это психологически мотивирует продолжать.';
    } else {
      html = 'Avalanche gets you debt-free ' + (monthsDiff > 0 ? '<b>' + monthsDiff + ' months faster</b> and ' : '') + 'saves <span class="num">' + FEChart.fmtMoney(interestDiff) + '</span> in interest compared to Snowball — because it attacks the highest rate first. But Snowball clears a small balance sooner, which can be the motivation that keeps you going.';
    }
    els.insight.innerHTML = html;
  }

  function refresh() {
    els.vExtra.textContent = FEChart.fmtMoney(+els.extra.value);
    var data = run();
    draw(data);
    renderInsight(data);
  }

  els.extra.addEventListener('input', refresh);
  document.addEventListener('fe-lang-changed', refresh);

  refresh();
})();
