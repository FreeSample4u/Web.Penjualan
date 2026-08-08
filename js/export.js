/**
 * export.js — Ekspor data tabel (yang sedang terfilter) ke PDF & Excel.
 * Library: jsPDF + jspdf-autotable (PDF), SheetJS/xlsx (Excel) — via CDN.
 */

function getExportRows() {
  // Ekspor mengikuti hasil pencarian & filter yang sedang aktif di tabel
  return tableState.filtered.length ? tableState.filtered : tableState.all;
}

function exportToExcel() {
  const rows = getExportRows();
  if (!rows.length) { alert('Tidak ada data untuk diekspor.'); return; }

  const sheetData = rows.map((t) => ({
    'ID Transaksi': t.trxCode,
    'Tanggal': formatDate(t.date),
    'Nama Pelanggan': t.customer,
    'Produk': t.product,
    'Jumlah': t.qty,
    'Total Harga (Rp)': t.total,
    'Status': t.status,
  }));

  const ws = XLSX.utils.json_to_sheet(sheetData);
  ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 24 }, { wch: 9 }, { wch: 16 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');

  const fileName = `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function exportToPDF() {
  const rows = getExportRows();
  if (!rows.length) { alert('Tidak ada data untuk diekspor.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(15);
  doc.text('Laporan Penjualan', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Diekspor pada ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} • ${rows.length} transaksi`, 14, 22);

  doc.autoTable({
    startY: 28,
    head: [['ID Transaksi', 'Tanggal', 'Nama Pelanggan', 'Produk', 'Jumlah', 'Total Harga', 'Status']],
    body: rows.map((t) => [t.trxCode, formatDate(t.date), t.customer, t.product, t.qty, formatRupiah(t.total), t.status]),
    headStyles: { fillColor: [37, 84, 232] },
    styles: { fontSize: 8.5, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 247, 251] },
  });

  const fileName = `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

function initExportButtons() {
  document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel);
  document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF);
}
