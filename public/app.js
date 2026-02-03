const attendanceForm = document.getElementById('attendance-form');
const attendanceStatus = document.getElementById('attendance-status');
const attendanceSection = document.getElementById('attendance-section');
const introCard = document.getElementById('intro-card');
const quizForm = document.getElementById('quiz-form');
const quizStatus = document.getElementById('quiz-status');
const quizSection = document.getElementById('quiz-section');
const messageForm = document.getElementById('message-form');
const messageStatus = document.getElementById('message-status');
const messageCard = document.getElementById('message-card');
const messageLocked = document.getElementById('message-locked');
const messageList = document.getElementById('message-list');
const messageListSection = document.getElementById('message-list-section');
const refreshMessagesBtn = document.getElementById('refresh-messages');
let hasAttendance = false;

function setStatus(el, msg, ok = true) {
  el.textContent = msg;
  el.style.color = ok ? '#16a34a' : '#dc2626';
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  const unlocked = Boolean(cfg.unlock_messages);
  messageForm.classList.toggle('hidden', !unlocked);
  messageLocked.classList.toggle('hidden', unlocked);
}

async function loadMessages() {
  const res = await fetch('/api/messages');
  const data = await res.json();
  if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
    messageList.innerHTML = '<p class="muted">Belum ada pesan.</p>';
    return;
  }
  messageList.innerHTML = data.messages
    .map(
      (m) => `
      <div class="item">
        <strong>${m.name}</strong>
        <p>${m.message}</p>
        <div class="row"><span>${new Date(m.at).toLocaleString('id-ID')}</span></div>
      </div>
    `
    )
    .join('');
}

attendanceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(attendanceForm);
  const payload = Object.fromEntries(formData.entries());
  attendanceStatus.textContent = '';
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(attendanceStatus, data.error || 'Gagal mengirim absensi', false);
    return;
  }
  attendanceForm.reset();
  setStatus(attendanceStatus, 'Absensi berhasil dikirim');
  localStorage.setItem('attendance_done', '1');
  setAttendanceGate(true);
});

quizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasAttendance) {
    setStatus(quizStatus, 'Isi absensi dulu', false);
    return;
  }
  const formData = new FormData(quizForm);
  const payload = Object.fromEntries(formData.entries());
  quizStatus.textContent = '';
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(quizStatus, data.error || 'Gagal mengirim jawaban', false);
    return;
  }
  quizForm.reset();
  setStatus(quizStatus, 'Jawaban berhasil dikirim');
});

messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!hasAttendance) {
    setStatus(messageStatus, 'Isi absensi dulu', false);
    return;
  }
  const formData = new FormData(messageForm);
  const payload = Object.fromEntries(formData.entries());
  messageStatus.textContent = '';
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(messageStatus, data.error || 'Gagal mengirim pesan', false);
    return;
  }
  messageForm.reset();
  setStatus(messageStatus, 'Pesan berhasil dikirim');
  loadMessages();
});

refreshMessagesBtn.addEventListener('click', loadMessages);

function setAttendanceGate(done) {
  hasAttendance = done;
  introCard.classList.toggle('hidden', done);
  attendanceSection.classList.toggle('hidden', done);
  quizSection.classList.toggle('hidden', !done);
  messageCard.classList.toggle('hidden', !done);
  messageListSection.classList.toggle('hidden', !done);
  if (done) {
    loadConfig();
    loadMessages();
  }
}

const initialAttendance = localStorage.getItem('attendance_done') === '1';
setAttendanceGate(initialAttendance);
