(function () {
  var svg = document.getElementById('chart');
  var tooltip = document.getElementById('tooltip');

  var els = {
    loan: document.getElementById('loan'),
    rate: document.getElementById('rate'),
    term: document.getElementById('term'),
    month: document.getElementById('month'),
    vLoan: document.getElementById('v-loan'),
    vRate: document.getElementById('v-rate'),
    vTerm: document.getElementById('v-term'),
    vMonth: document.getElementById('v-month'),
    insight: document.getElementById('insight-text'),
    stPayment: document.getElementById('st-payment'),
    stSplit: document.getElementById('st-split'),
    stBalance: document.getElementById('st-balance')
  };

  var lastData = null;

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

  function compute() {
    var loan = +els.loan.value;
    var annualRate = +els.rate.value / 100;
    var years = +els.term.value;
    var n = years * 12;
    var r = annualRate / 12;
    var payment = r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n));

    var interestArr = [], principalArr = [], balanceArr = [];
    var balance = loan;
    for (var m = 1; m <= n; m++) {
      var interest = balance * r;
      var principal = Math.min(payment - interest, balance);
      balance = Math.max(0, balance - principal);
      interestArr.push(interest);
      principalArr.push(principal);
      balanceArr.push(balance);
    }
    return { loan: loan, years: years, n: n, payment: payment, interestArr: interestArr, principalArr: principalArr, balanceArr: balanceArr };
  }

  function draw(data) {
    var xEvery = data.n <= 120 ? 12 : data.n <= 240 ? 24 : 36;
    FEChart.render(svg, tooltip, {
      n: data.n,
      padL: 70,
      xTickEvery: xEvery,
      xTickLabel: function (i) { return Math.round(i / 12); },
      stacked: [
        { values: data.interestArr, color: 'var(--series-3)' },
        { values: data.principalArr, color: 'var(--series-1)' }
      ],
      tooltipHtml: function (idx) {
        var d = dict();
        return '<div class="row"><span class="muted">' + d.tt_month + '</span><b>' + (idx + 1) + '</b></div>' +
          '<div class="row"><span class="muted">' + d.tt_interest + '</span><b>' + FEChart.fmtMoney(data.interestArr[idx]) + '</b></div>' +
          '<div class="row"><span class="muted">' + d.tt_principal + '</span><b>' + FEChart.fmtMoney(data.principalArr[idx]) + '</b></div>';
      }
    });
  }

  function renderInsight(data) {
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var crossIdx = data.principalArr.findIndex(function (p, i) { return p > data.interestArr[i]; });
    var crossYear = crossIdx >= 0 ? (crossIdx / 12).toFixed(1) : '—';
    var totalInterest = data.interestArr.reduce(function (a, b) { return a + b; }, 0);
    var html;
    if (lang === 'ru') {
      html = 'Ежемесячный платёж — <span class="num">' + FEChart.fmtMoney(data.payment) + '</span>. Больше половины платежа станет погашением долга примерно с <b>' + crossYear + '</b>-го года. Всего за весь срок ты заплатишь банку <span class="num">' + FEChart.fmtMoney(totalInterest) + '</span> процентов — это ' + Math.round(totalInterest / data.loan * 100) + '% от суммы кредита.';
    } else {
      html = 'Your monthly payment is <span class="num">' + FEChart.fmtMoney(data.payment) + '</span>. More than half of each payment starts going to principal around year <b>' + crossYear + '</b>. Over the full term you\'ll pay <span class="num">' + FEChart.fmtMoney(totalInterest) + '</span> in interest — that\'s ' + Math.round(totalInterest / data.loan * 100) + '% of the loan amount.';
    }
    els.insight.innerHTML = html;
  }

  function updateMonthStat(data) {
    var idx = Math.min(+els.month.value, data.n) - 1;
    els.vMonth.textContent = idx + 1;
    els.stPayment.textContent = FEChart.fmtMoney(data.payment);
    var ip = Math.round(data.interestArr[idx] / data.payment * 100);
    els.stSplit.textContent = ip + '% / ' + (100 - ip) + '%';
    els.stBalance.textContent = FEChart.fmtMoney(data.balanceArr[idx]);
  }

  function updateLabels() {
    els.vLoan.textContent = FEChart.fmtMoney(+els.loan.value);
    els.vRate.textContent = els.rate.value + '%';
    els.vTerm.textContent = els.term.value;
  }

  function refresh() {
    els.month.max = +els.term.value * 12;
    if (+els.month.value > +els.month.max) els.month.value = els.month.max;
    updateLabels();
    lastData = compute();
    draw(lastData);
    renderInsight(lastData);
    updateMonthStat(lastData);
  }

  [els.loan, els.rate, els.term].forEach(function (input) { input.addEventListener('input', refresh); });
  els.month.addEventListener('input', function () { updateMonthStat(lastData); });
  document.addEventListener('fe-lang-changed', refresh);

  refresh();
})();
