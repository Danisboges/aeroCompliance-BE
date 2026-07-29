# Panduan Docker Lintas Platform - GMF-BE

Konfigurasi ini berlaku untuk Docker Desktop di Windows, macOS Intel/Apple
Silicon, dan Docker Engine di Linux. `docker-compose.override.yml` otomatis
memilih `Dockerfile.cross-platform`, sehingga konfigurasi lokal tidak perlu
ditulis ulang setelah `git pull`.

## Prasyarat
* Pastikan Anda sudah menginstal [Docker Desktop](https://www.docker.com/products/docker-desktop/).
* Pastikan aplikasi Docker Desktop sudah dalam keadaan aktif (**Engine Running** / indikator hijau).
* Port `3001` dan `5434` pada komputer Anda sedang tidak digunakan.

---

## Langkah-Langkah Menjalankan Aplikasi

### 1. Bangun dan Jalankan Kontainer (Database & Backend)
Jalankan perintah berikut di root folder project untuk mengunduh image, melakukan build, dan menjalankan service di latar belakang (*detached mode*):
```bash
docker compose up -d --build
```

Periksa konfigurasi browser dan database lokal:

```bash
npm run config:doctor
```

### 2. Jalankan Migrasi Database Prisma
Untuk menyelaraskan struktur tabel database di dalam kontainer dengan schema Prisma terbaru, jalankan perintah berikut:
```bash
docker compose exec -T app npx prisma migrate deploy
```

Perintah ini menerapkan migration yang belum berjalan dan tidak mereset data.
Jangan gunakan `db push --accept-data-loss` untuk deployment normal.

### 3. Jalankan Database Seeder (Data Awal)
Untuk mengisi database kosong Anda dengan akun default, pesawat, engine, dan data master lainnya, jalankan seeder:
```bash
docker compose exec -T app npx prisma db seed
```

---

## Cara Mengakses Aplikasi
* **Endpoint API**: [http://localhost:3001](http://localhost:3001)
* **Dokumentasi Swagger**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

---

## Perintah Manajemen Docker yang Berguna

* **Melihat Log Real-time**:
  ```bash
  docker compose logs -f app
  ```

* **Menghentikan Kontainer**:
  ```bash
  docker compose down
  ```
  *(Data di database tidak akan hilang karena disimpan dalam volume persisten `pgdata`)*

* **Membersihkan Volume Data (Reset Total Database)**:
  ```bash
  docker compose down -v
  ```

## Setelah `git pull`

Konfigurasi lintas platform berada pada file terpisah dari konfigurasi utama:

* `Dockerfile.cross-platform`
* `docker-compose.override.yml`
* `docker-entrypoint.cross-platform.sh`
* `src/config/runtimeConfig.js`

Karena Compose memuat file override secara otomatis, cukup jalankan:

```bash
docker compose up -d --build --force-recreate app
docker compose exec -T app npx prisma migrate deploy
```

Migration dan seed tidak dijalankan otomatis pada restart container. Jika
memang ingin menerapkan migration otomatis saat container start, set
`APPLY_DATABASE_MIGRATIONS=true` di `.env`.
