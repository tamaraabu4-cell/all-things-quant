/* ==========================================================
   Charts for the J.P. Morgan gas storage and credit risk project.
   The numbers below are exported by the four Python scripts
   (jpm_task1 ... jpm_task4), so the charts match the code exactly.
   ========================================================== */
(function () {
const T1 = {"history": [["2020-10-31", 10.1], ["2020-11-30", 10.3], ["2020-12-31", 11.0], ["2021-01-31", 10.9], ["2021-02-28", 10.9], ["2021-03-31", 10.9], ["2021-04-30", 10.4], ["2021-05-31", 9.84], ["2021-06-30", 10.0], ["2021-07-31", 10.1], ["2021-08-31", 10.3], ["2021-09-30", 10.2], ["2021-10-31", 10.1], ["2021-11-30", 11.2], ["2021-12-31", 11.4], ["2022-01-31", 11.5], ["2022-02-28", 11.8], ["2022-03-31", 11.5], ["2022-04-30", 10.7], ["2022-05-31", 10.7], ["2022-06-30", 10.4], ["2022-07-31", 10.5], ["2022-08-31", 10.4], ["2022-09-30", 10.8], ["2022-10-31", 11.0], ["2022-11-30", 11.6], ["2022-12-31", 11.6], ["2023-01-31", 12.1], ["2023-02-28", 11.7], ["2023-03-31", 12.0], ["2023-04-30", 11.5], ["2023-05-31", 11.2], ["2023-06-30", 10.9], ["2023-07-31", 11.4], ["2023-08-31", 11.1], ["2023-09-30", 11.5], ["2023-10-31", 11.8], ["2023-11-30", 12.2], ["2023-12-31", 12.8], ["2024-01-31", 12.6], ["2024-02-29", 12.4], ["2024-03-31", 12.7], ["2024-04-30", 12.1], ["2024-05-31", 11.4], ["2024-06-30", 11.5], ["2024-07-31", 11.6], ["2024-08-31", 11.5], ["2024-09-30", 11.8]], "curve": [["2020-10-31", 10.105], ["2020-11-07", 10.198], ["2020-11-14", 10.291], ["2020-11-21", 10.382], ["2020-11-28", 10.469], ["2020-12-05", 10.552], ["2020-12-12", 10.63], ["2020-12-19", 10.702], ["2020-12-26", 10.766], ["2021-01-02", 10.823], ["2021-01-09", 10.87], ["2021-01-16", 10.909], ["2021-01-23", 10.938], ["2021-01-30", 10.957], ["2021-02-06", 10.966], ["2021-02-13", 10.965], ["2021-02-20", 10.955], ["2021-02-27", 10.934], ["2021-03-06", 10.905], ["2021-03-13", 10.868], ["2021-03-20", 10.822], ["2021-03-27", 10.77], ["2021-04-03", 10.711], ["2021-04-10", 10.648], ["2021-04-17", 10.58], ["2021-04-24", 10.51], ["2021-05-01", 10.438], ["2021-05-08", 10.366], ["2021-05-15", 10.294], ["2021-05-22", 10.224], ["2021-05-29", 10.157], ["2021-06-05", 10.095], ["2021-06-12", 10.037], ["2021-06-19", 9.986], ["2021-06-26", 9.942], ["2021-07-03", 9.906], ["2021-07-10", 9.878], ["2021-07-17", 9.86], ["2021-07-24", 9.851], ["2021-07-31", 9.852], ["2021-08-07", 9.863], ["2021-08-14", 9.884], ["2021-08-21", 9.915], ["2021-08-28", 9.955], ["2021-09-04", 10.005], ["2021-09-11", 10.063], ["2021-09-18", 10.129], ["2021-09-25", 10.201], ["2021-10-02", 10.28], ["2021-10-09", 10.364], ["2021-10-16", 10.453], ["2021-10-23", 10.544], ["2021-10-30", 10.637], ["2021-11-06", 10.73], ["2021-11-13", 10.823], ["2021-11-20", 10.914], ["2021-11-27", 11.002], ["2021-12-04", 11.086], ["2021-12-11", 11.165], ["2021-12-18", 11.238], ["2021-12-25", 11.304], ["2022-01-01", 11.362], ["2022-01-08", 11.411], ["2022-01-15", 11.451], ["2022-01-22", 11.482], ["2022-01-29", 11.503], ["2022-02-05", 11.514], ["2022-02-12", 11.514], ["2022-02-19", 11.506], ["2022-02-26", 11.487], ["2022-03-05", 11.46], ["2022-03-12", 11.423], ["2022-03-19", 11.379], ["2022-03-26", 11.328], ["2022-04-02", 11.271], ["2022-04-09", 11.208], ["2022-04-16", 11.141], ["2022-04-23", 11.071], ["2022-04-30", 10.999], ["2022-05-07", 10.927], ["2022-05-14", 10.855], ["2022-05-21", 10.785], ["2022-05-28", 10.717], ["2022-06-04", 10.654], ["2022-06-11", 10.595], ["2022-06-18", 10.543], ["2022-06-25", 10.498], ["2022-07-02", 10.46], ["2022-07-09", 10.431], ["2022-07-16", 10.411], ["2022-07-23", 10.401], ["2022-07-30", 10.4], ["2022-08-06", 10.409], ["2022-08-13", 10.428], ["2022-08-20", 10.457], ["2022-08-27", 10.496], ["2022-09-03", 10.544], ["2022-09-10", 10.6], ["2022-09-17", 10.665], ["2022-09-24", 10.736], ["2022-10-01", 10.814], ["2022-10-08", 10.897], ["2022-10-15", 10.985], ["2022-10-22", 11.076], ["2022-10-29", 11.168], ["2022-11-05", 11.262], ["2022-11-12", 11.355], ["2022-11-19", 11.446], ["2022-11-26", 11.535], ["2022-12-03", 11.62], ["2022-12-10", 11.7], ["2022-12-17", 11.774], ["2022-12-24", 11.841], ["2022-12-31", 11.9], ["2023-01-07", 11.951], ["2023-01-14", 11.993], ["2023-01-21", 12.025], ["2023-01-28", 12.048], ["2023-02-04", 12.061], ["2023-02-11", 12.063], ["2023-02-18", 12.056], ["2023-02-25", 12.039], ["2023-03-04", 12.013], ["2023-03-11", 11.979], ["2023-03-18", 11.936], ["2023-03-25", 11.886], ["2023-04-01", 11.83], ["2023-04-08", 11.768], ["2023-04-15", 11.702], ["2023-04-22", 11.632], ["2023-04-29", 11.561], ["2023-05-06", 11.488], ["2023-05-13", 11.416], ["2023-05-20", 11.345], ["2023-05-27", 11.277], ["2023-06-03", 11.213], ["2023-06-10", 11.154], ["2023-06-17", 11.1], ["2023-06-24", 11.054], ["2023-07-01", 11.015], ["2023-07-08", 10.984], ["2023-07-15", 10.962], ["2023-07-22", 10.95], ["2023-07-29", 10.948], ["2023-08-05", 10.955], ["2023-08-12", 10.972], ["2023-08-19", 11.0], ["2023-08-26", 11.037], ["2023-09-02", 11.083], ["2023-09-09", 11.138], ["2023-09-16", 11.201], ["2023-09-23", 11.271], ["2023-09-30", 11.348], ["2023-10-07", 11.431], ["2023-10-14", 11.517], ["2023-10-21", 11.608], ["2023-10-28", 11.7], ["2023-11-04", 11.793], ["2023-11-11", 11.887], ["2023-11-18", 11.979], ["2023-11-25", 12.068], ["2023-12-02", 12.154], ["2023-12-09", 12.234], ["2023-12-16", 12.31], ["2023-12-23", 12.378], ["2023-12-30", 12.439], ["2024-01-06", 12.491], ["2024-01-13", 12.535], ["2024-01-20", 12.569], ["2024-01-27", 12.593], ["2024-02-03", 12.608], ["2024-02-10", 12.612], ["2024-02-17", 12.607], ["2024-02-24", 12.592], ["2024-03-02", 12.567], ["2024-03-09", 12.534], ["2024-03-16", 12.493], ["2024-03-23", 12.444], ["2024-03-30", 12.389], ["2024-04-06", 12.328], ["2024-04-13", 12.262], ["2024-04-20", 12.193], ["2024-04-27", 12.122], ["2024-05-04", 12.05], ["2024-05-11", 11.977], ["2024-05-18", 11.906], ["2024-05-25", 11.838], ["2024-06-01", 11.773], ["2024-06-08", 11.712], ["2024-06-15", 11.658], ["2024-06-22", 11.61], ["2024-06-29", 11.569], ["2024-07-06", 11.537], ["2024-07-13", 11.514], ["2024-07-20", 11.5], ["2024-07-27", 11.496], ["2024-08-03", 11.501], ["2024-08-10", 11.517], ["2024-08-17", 11.542], ["2024-08-24", 11.578], ["2024-08-31", 11.622], ["2024-09-07", 11.676], ["2024-09-14", 11.737], ["2024-09-21", 11.807], ["2024-09-28", 11.882], ["2024-10-05", 11.964], ["2024-10-12", 12.05], ["2024-10-19", 12.14], ["2024-10-26", 12.232], ["2024-11-02", 12.325], ["2024-11-09", 12.419], ["2024-11-16", 12.511], ["2024-11-23", 12.601], ["2024-11-30", 12.687], ["2024-12-07", 12.769], ["2024-12-14", 12.845], ["2024-12-21", 12.915], ["2024-12-28", 12.977], ["2025-01-04", 13.031], ["2025-01-11", 13.076], ["2025-01-18", 13.112], ["2025-01-25", 13.138], ["2025-02-01", 13.154], ["2025-02-08", 13.16], ["2025-02-15", 13.157], ["2025-02-22", 13.143], ["2025-03-01", 13.12], ["2025-03-08", 13.089], ["2025-03-15", 13.049], ["2025-03-22", 13.001], ["2025-03-29", 12.947], ["2025-04-05", 12.887], ["2025-04-12", 12.822], ["2025-04-19", 12.754], ["2025-04-26", 12.683], ["2025-05-03", 12.611], ["2025-05-10", 12.538], ["2025-05-17", 12.467], ["2025-05-24", 12.398], ["2025-05-31", 12.332], ["2025-06-07", 12.271], ["2025-06-14", 12.215], ["2025-06-21", 12.166], ["2025-06-28", 12.124], ["2025-07-05", 12.091], ["2025-07-12", 12.066], ["2025-07-19", 12.05], ["2025-07-26", 12.044], ["2025-08-02", 12.048], ["2025-08-09", 12.062], ["2025-08-16", 12.086], ["2025-08-23", 12.119], ["2025-08-30", 12.162], ["2025-09-06", 12.214], ["2025-09-13", 12.274], ["2025-09-20", 12.342], ["2025-09-27", 12.417]], "band": 0.411, "last_date": "2024-09-30", "backtest": {"dates": ["2023-10-31", "2023-11-30", "2023-12-31", "2024-01-31", "2024-02-29", "2024-03-31", "2024-04-30", "2024-05-31", "2024-06-30", "2024-07-31", "2024-08-31", "2024-09-30"], "actual": [11.8, 12.2, 12.8, 12.6, 12.4, 12.7, 12.1, 11.4, 11.5, 11.6, 11.5, 11.8], "model": [11.716, 12.089, 12.399, 12.558, 12.544, 12.369, 12.1, 11.807, 11.596, 11.525, 11.636, 11.899], "mae_model": 0.16, "mae_last_year": 0.567, "mae_flat": 0.55}, "summary": {"trend_per_year": 0.548, "amplitude": 0.69, "peak_month": "February", "trough_month": "August"}, "forecast": [["2024-10-31", 12.298], ["2024-11-30", 12.687], ["2024-12-31", 13.001], ["2025-01-31", 13.152], ["2025-02-28", 13.124], ["2025-03-31", 12.931], ["2025-04-30", 12.642], ["2025-05-31", 12.332], ["2025-06-30", 12.114], ["2025-07-31", 12.046], ["2025-08-31", 12.169], ["2025-09-30", 12.451]]};
const T2 = {"months": ["2024-09-30", "2024-10-31", "2024-11-30", "2024-12-31", "2025-01-31", "2025-02-28", "2025-03-31", "2025-04-30", "2025-05-31", "2025-06-30", "2025-07-31", "2025-08-31", "2025-09-30"], "prices": [11.8, 12.298408, 12.687002, 13.000836, 13.152327, 13.124301, 12.9306, 12.641929, 12.332265, 12.113871, 12.045777, 12.168955, 12.450613], "terms": {"rate": 1000000.0, "max_volume": 1000000.0, "storage_cost_rate": 100000.0, "injection_withdrawal_cost_rate": 0.01, "transport_cost": 50000.0}, "grid": [[null, 178408, 467002, 680836, 732327, 604301, 310600, -78071, -487735, -806129, -974223, -951045, -769387], [null, null, 68594, 282428, 333919, 205893, -87808, -476478, -886143, -1204537, -1372631, -1349453, -1167794], [null, null, null, -6166, 45325, -82701, -376402, -765072, -1174737, -1493131, -1661225, -1638047, -1456388], [null, null, null, null, -168509, -296535, -590236, -978906, -1388571, -1706964, -1875059, -1851881, -1670222], [null, null, null, null, null, -348026, -641727, -1030397, -1440062, -1758456, -1926550, -1903372, -1721713], [null, null, null, null, null, null, -513701, -902371, -1312035, -1630429, -1798524, -1775346, -1593687], [null, null, null, null, null, null, null, -608670, -1018335, -1336728, -1504823, -1481645, -1299986], [null, null, null, null, null, null, null, null, -629664, -948058, -1116153, -1092974, -911316], [null, null, null, null, null, null, null, null, null, -538394, -706488, -683310, -501652], [null, null, null, null, null, null, null, null, null, null, -388094, -364916, -183258], [null, null, null, null, null, null, null, null, null, null, null, -196822, -15163], [null, null, null, null, null, null, null, null, null, null, null, null, -38341], [null, null, null, null, null, null, null, null, null, null, null, null, null]], "best": {"inject": "2024-09-30", "withdraw": "2025-01-31", "value": 732327}};
const T3 = {"auc": 1.0, "auc_fico_only": 0.7142, "accuracy": 0.9987, "brier": 0.0025, "n_train": 7000, "n_test": 3000, "default_rate": 0.1851, "roc": [[0.0, 0.0], [0.0, 0.0018], [0.0, 0.9964], [0.0004, 0.9964], [0.0004, 1.0], [1.0, 1.0]], "calibration": [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.019, 0.0], [0.8426, 0.85], [1.0, 1.0]], "coefficients": [["Credit lines open", 7.792], ["Total debt / income", 4.703], ["Years employed", -2.686], ["FICO score", -1.211], ["Loan / income", 0.131]], "portfolio": {"expected": 2229884, "realised": 2216669}, "by_dti": [["1%–4%", 0.0], ["4%–6%", 0.0], ["6%–8%", 0.0], ["8%–9%", 0.0], ["9%–10%", 0.0], ["10%–11%", 0.0], ["11%–14%", 0.0], ["14%–20%", 0.042], ["20%–27%", 0.809], ["27%–40%", 1.0]], "by_lines": [[0, 0.0], [1, 0.0], [2, 0.0078], [3, 0.2287], [4, 0.8512], [5, 0.9985]], "examples": [{"name": "Steady borrower", "pd": 0.0, "el": 0.0, "loan": 4000}, {"name": "Stretched borrower", "pd": 1.0, "el": 5400.0, "loan": 6000}, {"name": "On the edge", "pd": 0.262, "el": 1178.9, "loan": 5000}]};
const T4 = {"buckets": [[1, 733, 850, 553, 13, 0.0235], [2, 697, 732, 1104, 64, 0.058], [3, 673, 696, 1179, 104, 0.0882], [4, 650, 672, 1430, 152, 0.1063], [5, 641, 649, 588, 80, 0.1361], [6, 611, 640, 1945, 336, 0.1728], [7, 581, 610, 1493, 367, 0.2458], [8, 553, 580, 911, 307, 0.337], [9, 521, 552, 496, 229, 0.4617], [10, 408, 520, 301, 199, 0.6611]], "methods": [["Log-likelihood (mine)", -4220.94], ["Squared error", -4239.97], ["Equal-sized buckets", -4267.9]], "trap": [[753, 753, 8, 3, 0.375]], "min_bucket": 200, "auc_raw": 0.7307, "auc_rating": 0.7317};

const $ = (id) => document.getElementById(id);
const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
const charts = {};
const C = {
  green: () => (isDark() ? '#34d399' : '#059669'),
  red: () => (isDark() ? '#f87171' : '#dc2626'),
  blue: () => (isDark() ? '#60a5fa' : '#2563eb'),
  amber: () => (isDark() ? '#fbbf24' : '#d97706'),
  grey: () => (isDark() ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'),
};

function getColors() {
  return {
    grid: isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    text: isDark() ? '#8e8e93' : '#8e8e93',
    tooltipBg: isDark() ? '#1e1e25' : '#fff',
    tooltipText: isDark() ? '#f5f5f7' : '#1d1d1f',
    tooltipBorder: isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };
}
function chartOpts(yFmt, xFmt, extra) {
  const c = getColors();
  const o = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
    plugins: {
      legend: { position: 'top', align: 'center', labels: { color: c.text, font: { size: 11, family: 'DM Sans' }, usePointStyle: true, pointStyleWidth: 10, padding: 14, boxHeight: 8 } },
      tooltip: { backgroundColor: c.tooltipBg, titleColor: c.text, bodyColor: c.tooltipText, borderColor: c.tooltipBorder, borderWidth: 1, padding: 12 },
    },
    scales: {
      x: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 10, family: 'DM Sans' }, maxTicksLimit: 9, callback: xFmt }, border: { display: false } },
      y: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 10, family: 'DM Sans' }, callback: yFmt }, border: { display: false } },
    },
  };
  return Object.assign(o, extra || {});
}

// Blend two hex colours: t = 0 gives a, t = 1 gives b
function mix(a, b, t) {
  const h = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [r1, g1, b1] = h(a), [r2, g2, b2] = h(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toYear = (iso) => { const d = new Date(iso + 'T00:00:00Z'); const s = Date.UTC(d.getUTCFullYear(), 0, 1); return d.getUTCFullYear() + (d - s) / (365.25 * 864e5); };
const monthLabel = (iso) => { const [y, m] = iso.split('-'); return MONTHS[+m - 1] + ' ' + y.slice(2); };
const money = (v) => (v < 0 ? '−$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-GB');
const moneyK = (v) => (v < 0 ? '−$' : '$') + Math.round(Math.abs(v) / 1000).toLocaleString('en-GB') + 'k';

// ── Task 1: the curve ──
function buildCurve() {
  const last = toYear(T1.last_date);
  const pts = (rows) => rows.map(([d, p]) => ({ x: toYear(d), y: p }));
  const curve = pts(T1.curve);
  const fit = curve.filter((p) => p.x <= last + 0.01);
  const fc = curve.filter((p) => p.x >= last - 0.01);
  const band = (s) => curve.map((p) => ({ x: p.x, y: +(p.y + s * T1.band).toFixed(3) }));
  charts.curve = new Chart($('chartCurve'), {
    type: 'line',
    data: { datasets: [
      { label: 'Fitted curve', data: fit, borderColor: C.green(), borderWidth: 2.2, pointRadius: 0, tension: 0.3 },
      { label: 'Forecast', data: fc, borderColor: C.green(), borderWidth: 2.2, borderDash: [6, 4], pointRadius: 0, tension: 0.3 },
      { label: '95% range', data: band(1), borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: isDark() ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.1)' },
      { label: '_lower', data: band(-1), borderWidth: 0, pointRadius: 0 },
      { label: 'Month-end prices', data: pts(T1.history), type: 'scatter', backgroundColor: C.amber(), borderColor: C.amber(), pointRadius: 3.5 },
    ] },
    options: (() => {
      const o = chartOpts((v) => '$' + (+v).toFixed(1), (v) => (Math.abs(v - Math.round(v)) < 0.01 ? Math.round(v) : ''));
      Object.assign(o.scales.x, { type: 'linear', min: 2020.8, max: last + 1.01, ticks: Object.assign(o.scales.x.ticks, { stepSize: 0.5 }) });
      o.plugins.legend.labels.filter = (item) => !item.text.startsWith('_');
      o.plugins.tooltip.callbacks = { title: (items) => { const x = items[0].parsed.x; const y = Math.floor(x); return MONTHS[Math.min(11, Math.floor((x - y) * 12))] + ' ' + y; }, label: (it) => it.dataset.label.startsWith('_') ? null : it.dataset.label + ': $' + it.parsed.y.toFixed(2) };
      return o;
    })(),
  });
}

function buildBacktest() {
  const b = T1.backtest;
  charts.bt = new Chart($('chartBacktest'), {
    type: 'line',
    data: { labels: b.dates.map(monthLabel), datasets: [
      { label: 'What actually happened', data: b.actual, borderColor: C.amber(), backgroundColor: C.amber(), borderWidth: 2, pointRadius: 3.5, tension: 0.2 },
      { label: 'Forecast from the first 36 months', data: b.model, borderColor: C.green(), backgroundColor: C.green(), borderWidth: 2, borderDash: [6, 4], pointRadius: 3, tension: 0.3 },
    ] },
    options: chartOpts((v) => '$' + (+v).toFixed(1), function (v) { return this.getLabelForValue(v); }, { interaction: { intersect: false, mode: 'index' } }),
  });
}

// ── Task 2: the storage contract ──
const TERMS = T2.terms;
function monthsBetween(a, b) {
  const [ya, ma] = a.split('-').map(Number); const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma) + 1;
}
function contract(i, j) {
  const V = Math.min(TERMS.rate, TERMS.max_volume);
  const buy = V * T2.prices[i], sell = V * T2.prices[j];
  const moving = 2 * V * TERMS.injection_withdrawal_cost_rate;
  const transport = 2 * TERMS.transport_cost;
  const m = monthsBetween(T2.months[i], T2.months[j]);
  const rent = TERMS.storage_cost_rate * m;
  return { buy, sell, moving, transport, rent, m, value: sell - buy - moving - transport - rent };
}

function fillSelects(i, j) {
  const sIn = $('s-in'), sOut = $('s-out');
  sIn.innerHTML = T2.months.slice(0, -1).map((d, k) => `<option value="${k}">${monthLabel(d)}</option>`).join('');
  sIn.value = i;
  sOut.innerHTML = T2.months.map((d, k) => (k > i ? `<option value="${k}">${monthLabel(d)}</option>` : '')).join('');
  sOut.value = j;
}

function updStorage() {
  const i = +$('s-in').value, j = +$('s-out').value;
  const c = contract(i, j);
  $('o-buy').textContent = '$' + T2.prices[i].toFixed(2);
  $('o-sell').textContent = '$' + T2.prices[j].toFixed(2);
  $('o-months').textContent = c.m;
  const ov = $('o-value');
  ov.textContent = moneyK(c.value);
  ov.style.color = c.value >= 0 ? C.green() : C.red();
  const labels = ['Gas sold', 'Gas bought', 'Pumping in and out', 'Transport', 'Rent', 'Contract value'];
  const vals = [c.sell, -c.buy, -c.moving, -c.transport, -c.rent, c.value];
  const cols = vals.map((v, k) => (k === 5 ? (v >= 0 ? C.green() : C.red()) : v >= 0 ? (isDark() ? 'rgba(52,211,153,0.55)' : 'rgba(5,150,105,0.55)') : (isDark() ? 'rgba(248,113,113,0.55)' : 'rgba(220,38,38,0.5)')));
  const data = { labels, datasets: [{ label: 'Cash flow', data: vals, backgroundColor: cols, borderWidth: 0, borderRadius: 4 }] };
  if (charts.storage) { charts.storage.data = data; charts.storage.update(); }
  else {
    const o = chartOpts(function (v) { return this.getLabelForValue(v); }, (v) => moneyK(v));
    o.indexAxis = 'y'; o.plugins.legend.display = false;
    o.plugins.tooltip.callbacks = { label: (it) => money(it.parsed.x) };
    charts.storage = new Chart($('chartStorage'), { type: 'bar', data, options: o });
  }
  document.querySelectorAll('#storeGrid button').forEach((b) => b.classList.toggle('is-on', +b.dataset.i === i && +b.dataset.j === j));
}

function buildGrid() {
  const n = T2.months.length;
  const max = Math.max(...T2.grid.flat().filter((v) => v !== null).map(Math.abs));
  const bi = T2.months.indexOf(T2.best.inject), bj = T2.months.indexOf(T2.best.withdraw);
  let html = '<table><thead><tr><th scope="col"><span class="sr">Buy month</span></th>';
  for (let j = 1; j < n; j++) html += `<th scope="col">${monthLabel(T2.months[j])}</th>`;
  html += '</tr></thead><tbody>';
  for (let i = 0; i < n - 1; i++) {
    html += `<tr><th scope="row">${monthLabel(T2.months[i])}</th>`;
    for (let j = 1; j < n; j++) {
      const v = T2.grid[i][j];
      if (v === null) { html += '<td class="na"></td>'; continue; }
      const a = Math.min(1, Math.abs(v) / max);
      const tone = v >= 0 ? 'pos' : 'neg';
      html += `<td><button type="button" class="${tone}${i === bi && j === bj ? ' is-best' : ''}" style="--a:${(0.12 + 0.78 * a).toFixed(2)}" data-i="${i}" data-j="${j}" aria-label="Buy ${monthLabel(T2.months[i])}, sell ${monthLabel(T2.months[j])}: ${money(v)}" title="${money(v)}">${Math.round(v / 1000)}</button></td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table><p class="grid-note">Values in $ thousands</p>';
  $('storeGrid').innerHTML = html;
  $('storeGrid').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    fillSelects(+b.dataset.i, +b.dataset.j); updStorage();
  });
}

// ── Task 3: default model ──
function buildCoef() {
  const rows = T3.coefficients;
  charts.coef = new Chart($('chartCoef'), {
    type: 'bar',
    data: { labels: rows.map((r) => r[0]), datasets: [{ label: 'Effect on default risk', data: rows.map((r) => r[1]), backgroundColor: rows.map((r) => (r[1] > 0 ? C.red() : C.green())), borderWidth: 0, borderRadius: 4 }] },
    options: (() => { const o = chartOpts(function (v) { return this.getLabelForValue(v); }, (v) => (+v).toFixed(0)); o.indexAxis = 'y'; o.plugins.legend.display = false; o.plugins.tooltip.callbacks = { label: (it) => (it.parsed.x > 0 ? '+' : '') + it.parsed.x.toFixed(2) + (it.parsed.x > 0 ? ' (more risk)' : ' (less risk)') }; return o; })(),
  });
}

function buildDTI() {
  const rows = T3.by_dti;
  charts.dti = new Chart($('chartDTI'), {
    type: 'bar',
    data: { labels: rows.map((r) => r[0]), datasets: [{ label: 'Defaulted', data: rows.map((r) => r[1]), backgroundColor: rows.map((r) => (r[1] > 0.5 ? C.red() : r[1] > 0 ? C.amber() : C.grey())), borderWidth: 0, borderRadius: 4 }] },
    options: (() => { const o = chartOpts((v) => Math.round(v * 100) + '%', function (v) { return this.getLabelForValue(v); }); o.plugins.legend.display = false; o.scales.y.max = 1; o.plugins.tooltip.callbacks = { title: (it) => 'Debt is ' + it[0].label + ' of income', label: (it) => (it.parsed.y * 100).toFixed(1) + '% defaulted' }; return o; })(),
  });
}

// ── Task 4: ratings ──
function buildRatings() {
  const rows = T4.buckets;
  charts.ratings = new Chart($('chartRatings'), {
    type: 'bar',
    data: { labels: rows.map((r) => [String(r[0]), r[1] + '–' + r[2]]), datasets: [{ label: 'Default rate', data: rows.map((r) => r[5]), backgroundColor: rows.map((r, k) => mix(C.green(), C.red(), k / (rows.length - 1))), borderWidth: 0, borderRadius: 4 }] },
    options: (() => { const o = chartOpts((v) => Math.round(v * 100) + '%', function (v) { return this.getLabelForValue(v); }); o.plugins.legend.display = false; o.plugins.tooltip.callbacks = { title: (it) => 'Rating ' + rows[it[0].dataIndex][0] + ': FICO ' + rows[it[0].dataIndex][1] + '–' + rows[it[0].dataIndex][2], label: (it) => (it.parsed.y * 100).toFixed(2) + '% defaulted · ' + rows[it.dataIndex][3].toLocaleString('en-GB') + ' borrowers' }; return o; })(),
  });
}

function buildAll() {
  Object.keys(charts).forEach((k) => { charts[k].destroy(); delete charts[k]; });
  buildCurve(); buildBacktest(); updStorage(); buildCoef(); buildDTI(); buildRatings();
}

function start() {
  if (typeof Chart === 'undefined') return;
  buildGrid();
  fillSelects(T2.months.indexOf(T2.best.inject), T2.months.indexOf(T2.best.withdraw));
  $('s-in').addEventListener('change', () => {
    const i = +$('s-in').value; const j = Math.max(i + 1, +$('s-out').value);
    fillSelects(i, j); updStorage();
  });
  $('s-out').addEventListener('change', updStorage);
  buildAll();
  // Redraw in the right colours when the site's theme changes
  document.addEventListener('themechange', buildAll);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
})();
