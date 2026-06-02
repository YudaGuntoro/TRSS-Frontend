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

3. Buat file `.env.local` di root project:

   ```env
   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5039
   ```

   Sesuaikan URL tersebut jika backend berjalan pada host atau port lain.

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
