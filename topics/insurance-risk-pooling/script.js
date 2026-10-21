(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function fmtMoney(x) { return '$' + Math.round(x).toLocaleString('en-US'); }

  var svg = document.getElementById('pool-svg');
  var els = {
    pool: document.getElementById('pool'), prob: document.getElementById('prob'),
    claim: document.getElementById('claim'), margin: document.getElementById('margin'),
    vPool: document.getElementById('v-pool'), vProb: document.getElementById('v-prob'),
    vClaim: document.getElementById('v-claim'), vMargin: document.getElementById('v-margin'),
    vPremium: document.getElementById('v-premium'),
    insight: document.getElementById('insight-text'),
    stCollected: document.getElementById('st-collected'),
    stPaid: document.getElementById('st-paid'),
    stYears: document.getElementById('st-years')
  };

  var dots = [];
  var yearsPlayed = 0, totalClaimsObserved = 0, totalPersonYears = 0;

  function dict() { return window.I18N[(window.FE && window.FE.getLang()) || 'ru']; }

  function premium() {
    var p = +els.prob.value / 100, claim = +els.claim.value, margin = +els.margin.value / 100;
    return p * claim * (1 + margin);
  }

  function buildGrid() {
    svg.innerHTML = '';
    dots = [];
    var n = +els.pool.value;
    var cols = 20;
    var cellSize = 760 / cols;
    var rows = Math.ceil(n / cols);
    svg.setAttribute('viewBox', '0 0 760 ' + (rows * cellSize + 16));
    var r = Math.min(cellSize, 24) * 0.33;
    for (var i = 0; i < n; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var cx = col * cellSize + cellSize / 2, cy = row * cellSize + cellSize / 2 + 10;
      var c = el('circle', { cx: cx, cy: cy, r: r, class: 'pool-dot', style: 'fill:var(--text-muted);opacity:0.5' });
      svg.appendChild(c);
      dots.push(c);
    }
  }

  function updateLabels() {
    els.vPool.textContent = els.pool.value;
    els.vProb.textContent = els.prob.value + '%';
    els.vClaim.textContent = fmtMoney(+els.claim.value);
    els.vMargin.textContent = els.margin.value + '%';
    els.vPremium.textContent = fmtMoney(premium());
  }

  function resetDots() {
    dots.forEach(function (d) { d.style.fill = 'var(--text-muted)'; d.style.opacity = 0.5; });
  }

  function runYear() {
    var n = dots.length;
    var p = +els.prob.value / 100;
    var claimCost = +els.claim.value;
    var prem = premium();
    var claimCount = 0;
    dots.forEach(function (d) {
      var hasClaim = Math.random() < p;
      if (hasClaim) { claimCount++; d.style.fill = 'var(--bad)'; d.style.opacity = 1; }
      else { d.style.fill = 'var(--series-2)'; d.style.opacity = 0.9; }
    });
    yearsPlayed++;
    totalClaimsObserved += claimCount;
    totalPersonYears += n;

    var collected = n * prem;
    var paid = claimCount * claimCost;
    els.stCollected.textContent = fmtMoney(collected);
    els.stPaid.textContent = fmtMoney(paid);
    var observedRate = (totalClaimsObserved / totalPersonYears * 100).toFixed(1);
    els.stYears.textContent = yearsPlayed + ' · ' + observedRate + '%';

    var lang = (window.FE && window.FE.getLang()) || 'ru';
    var margin = collected - paid;
    var html;
    if (lang === 'ru') {
      html = 'В этот год у <b>' + claimCount + '</b> из ' + n + ' случился страховой случай. Пул собрал <span class="num">' + fmtMoney(collected) + '</span>, выплатил <span class="num">' + fmtMoney(paid) + '</span>' + (margin >= 0 ? ', страховщик заработал ' + fmtMoney(margin) : ', страховщик ушёл в минус на ' + fmtMoney(-margin)) + '. Без страховки каждому из ' + claimCount + ' пришлось бы искать ' + fmtMoney(claimCost) + ' самому — вместо этого они заплатили всего по ' + fmtMoney(prem) + '.';
    } else {
      html = 'This year <b>' + claimCount + '</b> out of ' + n + ' people had a claim. The pool collected <span class="num">' + fmtMoney(collected) + '</span> and paid out <span class="num">' + fmtMoney(paid) + '</span>' + (margin >= 0 ? ', leaving the insurer ' + fmtMoney(margin) + ' ahead' : ', putting the insurer ' + fmtMoney(-margin) + ' underwater') + '. Without insurance, each of those ' + claimCount + ' would have had to find ' + fmtMoney(claimCost) + ' on their own — instead they each just paid ' + fmtMoney(prem) + '.';
    }
    els.insight.innerHTML = html;
  }

  function refreshStructure() {
    updateLabels();
    buildGrid();
    yearsPlayed = 0; totalClaimsObserved = 0; totalPersonYears = 0;
    els.stCollected.textContent = '$0';
    els.stPaid.textContent = '$0';
    els.stYears.textContent = '0';
    var lang = (window.FE && window.FE.getLang()) || 'ru';
    els.insight.textContent = lang === 'ru'
      ? 'Нажми «Прожить год», чтобы разыграть, у кого в пуле случится страховой случай.'
      : 'Click "Live a year" to randomly play out who in the pool has a claim.';
  }

  [els.pool, els.prob, els.claim, els.margin].forEach(function (input) {
    input.addEventListener('input', function () { updateLabels(); if (input === els.pool) refreshStructure(); });
  });
  document.getElementById('run-year').addEventListener('click', runYear);
  document.addEventListener('fe-lang-changed', updateLabels);

  refreshStructure();
})();
