/**
 * charts.js — Line chart (tren bulanan) & Pie chart (kategori produk)
 * Menggunakan Chart.js (CDN). Warna mengikuti tema aktif (light/dark).
 */
let lineChartInstance = null;
let pieChartInstance = null;

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const PIE_COLORS = ['#2554e8', '#0aa6c2', '#f0a63d', '#38c793', '#c22b3e', '#8b5cf6'];

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildMonthlySeries(transactions) {
  const map = {};
  transactions.forEach((t) => {
    const key = t.date.slice(0, 7); // YYYY-MM
    map[key] = (map[key] || 0) + t.total;
  });
  const keys = Object.keys(map).sort();
  return {
    labels: keys.map((k) => MONTH_NAMES[parseInt(k.slice(5, 7), 10) - 1]),
    values: keys.map((k) => map[k]),
  };
}

function buildCategorySeries(transactions) {
  const map = {};
  transactions.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.total;
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return entries.map(([label, value], i) => ({
    label, value, pct: total ? Math.round((value / total) * 100) : 0, color: PIE_COLORS[i % PIE_COLORS.length],
  }));
}

function renderLineChart(transactions) {
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  const { labels, values } = buildMonthlySeries(transactions);
  const primary = cssVar('--primary');
  const text = cssVar('--text-muted');
  const border = cssVar('--border');

  if (lineChartInstance) lineChartInstance.destroy();

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, primary + '33');
  gradient.addColorStop(1, primary + '00');

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total Penjualan',
        data: values,
        borderColor: primary,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        borderWidth: 2.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ' Rp ' + ctx.parsed.y.toLocaleString('id-ID'),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: text, font: { size: 11 } } },
        y: {
          grid: { color: border },
          ticks: {
            color: text, font: { size: 11 },
            callback: (v) => v >= 1000000 ? (v / 1000000) + 'jt' : v >= 1000 ? (v / 1000) + 'rb' : v,
          },
        },
      },
    },
  });
}

function renderPieChart(transactions) {
  const ctx = document.getElementById('pieChart');
  if (!ctx) return;
  const data = buildCategorySeries(transactions);

  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.label),
      datasets: [{
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => d.color),
        borderColor: cssVar('--surface'),
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${data[ctx.dataIndex].pct}%`,
          },
        },
      },
    },
  });

  // Render legend kustom di bawah pie chart
  const legendEl = document.getElementById('pieLegend');
  if (legendEl) {
    legendEl.innerHTML = data.map((d) => `
      <div class="legend-row">
        <span class="dot-label">
          <span class="legend-dot" style="background:${d.color}"></span>
          ${d.label}
        </span>
        <span class="pct">${d.pct}%</span>
      </div>
    `).join('');
  }
}

function renderCharts(transactions) {
  renderLineChart(transactions);
  renderPieChart(transactions);
}

// Gambar ulang chart saat tema berganti agar warna teks/grid tetap sesuai
window.addEventListener('themechange', () => {
  if (window.__lastTransactions) renderCharts(window.__lastTransactions);
});
