# Catatan Rilis (Changelog) - TRSS Frontend

Dokumen ini mencatat ringkasan fitur, perubahan UI/UX, perbaikan bug, dan peningkatan frontend TRSS Traceability berdasarkan versi rilis. Versi menggunakan Semantic Versioning (`vMAJOR.MINOR.PATCH`) dan dimulai dari `v0.1.0` selama tahap development.

---

## [Belum Dirilis] (Unreleased)

Belum ada perubahan yang dicatat setelah rilis v0.1.0.

---

## [v0.1.0] - 16 Oktober 2026

### Fitur Frontend

- **Peluncuran awal versi frontend**:
  - Dashboard Overview untuk pemantauan produksi.
  - Halaman pengelolaan master Part, Process, dan Parameter.
  - Halaman Stock In, Stock In Rework, Print History, log System/MQTT, User, dan App Configuration.
  - Navigasi menu berdasarkan hak akses pengguna.
- **Traceability Log**:
  - Daftar dan detail unit dengan pengelompokan proses produksi, nomor seri, dan nomor issue/lot.
  - Riwayat proses dengan pilihan tampilan Session dan List, pencarian parameter/nilai, serta filter status.
  - Ringkasan pengecekan multi-titik dengan akses ke rincian nilai pengukuran.
  - Informasi konfigurasi MQTT Publisher per proses pada detail unit.
- **Process Log**:
  - Daftar log dengan pencarian nomor seri, filter tanggal, status, progres, dan pagination.
  - Halaman detail tersendiri di `/process-log/{serial-number}`, termasuk akses riwayat proses dan rincian parameter multi-titik.

### Perubahan UI/UX

- Tombol Detail Process Log pada desktop dan mobile membuka halaman detail, dilengkapi tombol Kembali ke Process Log.
- Menambahkan kolom Timestamp dari waktu pencatatan (`createdAt`) sebelum kolom Detail pada daftar Process Log.
- Memindahkan kolom Timestamp tepat sebelum Action pada daftar Traceability Log.
- Membatasi tampilan awal parameter di setiap proses pada Process Log Detail menjadi dua baris sesuai lebar layar, dengan tombol Show more / Show less.
- Menampilkan badge MQTT Publisher pada Process Log Detail hanya untuk status Disabled.
- Menyembunyikan informasi Current MQTT Publisher pada modal riwayat Traceability Log.
- Menghilangkan kode proses di bawah nama proses dan badge Result: OK/NG di sebelah status MQTT pada detail Traceability Log.

### Perbaikan Bug & Penyesuaian Tampilan

- Mengganti pengalihan otomatis route detail Process Log ke daftar dengan halaman detail yang memuat data berdasarkan nomor seri.
- Menyesuaikan warna kartu parameter Process Log Detail berdasarkan nilai dari backend: OK berwarna hijau, NG berwarna merah, dan nilai lainnya tetap ditampilkan apa adanya dengan kartu netral.
- Nilai biasa seperti nomor lot/issue tidak diubah menjadi OK/NG hanya karena memiliki field `status`.

### Peningkatan Lainnya

- Memisahkan tampilan detail Process Log dari komponen tabel agar halaman detail dapat digunakan secara mandiri.
- Mendokumentasikan kebijakan version tagging frontend dan format description annotated tag dalam README.md serta petunjuk kerja AGENTS.md.
- Menambahkan CHANGELOG.md sebagai catatan rilis khusus frontend; perubahan backend tidak dicatat sebagai fitur rilis frontend.
