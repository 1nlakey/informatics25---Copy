const unlockStatus = document.getElementById('unlock-status');
const unlockBtn = document.getElementById('unlock-btn');
const lockBtn = document.getElementById('lock-btn');
const answerForm = document.getElementById('answer-form');
const answerStatus = document.getElementById('answer-status');
const winnerView = document.getElementById('winner-view');
const refreshWinnerBtn = document.getElementById('refresh-winner');
const attendanceSort = document.getElementById('attendance-sort');
const refreshAttendanceBtn = document.getElementById('refresh-attendance');
const attendanceTableBody = document.querySelector('#attendance-table tbody');
const attendanceSelectAll = document.getElementById('attendance-select-all');
const deleteAttendanceBtn = document.getElementById('delete-attendance');
const exportCsvBtn = document.getElementById('export-csv');
const exportXlsBtn = document.getElementById('export-xls');
const refreshQuizBtn = document.getElementById('refresh-quiz');
const deleteQuizBtn = document.getElementById('delete-quiz');
const quizTableBody = document.querySelector('#quiz-table tbody');
const quizSelectAll = document.getElementById('quiz-select-all');
const refreshMessagesAdminBtn = document.getElementById('refresh-messages-admin');
const deleteMessagesBtn = document.getElementById('delete-messages');
const messagesTableBody = document.querySelector('#messages-table tbody');
const messagesSelectAll = document.getElementById('messages-select-all');
let attendanceData = [];
let quizData = [];
let messagesData = [];

function setStatus(el, msg, ok = true) {
  el.textContent = msg;
  el.style.color = ok ? '#16a34a' : '#dc2626';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  unlockStatus.textContent = cfg.unlock_messages
    ? 'Status: Form pesan & kesan sedang dibuka'
    : 'Status: Form pesan & kesan masih terkunci';
  if (cfg.quiz_answer) {
    answerForm.elements.answer.value = cfg.quiz_answer;
  }
}

async function loadWinner() {
  const res = await fetch('/api/winners');
  const data = await res.json();
  if (!data || !data.correct || data.correct.length === 0) {
    winnerView.innerHTML = '<p class="muted">Belum ada jawaban benar.</p>';
    return;
  }
  const winner = data.winner;
  const winnerBlock = winner
    ? `<div class="item"><strong>Pemenang Terpilih:</strong> ${escapeHtml(winner.name)}</div>`
    : '';
  const list = data.correct
    .map(
      (item) => `
      <div class="item">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="row"><span>Jawaban:</span><span>${escapeHtml(item.answer)}</span></div>
        <div class="row"><span>${new Date(item.at).toLocaleString('id-ID')}</span></div>
      </div>
    `
    )
    .join('');
  winnerView.innerHTML = `${winnerBlock}${list}`;
}

function sortAttendance(data, mode) {
  const list = [...data];
  switch (mode) {
    case 'id_asc':
      return list.sort((a, b) => a.id - b.id);
    case 'id_desc':
      return list.sort((a, b) => b.id - a.id);
    case 'name_asc':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc':
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case 'time_asc':
      return list.sort((a, b) => new Date(a.at) - new Date(b.at));
    case 'time_desc':
      return list.sort((a, b) => new Date(b.at) - new Date(a.at));
    default:
      return list;
  }
}

function renderAttendance(data) {
  if (!data || data.length === 0) {
    attendanceTableBody.innerHTML =
      '<tr><td colspan="4" class="muted">Belum ada data absensi.</td></tr>';
    return;
  }
  attendanceTableBody.innerHTML = data
    .map(
      (item) => `
      <tr>
        <td class="cell-center"><input type="checkbox" class="attendance-select" data-id="${item.id}" /></td>
        <td>${item.id}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${new Date(item.at).toLocaleString('id-ID')}</td>
      </tr>
    `
    )
    .join('');
}

async function loadAttendance() {
  const res = await fetch('/api/admin/attendance');
  const data = await res.json();
  attendanceData = Array.isArray(data.items) ? data.items : [];
  const sorted = sortAttendance(attendanceData, attendanceSort.value);
  renderAttendance(sorted);
  attendanceSelectAll.checked = false;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const sorted = sortAttendance(attendanceData, attendanceSort.value);
  const header = ['ID', 'Nama', 'Timestamp'];
  const rows = sorted.map((item) => [
    item.id,
    `"${String(item.name).replace(/"/g, '""')}"`,
    `"${item.at}"`,
  ]);
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, 'absensi.csv', 'text/csv;charset=utf-8');
}

function exportXls() {
  const sorted = sortAttendance(attendanceData, attendanceSort.value);
  const rows = sorted
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.at}</td></tr>`
    )
    .join('');
  const table = `<table><thead><tr><th>ID</th><th>Nama</th><th>Timestamp</th></tr></thead><tbody>${rows}</tbody></table>`;
  downloadFile(
    table,
    'absensi.xls',
    'application/vnd.ms-excel;charset=utf-8'
  );
}

async function loadQuiz() {
  const res = await fetch('/api/admin/quiz');
  const data = await res.json();
  quizData = Array.isArray(data.items) ? data.items : [];
  if (quizData.length === 0) {
    quizTableBody.innerHTML =
      '<tr><td colspan="5" class="muted">Belum ada data kuis.</td></tr>';
    return;
  }
  quizTableBody.innerHTML = quizData
    .map(
      (item) => `
      <tr>
        <td class="cell-center"><input type="checkbox" class="quiz-select" data-id="${item.id}" /></td>
        <td>${item.id}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.answer)}</td>
        <td>${new Date(item.at).toLocaleString('id-ID')}</td>
      </tr>
    `
    )
    .join('');
  quizSelectAll.checked = false;
}

async function loadMessagesAdmin() {
  const res = await fetch('/api/admin/messages');
  const data = await res.json();
  messagesData = Array.isArray(data.items) ? data.items : [];
  if (messagesData.length === 0) {
    messagesTableBody.innerHTML =
      '<tr><td colspan="5" class="muted">Belum ada pesan.</td></tr>';
    return;
  }
  messagesTableBody.innerHTML = messagesData
    .map(
      (item) => `
      <tr>
        <td class="cell-center"><input type="checkbox" class="messages-select" data-id="${item.id}" /></td>
        <td>${item.id}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.message)}</td>
        <td>${new Date(item.at).toLocaleString('id-ID')}</td>
      </tr>
    `
    )
    .join('');
  messagesSelectAll.checked = false;
}

function getSelectedIds(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter((el) => el.checked)
    .map((el) => Number(el.dataset.id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function deleteSelected(endpoint, selector, reload) {
  const ids = getSelectedIds(selector);
  if (ids.length === 0) return;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) return;
  reload();
}

async function setUnlock(value) {
  const res = await fetch('/api/admin/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock: value }),
  });
  if (!res.ok) {
    setStatus(unlockStatus, 'Gagal mengubah status', false);
    return;
  }
  loadConfig();
}

unlockBtn.addEventListener('click', () => setUnlock(true));
lockBtn.addEventListener('click', () => setUnlock(false));
refreshWinnerBtn.addEventListener('click', loadWinner);
attendanceSort.addEventListener('change', () => {
  const sorted = sortAttendance(attendanceData, attendanceSort.value);
  renderAttendance(sorted);
});
refreshAttendanceBtn.addEventListener('click', loadAttendance);
exportCsvBtn.addEventListener('click', exportCSV);
exportXlsBtn.addEventListener('click', exportXls);
deleteAttendanceBtn.addEventListener('click', () =>
  deleteSelected('/api/admin/attendance/delete', '.attendance-select', loadAttendance)
);
attendanceSelectAll.addEventListener('change', (e) => {
  document.querySelectorAll('.attendance-select').forEach((el) => {
    el.checked = e.target.checked;
  });
});
refreshQuizBtn.addEventListener('click', loadQuiz);
deleteQuizBtn.addEventListener('click', () =>
  deleteSelected('/api/admin/quiz/delete', '.quiz-select', loadQuiz)
);
quizSelectAll.addEventListener('change', (e) => {
  document.querySelectorAll('.quiz-select').forEach((el) => {
    el.checked = e.target.checked;
  });
});
refreshMessagesAdminBtn.addEventListener('click', loadMessagesAdmin);
deleteMessagesBtn.addEventListener('click', () =>
  deleteSelected('/api/admin/messages/delete', '.messages-select', loadMessagesAdmin)
);
messagesSelectAll.addEventListener('change', (e) => {
  document.querySelectorAll('.messages-select').forEach((el) => {
    el.checked = e.target.checked;
  });
});

answerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  answerStatus.textContent = '';
  const formData = new FormData(answerForm);
  const payload = Object.fromEntries(formData.entries());
  const res = await fetch('/api/admin/quiz-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(answerStatus, data.error || 'Gagal menyimpan jawaban', false);
    return;
  }
  setStatus(answerStatus, 'Jawaban berhasil disimpan');
});

loadConfig();
loadWinner();
loadAttendance();
loadQuiz();
loadMessagesAdmin();
