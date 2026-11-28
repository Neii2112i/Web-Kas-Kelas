# 💰 Kas Kelas — Dashboard Transparansi & Pembukuan Kas Kelas Modern

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=1E2B25)
![GSAP](https://img.shields.io/badge/GSAP_3_+_ScrollTrigger-88CE02?style=for-the-badge&logo=greensock&logoColor=1E2B25)
![LocalStorage](https://img.shields.io/badge/Storage-LocalStorage-4FA9A0?style=for-the-badge)

**Kas Kelas** adalah aplikasi web pembukuan uang kas kelas modern yang mengutamakan **transparansi, kemudahan pembayaran, dan kerapian pencatatan bendahara**. Dibangun menggunakan **HTML, CSS, dan Vanilla JavaScript** murni tanpa backend (tersimpan otomatis di `localStorage` browser), dilengkapi animasi halus **GSAP + ScrollTrigger**, **Lenis Smooth Scroll**, dan generator **QR Code WhatsApp** otomatis.

---

## ✨ Fitur Unggulan

### 👥 1. Panel Siswa (Publik & 100% Transparan)
- **Floating Glass Navbar** — Navigasi kaca transparan (*glassmorphism*) dengan indikator kapsul putih yang bergeser mulus (*sliding pill indicator*) mengikuti menu aktif dan posisi scroll.
- **Expanding Hero Visual Card** — Kartu buku kas utama yang awalnya bertumpuk miring dan melebar penuh secara dinamis saat halaman di-scroll, menampilkan:
  - **Saldo Kas Terkini**, **Total Pemasukan**, **Total Pengeluaran**, dan **Rasio Siswa Lunas**.
  - **Progress Bar Target Mingguan & Bulanan** lengkap dengan efek *shimmer*.
- **Bento Interactive Analytics (2 Kolom)**
  - **Kolom Kiri (3 Slide Auto-Switch Carousel):**
    1. *Falling Pill Tags* — Animasi tag siswa lunas & badge disiplin yang jatuh memantul (*bounce*) dan interaktif saat diklik.
    2. *Grafik Batang Mingguan* — Persentase kelunasan kas pada 5 minggu terakhir.
    3. *Tren Gelombang (Wavy Line Chart)* — Grafik SVG interaktif dengan *floating dark pill tooltip* saat titik minggu disentuh/diklik.
  - **Kolom Kanan (Ringkasan Pertumbuhan):** Filter rentang waktu (`1 Minggu`, `1 Bulan`, `1 Semester`, `Semua`) lengkap dengan mini *sparkline* SVG.
- **Manifesto & Alur 3 Langkah Cara Bayar** — Tipografi modern dengan *marquee pill* berjalan serta 3 kartu langkah pembayaran bertingkat (*staggered steps*).
- **Daftar Tunggakan Real-Time** — Cari nama siswa dan lihat rincian minggu yang belum dibayar beserta total nominalnya (`Rp 5.000 × jumlah minggu`), dilengkapi tombol **"Bayar Sekarang"** 1-klik.
- **Bayar via QR Code WhatsApp Otomatis** — Pilih nama siswa dan centang minggu yang ingin dibayar (bisa bayar 1 minggu atau rapel beberapa minggu sekaligus). Sistem otomatis:
  - Menghitung total tagihan (`Minggu × Rp 5.000`).
  - Membuat **QR Code** (`QRCode.js`) dan tombol **Buka di WhatsApp** yang langsung mengarah ke nomor WA Bendahara dengan pesan konfirmasi terformat rapi.
- **Big Rolling Counters** — Sorotan angka kas raksasa dengan animasi *count-up* saat masuk ke layar.
- **Leaderboard "Hall of Fame Paling Rajin"** — Peringkat siswa paling disiplin berdasarkan kelunasan dan ketepatan waktu bayar (maksimal 7 hari sejak jadwal minggu), lengkap dengan badge *Teladan Utama*, *Disiplin Tinggi*, dan *Tepat Waktu*.
- **Buku Pengeluaran Transparan** — Rincian setiap rupiah yang keluar dari kas kelas lengkap dengan bar proporsi kategori (`ATK & Fotokopi`, `Kebersihan Kelas`, `Acara & Konsumsi`, `Dana Sosial & Kasih`, `Dekorasi & Inventaris`, `Lainnya`).
- **Catatan Pengurus (Masonry Grid) & FAQ Accordion** — Pengumuman dari pengurus kelas dalam tata letak *3-column masonry* serta daftar pertanyaan umum interaktif.

---

### 🛡️ 2. Panel Bendahara (Admin Terproteksi)
- **Keamanan Login PIN / Password**
  - Dilindungi password khusus bendahara (Default: `kas2026`).
  - **Proteksi Brute-Force:** Maksimal 3 kali percobaan salah sebelum akses dikunci sementara (*cooldown timer* 20 detik dengan progress bar).
  - **Auto-Lock Idle:** Panel bendahara otomatis terkunci kembali ke mode siswa jika tidak ada aktivitas selama 25 menit.
- **Tabel Centang Pembayaran Interaktif**
  - Klik tombol centang pada sel minggu siswa untuk langsung menandai lunas / belum bayar — seluruh saldo, grafik Bento, daftar tunggakan, dan leaderboard langsung ter-update secara *real-time*.
  - **Kelola Kolom Minggu:** Tambah minggu baru (tanggal otomatis +7 hari), edit nama/tanggal minggu, centang/kosongkan seluruh siswa dalam 1 minggu, atau hapus kolom minggu.
  - **Tagih WA 1-Klik:** Tombol **"Tagih"** otomatis muncul pada siswa yang menunggak dan langsung membuka chat WhatsApp siswa tersebut beserta rincian minggu tunggakannya.
  - **Salin Rekap Grup WA:** Buat laporan rekap kas berformat pesan WhatsApp siap tempel ke grup kelas dalam 1 klik.
- **Kelola Data Siswa (CRUD)** — Tambah siswa baru, edit nama & nomor WhatsApp (otomatis dinormalisasi dari `08...` ke `628...`), atau hapus siswa.
- **Catat & Kelola Pengeluaran** — Form input pengeluaran dengan tombol nominal cepat (`5rb`, `10rb`, `20rb`, `50rb`, `100rb`), pilihan kategori berwarna, dan riwayat pengeluaran.
- **Kalkulator Kas Melayang (Draggable Floating Calculator)**
  - Dapat digeser (*drag & drop*) di layar dan memiliki 2 tab:
    1. **Tab Hitung:** Kalkulator matematika lengkap dengan tombol cepat `+5rb`, `+10rb`, dan `×5rb`.
    2. **Tab Kembalian:** Hitung uang kembalian atau kurang bayar secara instan berdasarkan jumlah minggu (`1 mgg` – `4 mgg`) dan pecahan uang tunai yang diterima.
- **Pengaturan & Backup Data**
  - Ubah **Nama Kelas** (otomatis memperbarui seluruh tampilan halaman) dan **Nomor WhatsApp Bendahara**.
  - **Ganti Password** bendahara (disimpan dalam bentuk *salted hash* di `localStorage`).
  - **Export & Import Backup (`.json`)** untuk mencadangkan atau memulihkan seluruh data kas.
  - **Export Laporan (`.csv` / Excel)** lengkap dengan tabel matriks kelunasan siswa, ringkasan saldo, dan riwayat pengeluaran.
  - **Zona Berbahaya:** Muat ulang 18 siswa data contoh (*demo data*) atau kosongkan seluruh pembukuan dari awal.

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Kegunaan |
| :--- | :--- |
| **HTML5 & CSS3** | Struktur semantik, Custom Properties, CSS Grid/Flexbox, Glassmorphism, 3-Column Masonry |
| **Vanilla JavaScript (ES6+)** | State management, kalkulasi kas, DOM rendering, & persistensi `localStorage` |
| **[GSAP 3 + ScrollTrigger](https://gsap.com/)** | Animasi *Expanding Hero Card*, *Split-Word Title Reveal*, *Falling Pills Bounce*, & *Rolling Counters* |
| **[Lenis Smooth Scroll](https://lenis.darkroom.engineering/)** | Efek *smooth scrolling* halaman yang disinkronkan dengan *GSAP Ticker* |
| **[QRCode.js](https://davidshimjs.github.io/qrcodejs/)** | Pembuatan QR Code pembayaran WhatsApp secara instan di sisi klien |
| **[Lucide Icons](https://lucide.dev/)** | Ikon vektor modern & bersih dengan sistem *inline SVG fallback* |
| **Google Fonts** | Kombinasi font *Bricolage Grotesque* (judul/display) & *Plus Jakarta Sans* (teks & angka tabular) |

---

## 📂 Struktur File

```text
kas-kelas/
├── index.html   # Struktur utama halaman (Panel Siswa, Panel Bendahara, Modal & Kalkulator)
├── style.css    # Seluruh styling, palet warna pastel, glassmorphism, animasi & responsivitas
├── script.js    # Logika aplikasi, state localStorage, QR WhatsApp, GSAP ScrollTrigger & kalkulator
└── README.md    # Dokumentasi proyek
```

---

## 🚀 Cara Menjalankan Proyek

1. **Clone atau Download Repository ini:**
   ```bash
   git clone https://github.com/Neii2112i/Web-Kas-Kelas.git
   cd kas-kelas
   ```
2. **Buka di Browser:**
   - Cukup klik dua kali file `index.html`, atau
   - Gunakan ekstensi **Live Server** di VS Code agar lebih nyaman saat melakukan pengembangan.
3. **Login ke Panel Bendahara:**
   - Klik tombol **`Login Bendahara`** di pojok kanan atas navbar.
   - Masukkan password default:
     ```text
     kas2026
     ```

---

## ⚙️ Konfigurasi Awal Kelas

Kamu bisa langsung mengubah nama kelas, nomor WhatsApp bendahara, dan password lewat menu **Pengaturan** di dalam **Panel Bendahara**, atau mengubah nilai bawaannya di bagian paling atas file `script.js`:

```javascript
const CONFIG = {
  BENDAHARA_WA_DEFAULT: '6281234567890', // Nomor WA Bendahara (format 62...)
  DEFAULT_PASSWORD: 'kas2026',           // Password awal Panel Bendahara
  CLASS_NAME_DEFAULT: 'XE 3',            // Nama kelas default
  WEEKLY_FEE: 5000,                      // Nominal iuran per minggu (Rp 5.000)
  STORAGE_KEY: 'kas_kelas_app_v1',
  AUTH_KEY: 'kas_kelas_auth_v1',
  MAX_LOGIN_ATTEMPTS: 3,                 // Batas salah password sebelum cooldown
  COOLDOWN_SECONDS: 20,                  // Durasi cooldown (detik) saat salah 3x
  AUTO_LOCK_MINUTES: 25                  // Kunci otomatis jika tidak aktif (menit)
};
```

---

## 📱 Responsivitas & Kompatibilitas

- **Desktop & Laptop:** Tampilan penuh dengan menu pill kaca di tengah navbar, layout Bento 2 kolom, dan kalkulator melayang yang bisa di-*drag*.
- **Tablet & Mobile (HP):** Tata letak otomatis menyesuaikan menjadi 1 kolom yang nyaman disentuh, tabel kas mendukung *horizontal swipe* dengan kolom nama *sticky*, serta tombol QR WhatsApp langsung membuka aplikasi WhatsApp di HP.

---

## 📄 Lisensi

Proyek ini bebas digunakan, dimodifikasi, dan dikembangkan untuk keperluan transparansi kas kelas sekolah maupun organisasi siswa.