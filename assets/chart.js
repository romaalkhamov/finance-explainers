window.FEChart = (function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function niceMax(v) {
    if (!v || v <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / exp;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * exp;
  }
  function fmtMoney(x) {
    var sign = x < 0 ? '-' : '';
    return sign + '$' + Math.round(Math.abs(x)).toLocaleString('en-US');
  }

  // cfg: { width, height, padL, padR, padT, padB, n, yMax, yMin,
  //        xTickEvery, xTickLabel(i), yFormat(v), gridSteps,
  //        series: [{values, color, width, opacity, area, dashed, skipHover, endLabel}],
  //        stacked: [{values, color, label}],   // cumulative layers drawn as filled bands
  //        tooltipHtml(idx), onHover(idx|null), tooltipEl }
  function render(svg, tooltipEl, cfg) {
    svg.innerHTML = '';
    var W = cfg.width || 760, H = cfg.height || 360;
    var padL = cfg.padL != null ? cfg.padL : 60, padR = cfg.padR != null ? cfg.padR : 60;
    var padT = cfg.padT != null ? cfg.padT : 16, padB = cfg.padB != null ? cfg.padB : 32;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = cfg.n;
    var yFormat = cfg.yFormat || fmtMoney;

    var maxVal = cfg.yMin || 0;
    (cfg.series || []).forEach(function (s) {
      s.values.forEach(function (v) { if (v > maxVal) maxVal = v; });
    });
    if (cfg.stacked) {
      for (var i = 0; i < n; i++) {
        var sum = 0;
        cfg.stacked.forEach(function (layer) { sum += layer.values[i]; });
        if (sum > maxVal) maxVal = sum;
      }
    }
    var yMax = cfg.yMax || niceMax(maxVal * 1.08);
    var yMin = cfg.yMin || 0;

    var xScale = function (i) { return padL + (i / (n - 1)) * plotW; };
    var yScale = function (v) { return padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH; };

    var steps = cfg.gridSteps || 4;
    for (var g = 0; g <= steps; g++) {
      var v = yMin + ((yMax - yMin) / steps) * g;
      var y = yScale(v);
      svg.appendChild(el('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: g === 0 ? 'baseline' : 'gridline' }));
      var lbl = el('text', { x: padL - 8, y: y + 4, class: 'axis-label', 'text-anchor': 'end' });
      lbl.textContent = yFormat(v);
      svg.appendChild(lbl);
    }

    var xTickEvery = cfg.xTickEvery || 1;
    for (var t = 0; t < n; t += xTickEvery) {
      var xl = el('text', { x: xScale(t), y: H - padB + 20, class: 'axis-label', 'text-anchor': 'middle' });
      xl.textContent = cfg.xTickLabel ? cfg.xTickLabel(t) : t;
      svg.appendChild(xl);
    }

    function pathD(values, baseValues) {
      var top = values.map(function (v, i) { return (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(v); }).join(' ');
      if (!baseValues) return top;
      var bottom = baseValues.map(function (v, i) {
        var idx = baseValues.length - 1 - i;
        return 'L' + xScale(idx) + ',' + yScale(baseValues[idx]);
      }).join(' ');
      return top + ' ' + bottom + ' Z';
    }

    if (cfg.stacked) {
      var cumPrev = new Array(n).fill(yMin);
      cfg.stacked.forEach(function (layer) {
        var cumTop = layer.values.map(function (v, i) { return cumPrev[i] + v; });
        svg.appendChild(el('path', { d: pathD(cumTop, cumPrev), style: 'fill:' + layer.color + ';opacity:0.85;stroke:none' }));
        cumPrev = cumTop;
      });
    }

    (cfg.series || []).forEach(function (s) {
      if (s.area) {
        var base = new Array(n).fill(yMin);
        svg.appendChild(el('path', { d: pathD(s.values, base), style: 'fill:' + s.color + ';opacity:' + (s.areaOpacity || 0.12) + ';stroke:none' }));
      }
      var lineAttrs = { d: pathD(s.values), class: 'series-line', style: 'stroke:' + s.color + (s.width ? ';stroke-width:' + s.width : '') + (s.opacity != null ? ';opacity:' + s.opacity : '') };
      if (s.dashed) lineAttrs['stroke-dasharray'] = '5 4';
      svg.appendChild(el('path', lineAttrs));
      if (s.endLabel) {
        var ex = xScale(n - 1) + 8, ey = yScale(s.values[n - 1]);
        var g2 = el('g', {});
        g2.appendChild(el('circle', { cx: ex, cy: ey - 4, r: 3, style: 'fill:' + s.color }));
        var et = el('text', { x: ex + 8, y: ey, class: 'end-label' });
        et.textContent = s.endLabel;
        g2.appendChild(et);
        svg.appendChild(g2);
      }
    });

    // hover layer
    var hoverSeries = (cfg.series || []).filter(function (s) { return !s.skipHover; });
    var dots = hoverSeries.map(function (s) {
      var d = el('circle', { r: 5, class: 'hover-dot', style: 'stroke:' + s.color, visibility: 'hidden' });
      svg.appendChild(d);
      return d;
    });
    var crosshair = el('line', { class: 'crosshair', y1: padT, y2: H - padB, visibility: 'hidden' });
    svg.appendChild(crosshair);

    var capture = el('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent' });
    capture.style.cursor = 'crosshair';
    svg.appendChild(capture);

    capture.addEventListener('mousemove', function (ev) {
      var rect = svg.getBoundingClientRect();
      var svgX = ((ev.clientX - rect.left) / rect.width) * W;
      var idx = Math.round(((svgX - padL) / plotW) * (n - 1));
      idx = Math.max(0, Math.min(n - 1, idx));
      var x = xScale(idx);
      crosshair.setAttribute('x1', x); crosshair.setAttribute('x2', x); crosshair.setAttribute('visibility', 'visible');
      hoverSeries.forEach(function (s, i) {
        dots[i].setAttribute('cx', x);
        dots[i].setAttribute('cy', yScale(s.values[idx]));
        dots[i].setAttribute('visibility', 'visible');
      });
      if (tooltipEl && cfg.tooltipHtml) {
        tooltipEl.innerHTML = cfg.tooltipHtml(idx);
        tooltipEl.style.visibility = 'visible';
        var scale = rect.width / W;
        var left = x * scale + 14;
        if (left + 160 > rect.width) left = x * scale - 170;
        tooltipEl.style.left = left + 'px';
        var topY = yScale(hoverSeries[0] ? hoverSeries[0].values[idx] : yMax) * scale - 10;
        tooltipEl.style.top = topY + 'px';
      }
      if (cfg.onHover) cfg.onHover(idx);
    });
    capture.addEventListener('mouseleave', function () {
      crosshair.setAttribute('visibility', 'hidden');
      dots.forEach(function (d) { d.setAttribute('visibility', 'hidden'); });
      if (tooltipEl) tooltipEl.style.visibility = 'hidden';
      if (cfg.onHover) cfg.onHover(null);
    });
  }

  return { render: render, niceMax: niceMax, fmtMoney: fmtMoney };
})();
