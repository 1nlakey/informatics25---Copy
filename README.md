# Deploy to Vercel using Supabase (guide)

Ringkasan: saya sudah menambahkan API serverless (folder `api/`) yang menggunakan Supabase sebagai penyimpanan. Frontend di `public/` tetap pakai rute `fetch('/api/...')`, jadi setelah Anda deploy ke Vercel dan mengatur env vars Supabase, semuanya akan bekerja.

1) Buat project Supabase

- Buka https://app.supabase.com dan buat project baru.
- Di menu "SQL Editor" jalankan SQL berikut untuk membuat tabel yang dibutuhkan:

```sql
create table if not exists config (
  id serial primary key,
  unlock_messages boolean default false,
  quiz_answer text default ''
);

create table if not exists attendance (
  id serial primary key,
  name text not null,
  at timestamptz default now()
);

create table if not exists quiz_entries (
  id serial primary key,
  name text not null,
  answer text not null,
  at timestamptz default now()
);

create table if not exists messages (
  id serial primary key,
  name text not null,
  message text not null,
  at timestamptz default now()
);

-- optional: seed config row
insert into config (unlock_messages, quiz_answer)
select false, ''
where not exists (select 1 from config);
```

2) Ambil kredensial Supabase

- Dari dashboard Supabase project: copy `SUPABASE_URL` (Project URL)
- Di `Settings -> API` copy `Service Role` key (ini harus disimpan aman). Kita akan menyimpannya sebagai `SUPABASE_SERVICE_ROLE_KEY` di Vercel.

3) Set environment variables di Vercel

- Di project Vercel (dashboard) pergi ke Settings → Environment Variables
- Tambahkan dua variabel:
  - `SUPABASE_URL` = <Project URL>
  - `SUPABASE_SERVICE_ROLE_KEY` = <Service Role Key>
  - `ADMIN_SECRET` = <a strong secret string for admin endpoints>

4) Install & Deploy

Di mesin development (opsional) atau CI, install dependency dan gunakan Vercel CLI:

```powershell
# di PowerShell
cd "c:\Users\1nlakey\Desktop\informatics25 - Copy"
npm install
npm install -g vercel
vercel login
vercel --prod
```

Catatan: saya sudah menambahkan `.vercelignore` untuk mengecualikan `server.js` dan folder `db/` lokal.

5) Cek frontend

- Frontend sudah memanggil `/api/...` (lihat `public/app.js`), jadi tidak perlu mengubah URL jika Anda deploy seluruh project ke Vercel.

6) Testing lokal (opsional)

- Anda bisa menjalankan `vercel dev` setelah login untuk mencoba fungsi serverless secara lokal:

```powershell
vercel dev
```

7) Keamanan & Catatan penting

- Gunakan `Service Role` key hanya untuk server-side (Vercel env vars). Jangan menaruhnya di kode klien.
- Jika Anda butuh otentikasi admin, tambahkan mekanisme auth (saat ini API tidak memeriksa autentikasi).

8) Proteksi admin sederhana (sudah ditambahkan)

- Saya menambahkan pemeriksaan `ADMIN_SECRET` pada semua route di `api/admin/*` dan pada update `POST /api/config`.
- Set `ADMIN_SECRET` di Vercel (Environment Variables) ke string rahasia yang kuat.
- Untuk memanggil endpoint admin dari curl atau tool lain sertakan header `Authorization: Bearer <ADMIN_SECRET>` atau header `x-admin-secret: <ADMIN_SECRET>`.

Contoh curl untuk memanggil daftar absensi (admin):

```powershell
curl -H "Authorization: Bearer <YOUR_ADMIN_SECRET>" https://<your-vercel-domain>/api/admin/attendance
```


Jika mau, saya bisa:
- Membuat versi endpoint yang memakai `SUPABASE_ANON_KEY` (lebih aman untuk public read) dan memisahkan perizinan.
- Menambahkan simple middleware auth untuk admin.