# TRSS Frontend

Frontend untuk aplikasi TRSS Traceability System.

## Prasyarat

- Node.js 20 atau versi yang lebih baru
- npm
- Backend TRSS sudah berjalan

## Menjalankan Project

1. Clone repository:

   ```bash
   git clone https://github.com/YudaGuntoro/TRSS-Frontend.git
   cd TRSS-Frontend
   ```

2. Install dependency:

   ```bash
   npm install
   ```

3. Buat file `.env.local` dari template:

   ```bash
   cp .env.example .env.local
   ```

   Isi `NEXT_PUBLIC_API_BASE_URL` sesuai host dan port backend yang digunakan.

4. Jalankan development server:

   ```bash
   npm run dev
   ```

5. Buka aplikasi di browser:

   ```text
   http://localhost:3000
   ```

## Menjalankan Production Build

```bash
npm run build
npm run start
```

## Pemeriksaan Kode

```bash
npm run lint
```

## Standar Environment File

File `.env` dan `.env.local` tidak boleh di-commit ke Git karena bisa berisi konfigurasi lokal atau secret.

Gunakan `.env.example` sebagai template variable environment yang aman untuk disimpan di repository. Jika ada variable baru, tambahkan nama variable ke `.env.example` tanpa nilai rahasia.

## Frontend Version Tagging

Catatan perubahan setiap versi disimpan di [CHANGELOG.md](CHANGELOG.md). Perbarui changelog ketika menyiapkan rilis dan gunakan ringkasannya untuk description annotated tag.

### Tujuan

Tag Git menjadi penanda versi frontend pada commit tertentu agar perkembangan aplikasi mudah dilacak. Tagging dimulai dari **v0.1.0** karena aplikasi masih dalam tahap development. Aturan ini khusus untuk repository frontend.

### Flow

1. Periksa tag frontend yang sudah ada. Gunakan `v0.1.0` untuk tag pertama, kemudian lanjutkan dari versi terakhir tanpa menimpa tag sebelumnya.
2. Tentukan versi dengan format `vMAJOR.MINOR.PATCH` (Semantic Versioning):
   - **MAJOR**: perubahan besar yang tidak kompatibel; selama development awal, versi tetap `0.x.y` sampai aplikasi dinyatakan siap untuk `v1.0.0`.
   - **MINOR**: penambahan fitur atau perubahan besar selama tahap development `0.x.y`.
   - **PATCH**: perbaikan bug dan peningkatan kecil.
3. Siapkan description yang merangkum perubahan frontend sejak tag sebelumnya; untuk tag pertama, dokumentasikan fitur frontend yang tersedia pada commit tersebut.
4. Saat diminta membuat tag, gunakan **annotated tag** agar description tersimpan bersama tag Git dan menunjuk commit frontend yang sesuai.

### Input

Versi yang akan ditandai, commit frontend yang dituju, dan daftar perubahan frontend yang benar-benar tersedia pada commit tersebut.

### Output

Annotated tag beserta description berbahasa Indonesia dengan format berikut:

```text
Frontend v0.1.0

Fitur frontend:
- Daftar fitur yang tersedia atau ditambahkan.

Perubahan UI/UX:
- Perubahan tampilan dan alur penggunaan.

Perbaikan bug:
- Masalah frontend yang diperbaiki.

Peningkatan lainnya:
- Peningkatan performa, aksesibilitas, atau pemeliharaan frontend.
```

### Catatan

- Description wajib ada pada setiap tag dan hanya mencakup sisi frontend. Kategori tanpa perubahan dapat dihilangkan.
- Simpan description dalam file lalu gunakan `git tag -a <versi> <commit> --file <file-description>` untuk mempertahankan format baris.
- Dokumentasi kebijakan ini tidak membuat atau memublikasikan tag. Pembuatan tag dan push dilakukan sesuai permintaan pengguna.
- Terapkan kebijakan ini pada pekerjaan tagging frontend berikutnya tanpa meminta pengguna menjelaskan ulang.
