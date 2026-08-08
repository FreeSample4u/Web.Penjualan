/**
 * table.js — render tabel Transaksi: search, filter rentang tanggal,
 * filter status, sorting per kolom, pagination, dan aksi Edit/Hapus
 * (Edit/Hapus hanya tampil untuk role Owner).
 */
const tableState = {
  all: [],
  filtered: [],
  page: 1,
  pageSize: 8,
  sortKey: 'date',
  sortDir: 'desc',
};

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function applyTableFilters() {
  const q = (document.getElementById('tableSearch')?.value || '').toLowerCase().trim();
  const from = document.getElementById('dateFrom')?.value;
  const to = document.getElementById('dateTo')?.value;
  const status = document.getElementById('statusFilter')?.value;

  let rows = tableState.all.filter((t) => {
    const matchQ = !q || t.trxCode.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.product.toLowerCase().includes(q);
    const matchFrom = !from || t.date >= from;
    const matchTo = !to || t.date <= to;
    const matchStatus = !status || status === 'all' || t.status === status;
    return matchQ && matchFrom && matchTo && matchStatus;
  });

  rows = rows.sort((a, b) => {
    const key = tableState.sortKey === 'id' ? 'trxCode' : tableState.sortKey;
    let va = a[key], vb = b[key];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return tableState.sortDir === 'asc' ? -1 : 1;
    if (va > vb) return tableState.sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  tableState.filtered = rows;
  tableState.page = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const info = document.getElementById('tableInfo');
  const pag = document.getElementById('pagination');
  if (!tbody) return;

  const owner = isOwner();
  const total = tableState.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / tableState.pageSize));
  tableState.page = Math.min(tableState.page, totalPages);

  const start = (tableState.page - 1) * tableState.pageSize;
  const pageRows = tableState.filtered.slice(start, start + tableState.pageSize);

  const colCount = owner ? 9 : 7;

  if (pageRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}"><div class="empty-state">Tidak ada transaksi yang cocok dengan pencarian / filter.</div></td></tr>`;
  } else {
    tbody.innerHTML = pageRows.map((t) => `
      <tr data-id="${t.id}" title="${owner ? 'Klik dua kali untuk lihat detail' : ''}">
        <td><strong>${t.trxCode}</strong></td>
        <td>${formatDate(t.date)}</td>
        <td>${t.time || '-'} WIB</td>
        <td>${t.customer}</td>
        <td>${t.product}</td>
        <td>${t.qty}</td>
        <td>${formatRupiah(t.total)}</td>
        <td><span class="status-pill ${t.status === 'Lunas' ? 'status-lunas' : 'status-pending'}">${t.status}</span></td>
        ${owner ? `
        <td class="action-cell">
          <button class="row-action-btn edit" data-action="edit" title="Edit">✏️</button>
          <button class="row-action-btn delete" data-action="delete" title="Hapus">🗑️</button>
        </td>` : ''}
      </tr>
    `).join('');

    if (owner) {
      tbody.querySelectorAll('tr[data-id]').forEach((tr) => {
        tr.addEventListener('dblclick', () => {
          const trx = tableState.all.find((t) => t.id === tr.dataset.id);
          if (trx) openTrxDetailModal(trx);
        });
      });
      tbody.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.closest('tr').dataset.id;
          const trx = tableState.all.find((t) => t.id === id);
          if (trx) openEditTransactionModal(trx);
        });
      });
      tbody.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.closest('tr').dataset.id;
          const trx = tableState.all.find((t) => t.id === id);
          if (!trx) return;
          if (confirm(`Hapus transaksi ${trx.trxCode}? Tindakan ini tidak bisa dibatalkan.`)) {
            await deleteTransaction(id);
            showToast(`Transaksi ${trx.trxCode} dihapus.`, 'success');
            await refreshAllData();
          }
        });
      });
    }
  }

  if (info) info.textContent = total === 0
    ? 'Menampilkan 0 transaksi'
    : `Menampilkan ${start + 1}–${Math.min(start + tableState.pageSize, total)} dari ${total} transaksi`;

  if (pag) {
    let html = `<button ${tableState.page === 1 ? 'disabled' : ''} data-page="prev">‹</button>`;
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7 && Math.abs(p - tableState.page) > 2 && p !== 1 && p !== totalPages) {
        if (p === 2 || p === totalPages - 1) html += `<span style="padding:0 4px;color:var(--text-faint)">…</span>`;
        continue;
      }
      html += `<button class="${p === tableState.page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button ${tableState.page === totalPages ? 'disabled' : ''} data-page="next">›</button>`;
    pag.innerHTML = html;

    pag.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.page;
        if (d === 'prev') tableState.page = Math.max(1, tableState.page - 1);
        else if (d === 'next') tableState.page = Math.min(totalPages, tableState.page + 1);
        else tableState.page = parseInt(d, 10);
        renderTable();
      });
    });
  }
}

function initTable(transactions) {
  tableState.all = transactions;
  tableState.filtered = transactions;

  // Tampilkan/sembunyikan header kolom Aksi sesuai role
  const actionHeader = document.getElementById('actionColHeader');
  if (actionHeader) actionHeader.style.display = isOwner() ? '' : 'none';

  document.getElementById('tableSearch')?.addEventListener('input', applyTableFilters);
  document.getElementById('dateFrom')?.addEventListener('change', applyTableFilters);
  document.getElementById('dateTo')?.addEventListener('change', applyTableFilters);
  document.getElementById('statusFilter')?.addEventListener('change', applyTableFilters);
  document.getElementById('resetFilters')?.addEventListener('click', () => {
    document.getElementById('tableSearch').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('statusFilter').value = 'all';
    applyTableFilters();
  });

  document.querySelectorAll('.data-table thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (tableState.sortKey === key) {
        tableState.sortDir = tableState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        tableState.sortKey = key;
        tableState.sortDir = 'asc';
      }
      applyTableFilters();
    });
  });

  renderTable();
}
