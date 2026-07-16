# Panduan Penggunaan Docker - GMF-BE

Dokumentasi ini menjelaskan langkah-langkah untuk menjalankan, melakukan migrasi, dan mengisi data awal (seeding) pada aplikasi **GMF-BE** menggunakan Docker.

## Prasyarat
* Pastikan Anda sudah menginstal [Docker Desktop](https://www.docker.com/products/docker-desktop/).
* Pastikan aplikasi Docker Desktop sudah dalam keadaan aktif (**Engine Running** / indikator hijau).
* Port `3000` dan `5432` pada komputer Anda sedang tidak digunakan oleh aplikasi lain di luar Docker.

---

## Langkah-Langkah Menjalankan Aplikasi

### 1. Bangun dan Jalankan Kontainer (Database & Backend)
Jalankan perintah berikut di root folder project untuk mengunduh image, melakukan build, dan menjalankan service di latar belakang (*detached mode*):
```bash
docker-compose up -d --build
```
*Grup kontainer baru bernama `gmf-be` (berisi kontainer `gmf-be-app-1` dan `gmf-be-db-1`) akan otomatis dibuat dan berjalan di Docker Desktop Anda.*

### 2. Jalankan Migrasi Database Prisma
Untuk menyelaraskan struktur tabel database di dalam kontainer dengan schema Prisma terbaru, jalankan perintah berikut:
```bash
docker-compose exec -T app npx prisma db push --accept-data-loss
```
*(Catatan: Anda juga bisa menggunakan `docker-compose exec -T app npx prisma migrate deploy` jika menggunakan siklus migrasi resmi)*.

### 3. Jalankan Database Seeder (Data Awal)
Untuk mengisi database kosong Anda dengan akun default, pesawat, engine, dan data master lainnya, jalankan seeder:
```bash
docker-compose exec -T app npx prisma db seed
```

---

## Cara Mengakses Aplikasi
* **Endpoint API**: [http://localhost:3000](http://localhost:3000)
* **Dokumentasi Swagger**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## Perintah Manajemen Docker yang Berguna

* **Melihat Log Real-time**:
  ```bash
  docker-compose logs -f app
  ```

* **Menghentikan Kontainer**:
  ```bash
  docker-compose down
  ```
  *(Data di database tidak akan hilang karena disimpan dalam volume persisten `pgdata`)*

* **Membersihkan Volume Data (Reset Total Database)**:
  ```bash
  docker-compose down -v
  ```
