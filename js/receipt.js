/**
 * receipt.js — Cetak struk/nota digital (siap thermal printer 58/80mm)
 * dan unduh struk sebagai PDF.
 */

function buildReceiptHTML(trx, product) {
  const store = getStoreName();
  const unitPrice = product ? product.sellPrice : Math.round(trx.total / trx.qty);
  return `
    <div class="receipt">
      <div class="r-center r-bold r-lg">${store}</div>
      <div class="r-center r-sm">Nota Penjualan / Struk</div>
      <div class="r-divider"></div>
      <div class="r-row"><span>No. Struk</span><span>${trx.trxCode}</span></div>
      <div class="r-row"><span>Tanggal</span><span>${formatDate(trx.date)}</span></div>
      <div class="r-row"><span>Jam</span><span>${trx.time || '-'} WIB</span></div>
      <div class="r-row"><span>Kasir</span><span>${trx.createdByName || '-'}</span></div>
      <div class="r-row"><span>Pelanggan</span><span>${trx.customer}</span></div>
      <div class="r-divider"></div>
      <div class="r-row r-bold"><span>${trx.product}</span></div>
      <div class="r-row"><span>${trx.qty} x ${formatRupiah(unitPrice)}</span><span>${formatRupiah(trx.total)}</span></div>
      <div class="r-divider"></div>
      <div class="r-row r-bold r-lg"><span>TOTAL</span><span>${formatRupiah(trx.total)}</span></div>
      <div class="r-row"><span>Metode Bayar</span><span>${trx.paymentMethod || '-'}</span></div>
      <div class="r-row"><span>Status</span><span>${trx.status}</span></div>
      <div class="r-divider"></div>
      <div class="r-center r-sm">Terima kasih atas kunjungan Anda!</div>
      <div class="r-center r-sm">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</div>
    </div>
  `;
}

const RECEIPT_STYLE = `
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; margin: 0; padding: 14px; color: #111; background:#fff; }
  .receipt { width: 280px; margin: 0 auto; font-size: 12.5px; }
  .r-center { text-align: center; }
  .r-bold { font-weight: 700; }
  .r-sm { font-size: 11px; }
  .r-lg { font-size: 14px; }
  .r-row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
  .r-divider { border-top: 1px dashed #333; margin: 8px 0; }
  @media print {
    @page { margin: 0; }
    body { padding: 8px; }
  }
`;

/** Cetak struk lewat dialog print browser (siap untuk printer thermal 58/80mm). */
function printReceipt(trx, product) {
  const win = window.open('', 'PrintReceipt', 'width=380,height=640');
  if (!win) { showToast('Popup diblokir browser — izinkan popup untuk mencetak struk.', 'warning'); return; }

  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Struk ${trx.trxCode}</title>
    <style>${RECEIPT_STYLE}</style></head>
    <body>${buildReceiptHTML(trx, product)}</body></html>
  `);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

/** Unduh struk sebagai file PDF (ukuran mirip kertas thermal 80mm). */
function downloadReceiptPDF(trx, product) {
  const { jsPDF } = window.jspdf;
  const store = getStoreName();
  const unitPrice = product ? product.sellPrice : Math.round(trx.total / trx.qty);

  const doc = new jsPDF({ unit: 'mm', format: [80, 160] });
  let y = 10;
  const centerX = 40;

  doc.setFont('courier', 'bold'); doc.setFontSize(11);
  doc.text(store, centerX, y, { align: 'center' }); y += 5;
  doc.setFont('courier', 'normal'); doc.setFontSize(8.5);
  doc.text('Nota Penjualan / Struk', centerX, y, { align: 'center' }); y += 4;
  doc.setLineDashPattern([1, 1], 0); doc.line(6, y, 74, y); y += 4;

  const row = (label, value) => {
    doc.text(label, 6, y);
    doc.text(String(value), 74, y, { align: 'right' });
    y += 4.2;
  };
  row('No. Struk', trx.trxCode);
  row('Tanggal', formatDate(trx.date));
  row('Jam', `${trx.time || '-'} WIB`);
  row('Kasir', trx.createdByName || '-');
  row('Pelanggan', trx.customer);
  doc.line(6, y, 74, y); y += 4;

  doc.setFont('courier', 'bold');
  doc.text(trx.product, 6, y); y += 4.2;
  doc.setFont('courier', 'normal');
  row(`${trx.qty} x ${formatRupiah(unitPrice)}`, formatRupiah(trx.total));
  doc.line(6, y, 74, y); y += 4;

  doc.setFont('courier', 'bold'); doc.setFontSize(10);
  row('TOTAL', formatRupiah(trx.total));
  doc.setFont('courier', 'normal'); doc.setFontSize(8.5);
  row('Metode Bayar', trx.paymentMethod || '-');
  row('Status', trx.status);
  doc.line(6, y, 74, y); y += 5;

  doc.setFontSize(8);
  doc.text('Terima kasih atas kunjungan Anda!', centerX, y, { align: 'center' });

  doc.save(`struk-${trx.trxCode}.pdf`);
}
