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
