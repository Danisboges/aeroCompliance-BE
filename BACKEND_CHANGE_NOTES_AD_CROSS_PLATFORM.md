# Backend Change Notes

## Ringkasan

Perubahan ini menyelesaikan dua kebutuhan:

1. Mengembalikan dan mempertahankan data `AD Related` pada proses generate,
   edit, preview, dan export EES.
2. Menambahkan konfigurasi lintas platform agar project dapat dijalankan di
   Windows, macOS Intel/Apple Silicon, dan Linux tanpa rewrite konfigurasi
   setelah `git pull`.

Tanggal implementasi: 29 Juli 2026.

---

## 1. Perbaikan AD Related pada EES

### Masalah sebelumnya

Kolom `AD Related` masih tersedia pada template PDF Garuda, tetapi nilainya
hilang setelah EES di-generate atau di-regenerate karena:

- Field `adRelated` tidak tersedia pada model Prisma `EesEvaluationItem`.
- Normalizer OCR tidak meneruskan `adRelated` atau `ad_related`.
- Repository tidak menyimpan nilai tersebut.
- Export PDF hanya membaca bentuk camelCase tertentu.
- Export Excel tidak memiliki kolom AD.
- Payload format baru seperti `problem_evidence` dan `description` dapat
  kehilangan nilai AD ketika berubah menjadi evaluation database.

### Perubahan schema

Field berikut ditambahkan pada `EesEvaluationItem`:

```prisma
adRelated String?
```

Field dibuat nullable agar:

- Data historis tetap valid.
- Migration tidak menghapus data.
- Sistem tidak menebak hubungan AD untuk data lama yang tidak memiliki sumber.

File:

```text
prisma/schema.prisma
```

### Migration

Migration baru:

```text
prisma/migrations/20260729090000_restore_ees_ad_related/migration.sql
```

SQL:

```sql
ALTER TABLE "EesEvaluationItem"
ADD COLUMN "adRelated" TEXT;
```

Migration hanya menambahkan satu kolom nullable dan tidak menghapus atau
mengubah data lain.

### Normalisasi payload

Backend sekarang menerima kedua bentuk field berikut:

```json
{
  "adRelated": "N"
}
```

atau:

```json
{
  "ad_related": "N"
}
```

Nilai boolean atau variasi Yes/No juga dinormalisasi:

| Input | Nilai tersimpan |
|---|---|
| `true`, `"true"`, `"yes"`, `"Y"`, `1` | `"Y"` |
| `false`, `"false"`, `"no"`, `"N"`, `0` | `"N"` |
| Nomor AD, misalnya `"AD 2026-01-01"` | Dipertahankan sebagai string |
| Tidak dikirim | `null` |

File:

```text
src/services/eesService.js
```

### Penyimpanan evaluation

`eesRepository.createEesDocument()` sekarang menyimpan `adRelated` pada setiap
`EesEvaluationItem`.

File:

```text
src/repositories/eesRepository.js
```

### Integrasi OCR

`ocrClient` sekarang mempertahankan field AD dari response AI ketika
`problem_evidence` dan `description` digabung menjadi evaluation item.

Field yang dikenali:

- `entry.adRelated`
- `entry.ad_related`
- `schema.adRelated`
- `schema.ad_related`

File:

```text
src/clients/ocrClient.js
```

### PDF Garuda

Perubahan pada renderer:

- Evaluation dari `generatedEes.evaluations` menjadi sumber utama.
- Payload OCR hanya menjadi fallback jika EES belum tersimpan.
- Manual edit tidak lagi tertimpa payload OCR lama ketika export.
- `adRelated` dan `ad_related` sama-sama dikenali.
- Cache PDF hanya digunakan jika `reviewStatus` sudah `APPROVED`.
- Dokumen yang masih editable akan di-render ulang agar perubahan terbaru
  terlihat.

File:

```text
src/services/pdfGenerationService.js
src/controllers/exportController.js
```

### Export Excel

Kolom `AD Related` ditambahkan di antara:

```text
App (Y/N) → AD Related → Warranty (Y/N)
```

Merge cell, indeks kolom, lebar kolom, dan area tanda tangan telah disesuaikan
dari 11 menjadi 12 kolom.

File:

```text
src/services/excelGenerationService.js
```

### Swagger

Dokumentasi payload dan response EES diperbarui agar mencantumkan:

```json
{
  "adRelated": "N"
}
```

Alias `ad_related` tetap diterima backend untuk kompatibilitas dengan AI
service.

File:

```text
swagger.json
```

---

## 2. Contoh Payload Frontend

### Edit atau regenerate EES

Endpoint:

```http
PATCH /api/service-bulletins/{id}/ees
Content-Type: application/json
Authorization: Bearer <token>
```

Contoh:

```json
{
  "validatedPayload": {
    "sb_code": "SB 72-0846 R02",
    "compliance_category": 7,
    "effected_type": "GE90-100",
    "task_type": "INSPECTION",
    "problem_evidence": [
      {
        "itemNo": "1",
        "requirement_desc": "Inspect the affected component.",
        "remark": "Record the inspection result.",
        "adRelated": "N",
        "isApplicable": true
      }
    ]
  }
}
```

### Contoh response evaluation

```json
{
  "itemNo": "1",
  "requirementDesc": "Inspect the affected component.",
  "adRelated": "N",
  "warranty": false,
  "isApplicable": true
}
```

---

## 3. Penyesuaian Data SB 72-0846

Seeder `SB 72-0846 R02` diperbarui agar:

- Raw payload menggunakan `ad_related: "N"`.
- Enam evaluation database menggunakan `adRelated: "N"`.
- Seeder tetap idempotent.

Perintah:

```bash
docker compose exec -T app npm run seed:sb-72-0846
```

Hasil saat implementasi:

```text
Service Bulletin : SB-DOC-E80FDDF7
EES              : EES-GA-SB-72-0846-R02
Evaluation items : 6
AD Related       : N pada seluruh item
```

Seeder ini tidak perlu dijalankan untuk semua deployment kecuali data contoh
SB 72-0846 memang dibutuhkan.

---

## 4. Konfigurasi Lintas Platform

### Tujuan

Konfigurasi utama repository sebelumnya menggunakan instalasi Google Chrome
yang bergantung pada arsitektur tertentu. Hal tersebut dapat gagal pada Mac
Apple Silicon dan menyebabkan path browser lokal perlu ditulis ulang.

Konfigurasi lintas platform sekarang dipisahkan dari `Dockerfile` utama agar
update konfigurasi Windows pada branch `main` tidak memaksa developer macOS
melakukan rewrite.

### File baru

```text
Dockerfile.cross-platform
docker-compose.override.yml
docker-entrypoint.cross-platform.sh
src/config/runtimeConfig.js
scripts/runtimeDoctor.js
.gitattributes
```

### Compose override

Docker Compose otomatis membaca:

```text
docker-compose.yml
docker-compose.override.yml
```

Override memilih:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.cross-platform
```

Dengan demikian, perintah normal berikut otomatis menggunakan image lintas
platform:

```bash
docker compose up -d --build
```

### Browser detection

`runtimeConfig.js` mencari browser dengan urutan:

1. `PUPPETEER_EXECUTABLE_PATH`.
2. `CHROME_EXECUTABLE_PATH`.
3. Lokasi Chrome/Chromium/Edge standar sesuai operating system.
4. Browser bawaan yang dikelola Puppeteer.

Platform yang didukung:

- Windows AMD64.
- macOS Intel.
- macOS Apple Silicon.
- Linux AMD64/ARM64.
- Docker Linux AMD64/ARM64.

### Database startup

Container tidak lagi diwajibkan melakukan mutasi database saat restart.

Environment opsional:

```env
APPLY_DATABASE_MIGRATIONS=false
SYNC_DATABASE_SCHEMA=false
RUN_DATABASE_SEED=false
```

Jika ingin menjalankan migration otomatis saat startup:

```env
APPLY_DATABASE_MIGRATIONS=true
```

Seed dan `db push` tetap opt-in untuk mencegah restart container mengubah data
tanpa disengaja.

### Line ending

`.gitattributes` memastikan file shell dan Dockerfile menggunakan line ending
LF agar script yang dibuat atau di-checkout dari Windows dapat dijalankan di
container Linux.

---

## 5. Langkah Deployment Setelah Git Pull

Tidak diperlukan rewrite Dockerfile atau path browser.

```bash
git pull
npm run config:doctor
docker compose up -d --build --force-recreate app
docker compose exec -T app npx prisma migrate deploy
```

Alamat lokal:

```text
API     : http://localhost:3001
Swagger : http://localhost:3001/api-docs
```

### Database migration history

Database Docker lokal telah di-baseline karena sebelumnya dibuat menggunakan
`prisma db push` dan belum memiliki riwayat `_prisma_migrations`.

Setelah baseline:

```text
4 migrations found
No pending migrations to apply
```

Untuk database environment lain, periksa terlebih dahulu:

```bash
docker compose exec -T app npx prisma migrate status
```

Jangan langsung menjalankan `db push --accept-data-loss`.

---

## 6. Hasil Verifikasi

### Test AD

```text
Test suites : 1 passed
Tests       : 5 passed
```

Skenario yang diuji:

1. Normalisasi `adRelated`.
2. Normalisasi `ad_related`.
3. Penyimpanan nomor AD sebagai string.
4. PDF memakai evaluation EES tervalidasi.
5. Excel memiliki header dan nilai `AD Related`.

File test:

```text
__tests__/eesAdRelated.test.js
```

### Smoke test API

```text
GET /api/service-bulletins/SB-DOC-E80FDDF7/ees
HTTP 200
```

Seluruh enam item mengembalikan:

```json
{
  "adRelated": "N"
}
```

### Export

```text
PDF Garuda : HTTP 200, application/pdf
Excel       : HTTP 200, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

### Runtime

```text
Host lokal : macOS arm64 → Google Chrome terdeteksi
Container  : Linux arm64 → /usr/bin/chromium terdeteksi
```

### Prisma

```text
Schema valid
Database schema up to date
No pending migrations
```

---

## 7. Catatan Test yang Tidak Terkait

Full test suite masih memiliki satu kegagalan lama:

```text
Cannot find module '../prisma/seedApprovalUsers'
```

Sumber:

```text
__tests__/approvalAssignment.test.js
```

Masalah tersebut tidak berasal dari perubahan AD atau konfigurasi lintas
platform. Test AD baru tetap lulus 5/5.

---

## 8. Daftar File Utama yang Berubah

### AD Related

```text
prisma/schema.prisma
prisma/migrations/20260729090000_restore_ees_ad_related/migration.sql
prisma/seedSb720846.js
src/clients/ocrClient.js
src/services/eesService.js
src/repositories/eesRepository.js
src/services/pdfGenerationService.js
src/services/excelGenerationService.js
src/controllers/exportController.js
swagger.json
__tests__/eesAdRelated.test.js
```

### Konfigurasi lintas platform

```text
Dockerfile.cross-platform
docker-compose.override.yml
docker-entrypoint.cross-platform.sh
src/config/runtimeConfig.js
scripts/runtimeDoctor.js
.gitattributes
.env.example
DOCKER.md
package.json
```

---

## 9. Catatan Integrasi dan Commit

Perubahan lintas platform harus di-commit dan digabungkan ke branch yang
digunakan tim. Jika file hanya dibiarkan sebagai perubahan lokal, `git pull`
dapat ditolak Git ketika upstream mengubah file yang sama.

Sebelum commit, jangan sertakan:

- File `.env`.
- Credential atau token.
- Backup database lokal.
- File upload runtime.

