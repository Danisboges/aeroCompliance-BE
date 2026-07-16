# 📘 GMF AD/SB Compliance System — Application Reference Guide

> **Dokumen ini adalah satu-satunya sumber kebenaran (Single Source of Truth) untuk arsitektur,
> alur kerja, dan aturan bisnis aplikasi.**
>
> Setiap penambahan fitur atau perubahan kode **WAJIB** mengacu pada dokumen ini.
> Jika terdapat konflik antara kode dan dokumen ini, **dokumen ini yang berlaku**.

---

## 1. Deskripsi Aplikasi

Sistem backend untuk mengelola proses evaluasi **Service Bulletin (SB)** dan **Airworthiness Directive (AD)** pada mesin pesawat di lingkungan MRO (Maintenance, Repair, and Overhaul) GMF AeroAsia.

**Tujuan Utama:**
- Menerima dokumen SB dalam format PDF
- Menganalisis isi dokumen menggunakan AI Extractor
- Mencocokkan applicability terhadap fleet engine
- Menghasilkan dokumen **Engineering Evaluation Sheet (EES)** dalam format PDF (template Garuda / Citilink) dan Excel

---

## 2. Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Runtime | Node.js (CommonJS) |
| Framework | Express.js v5 |
| Database | PostgreSQL |
| ORM | Prisma |
| AI Extractor | Hugging Face Space (FastAPI) |
| PDF Generator | Puppeteer (HTML → PDF) |
| Excel Generator | ExcelJS |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| API Docs | Swagger UI (swagger.json) |

---

## 3. Struktur Proyek

```
GMF-BE/
├── prisma/
│   ├── schema.prisma          # Skema database
│   ├── seed.js                # Seeder data dasar (user, SB, AD)
│   └── seedEngines.js         # Seeder fleet (aircraft + engine)
├── src/
│   ├── controllers/           # HTTP handler (request → response)
│   ├── services/              # Business logic layer
│   ├── repositories/          # Data access layer (Prisma queries)
│   ├── routes/                # Express route definitions
│   ├── middleware/             # Auth middleware (JWT verify, RBAC)
│   ├── templates/             # HTML templates untuk PDF (Garuda, Citilink)
│   ├── db/                    # Prisma client instance
│   └── server.js              # Entry point aplikasi
├── uploads/
│   ├── ocr-documents/         # Storage file PDF SB asli yang diupload
│   └── ees-documents/         # Storage file PDF EES yang di-generate
├── swagger.json               # Dokumentasi API (Swagger/OpenAPI 3.0)
├── .env                       # Environment variables (AI URL, token, DB)
└── APPLICATION_REFERENCE.md   # 📌 DOKUMEN INI
```

---

## 4. Sumber Data Service Bulletin (SB)

> [!IMPORTANT]
> Terdapat **DUA sumber** SB yang masuk ke sistem. Kedua sumber ini menghasilkan
> record `ServiceBulletin` yang identik di database dan mengikuti alur yang sama
> setelah langkah awal.

### Sumber A: Database Perusahaan (Seeder / Pre-existing)

SB yang sudah ada di database perusahaan sebelum user melakukan apapun.
Data ini berasal dari seeder atau sistem eksternal.

```
[Database Perusahaan] → GET /api/service-bulletins → User pilih SB
                        → POST /:id/upload-pdf → Upload file PDF ke SB tersebut
                        → Lanjut ke Step 2...
```

**Karakteristik:**
- SB sudah memiliki `sbNumber`, `title`, `issuer` dari awal
- Field `sbType`, `effectivityType`, `effectivityRange` sudah terisi
- User **hanya mengupload PDF** untuk melengkapi dan di-analisis AI
- Endpoint: `POST /api/service-bulletins/:id/upload-pdf`

### Sumber B: Upload Manual oleh User (SB Baru)

User mengupload file PDF SB yang **belum ada** di database.
Sistem membuat record SB baru secara otomatis berdasarkan nama file,
lalu AI akan mengekstrak metadata (sb_code, title, dll).

```
[User Upload PDF Baru] → POST /api/documents/ocr/pdf → Sistem buat SB baru
                         → AI menganalisis PDF → Metadata SB terisi otomatis
                         → Lanjut ke Step 2...
```

**Karakteristik:**
- Record SB dibuat secara otomatis dengan ID temporary
- Jika AI berhasil mengekstrak `sb_code`:
  - Jika SB dengan nomor tersebut sudah ada → **merge** ke SB existing
  - Jika belum ada → update record temp menjadi SB asli
- Jika AI gagal → SB ditandai `FAILED-{id}` untuk review manual
- Endpoint: `POST /api/service-bulletins/upload-new`

### Perbandingan Dua Sumber

| Aspek | Sumber A (Database) | Sumber B (Upload Manual) |
|-------|-------------------|------------------------|
| SB sudah ada di DB? | ✅ Ya | ❌ Tidak |
| Metadata awal | Lengkap | Kosong (diisi AI) |
| Upload PDF | Ke SB existing | Buat SB baru |
| AI wajib? | Opsional (sudah ada metadata) | Wajib (satu-satunya sumber metadata) |
| Merge logic | Tidak perlu | Ya (jika sb_code cocok) |

---

## 5. Alur Kerja Utama (6 Langkah EES Generator)

```
┌─────────────────────────────────────────────────────────────┐
│                    ALUR KERJA EES GENERATOR                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐     ┌──────────┐                              │
│  │ Database  │     │  Upload  │                              │
│  │   SB      │     │  Manual  │                              │
│  └────┬─────┘     └────┬─────┘                              │
│       │                │                                     │
│       └───────┬────────┘                                     │
│               ▼                                              │
│  ╔══════════════════════════════╗                             │
│  ║  STEP 1: SELECT / INPUT SB  ║                             │
│  ║  - List SB dari database    ║                             │
│  ║  - Upload PDF baru          ║                             │
│  ╚══════════════╤═══════════════╝                             │
│                 ▼                                             │
│  ╔══════════════════════════════╗                             │
│  ║  STEP 2: APPLICABILITY      ║                             │
│  ║  - Cocokkan SB vs fleet     ║                             │
│  ║  - engine.model = SB.type   ║                             │
│  ╚══════════════╤═══════════════╝                             │
│                 ▼                                             │
│  ╔══════════════════════════════╗                             │
│  ║  STEP 3: AI SUMMARY         ║                             │
│  ║  - AI otomatis saat upload  ║                             │
│  ║  - Review & edit hasil AI   ║                             │
│  ║  - Konfirmasi → VALIDATED   ║                             │
│  ╚══════════════╤═══════════════╝                             │
│                 ▼                                             │
│  ╔══════════════════════════════╗                             │
│  ║  STEP 4: ENGINEERING REC    ║                             │
│  ║  - COMPLY / DEFER / NA      ║                             │
│  ║  - Priority + Notes         ║                             │
│  ╚══════════════╤═══════════════╝                             │
│                 ▼                                             │
│  ╔══════════════════════════════╗                             │
│  ║  STEP 5: GENERATE EES       ║                             │
│  ║  - Buat EesDocument + Items ║                             │
│  ║  - Edit sebelum export      ║                             │
│  ╚══════════════╤═══════════════╝                             │
│                 ▼                                             │
│  ╔══════════════════════════════╗                             │
│  ║  STEP 6: EXPORT             ║                             │
│  ║  - PDF Garuda / Citilink    ║                             │
│  ║  - Excel (.xlsx)            ║                             │
│  ╚══════════════════════════════╝                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. API Endpoint Map

### 🔐 Authentication
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/auth/register` | Daftar user baru |
| POST | `/api/auth/login` | Login → JWT token |

### 🗂️ Step 1: Select / Input SB
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/service-bulletins` | List semua SB (search, filter) |
| GET | `/api/service-bulletins/:id` | Detail satu SB |
| POST | `/api/service-bulletins/:id/upload-pdf` | Upload PDF ke SB existing |
| POST | `/api/service-bulletins/upload-new` | Upload PDF baru → buat SB baru + AI |
| GET | `/api/service-bulletins/:id/view` | Preview PDF asli di browser |
| GET | `/api/service-bulletins/:id/download` | Download PDF asli |
| DELETE | `/api/service-bulletins/:id` | Hapus SB (cleanup/testing) |

### ✈️ Step 2: Applicability
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/service-bulletins/:id/applicability` | Cek engine terdampak |

### 🤖 Step 3: AI Summary
> AI analisis dijalankan **otomatis** saat upload PDF di Step 1. Step ini hanya untuk review & konfirmasi.

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/service-bulletins/:id/ai-summary` | Ambil hasil AI |
| PATCH | `/api/service-bulletins/:id/ai-summary` | Edit & konfirmasi hasil AI |

### ⚙️ Step 4: Engineering Recommendation
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/service-bulletins/:id/engineering-rec` | Ambil rekomendasi |
| POST | `/api/service-bulletins/:id/engineering-rec` | Simpan rekomendasi |
| PATCH | `/api/service-bulletins/:id/engineering-rec` | Update rekomendasi |

### 📄 Step 5: Generate EES
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/service-bulletins/:id/generate-ees` | Generate EES document |
| GET | `/api/service-bulletins/:id/ees` | Ambil EES yang sudah di-generate |
| PATCH | `/api/service-bulletins/:id/ees` | Edit evaluation items |

### ⬇️ Step 6: Export
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/service-bulletins/:id/export/garuda/pdf` | Preview PDF Garuda |
| GET | `/api/service-bulletins/:id/export/garuda/pdf/download` | Download PDF Garuda |
| GET | `/api/service-bulletins/:id/export/citilink/pdf` | Preview PDF Citilink |
| GET | `/api/service-bulletins/:id/export/citilink/pdf/download` | Download PDF Citilink |
| GET | `/api/service-bulletins/:id/export/excel` | Download Excel |

### 🔗 Webhook
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/webhooks/ees` | Terima payload AI langsung (tanpa JWT) |

---

## 7. Model Database (ERD Ringkas)

```
User (1) ──── (N) ServiceBulletin ──── (1) EesDocument ──── (N) EesEvaluationItem
                        │                      │
                        ├── (1) EngineeringRec  ├── (N) ComplianceTask
                        └── (N) ComplianceTask
                        
Aircraft (1) ──── (N) Engine
    │                    │
    └── ComplianceTask   └── ComplianceTask

AirworthinessDirective ──── (N) ComplianceTask
```

### Tabel Utama

| Model | Primary Key | Unique | Deskripsi |
|-------|-------------|--------|-----------|
| `User` | `id` (USR-xxx) | `email`, `username` | Pengguna sistem |
| `Aircraft` | `id` | `registration`, `msn` | Pesawat di fleet |
| `Engine` | `id` | `esn` | Mesin pesawat (terhubung via `msn` ke Aircraft) |
| `ServiceBulletin` | `id` (SB-DOC-xxx) | `sbNumber` | Dokumen SB — tabel sentral |
| `EesDocument` | `id` (EES-DOC-xxx) | `eesNumber`, `sourceSbId` | Hasil generate EES |
| `EesEvaluationItem` | `id` | — | Baris evaluasi di EES |
| `EngineeringRecommendation` | `id` | `sbId` | Keputusan COMPLY/DEFER/NA |
| `ComplianceTask` | `id` | — | Task tracking pelaksanaan |

### Status Lifecycle ServiceBulletin

```
                                    ┌─────────────┐
 SB dibuat (dari seeder/upload) ──▶ │  ocrStatus:  │
                                    │  UPLOADED    │
                                    └──────┬──────┘
                                           ▼
                              ┌─────────────────────┐
   PDF diupload & diproses ──▶│  ocrStatus:          │
                              │  PROCESSING          │
                              └──────┬──────────────┘
                                     ▼
                         ┌──────────────────────┐
  AI berhasil extract ──▶│  ocrStatus: EXTRACTED │
                         │  draftStatus: DRAFT   │
                         └──────┬───────────────┘
                                ▼
                    ┌───────────────────────────┐
 User review AI ──▶ │  draftStatus:              │
                    │  REVIEW_REQUIRED           │
                    └──────┬────────────────────┘
                           ▼
              ┌────────────────────────────┐
 User OK ──▶  │  draftStatus: VALIDATED     │
              └──────┬─────────────────────┘
                     ▼
         ┌─────────────────────────────┐
 Gen ──▶ │  draftStatus: GENERATED      │
  EES    │  + EesDocument dibuat        │
         └─────────────────────────────┘
```

---

## 8. Integrasi AI Extractor

### Endpoint AI
- **URL**: Dikonfigurasi via `.env` → `AI_SERVICE_URL`
- **Token**: Dikonfigurasi via `.env` → `AI_SERVICE_API_KEY`
- **Metode**: `POST` dengan `multipart/form-data` (field: `file`)
- **Library**: `axios` + `form-data`
- **Timeout**: Tidak ada (disabled) — proses AI bisa lama

### Struktur Response AI (Terbaru v2.1)

```json
{
  "filename": "document.pdf",
  "mro_schema": {
    "sb_code": "SB 72-0685 R06",
    "tittle": "ENGINE - FAN HUB FRAME ASSEMBLY",
    "effected_type": "GE90-100",
    "effected_model": ["-110B1", "-115B"],
    "compliance_category": 3,
    "task_type": "REP",
    "references": "GE90-100 Engine Manual",
    "component_type": "COMPONENT",
    "compliance_time_type": "HOUR_CYCLE",
    "compliance_period": "every 500 flight hours",
    "problem_evidence": [
      { "requirement_desc": "...", "remark": "..." }
    ],
    "description": [
      { "requirement_desc": "...", "remark": "..." }
    ]
  },
  "routing_directive": {
    "workflow_action": "REP",
    "compliance_category": 3
  }
}
```


### Normalisasi di Backend (`ocrClient.js`)

AI response di-unwrap dari `mro_schema` dan dinormalisasi:

1. **Data ada di `result.mro_schema`**, bukan di root level
2. **`problem_evidence[]`** dan **`description[]`** yang tipe-nya sama di-**merge** jadi satu baris (digabung `\n\n`)
3. **`tittle`** (typo dari AI) dipetakan ke `title`
4. **`sb_code`** fallback: `mro_schema.sb_code` → `fileName` → `UNIDENTIFIED-{timestamp}`
5. Response string (markdown-wrapped JSON) otomatis di-sanitize

---

## 9. Template PDF EES

### Template Garuda Indonesia
- **File**: `src/templates/eesGarudaTemplate.html`
- **Logo**: `public/image/logo_garuda-removebg-preview.png` (di-encode base64)
- **Kolom tabel**: No | Par | Requirement Desc | Task Type | Ref | AD Related | App (Y/N) | Warranty (Y/N) | Affected A/C or Engine (ESN) | Rep (Y/N) | Due At | Remarks
- **Logic Mapping Khusus**: Semua field di tabel adalah turunan langsung dari JSON AI, sisanya dikalkulasi di backend berdasar ketersediaan ESN.

### Template Citilink Indonesia
- **File**: `src/templates/eesCitilinkTemplate.html`
- **Logo**: `public/image/citilink logo.png` (di-encode base64)
- **Format**: Form CT-3-18.1 dengan checkbox pengisian berupa simbol silang (**X**)
- **Logika Ceklis & Desain**:
  1. **Unit Concern**: Otomatis tersilang **TEA-2**. Layout checkbox disusun dalam **2 kolom vertikal** di bawah label:
     - Kolom Kiri: **TEA-1**, **TEA-2**, **TEA-3**
     - Kolom Kanan: **TEA-4**, **TEA-5**, **TEA-6**
  2. **Aircraft Type**: Berdasarkan AI `component_type` (COMPONENT / TOOL / PART).
  3. **Reason of Evaluation**: Jika kategori `ALERT` → Safety & Improve Reliability disilang.
  4. **Maintenance Level**: Berdasarkan AI `compliance_time_type` (DATE / HOUR_CYCLE / SCHEDULED / ATTRITION).
  5. **Consequence**: Affected jika *Engineering Action* = COMPLY/DEFER, Not Affected jika NA.
  6. **Accomplishment Method**: Berdasarkan AI `task_type` (INSP → Inspection, MOD/REP → Modification).
  7. **Inspection Type**: Berdasarkan teks `compliance_period` AI (jika ada kata "every" → Recurring, selebihnya One Time).
  8. **Evaluation Result**: Sengaja dibiarkan **KOSONG** agar *Technician* dapat mengisi/memvalidasi secara manual di UI.
  9. **Pemisah Kolom Titik Dua (`:`)**: Garis batas/border vertikal di sekitar kolom titik dua disembunyikan menggunakan `border-right: hidden !important` dan `border-left: hidden !important` agar terlihat melebur rapi ke layout form.
  10. **Pemotongan Halaman Alami**: Aturan CSS `.form-table > tbody > tr { page-break-inside: auto; }` diterapkan agar baris referensi yang sangat panjang (`Other Ref.`) dapat terpotong secara alami ke halaman berikutnya tanpa menyisakan ruang kosong besar di Halaman 1.
  11. **Ukuran Tulisan**: Base font size diset ke **`12px`** untuk meningkatkan legibilitas, dan ukuran tanda silang diset ke `12px` di dalam kotak `11px x 11px` agar tanda silang memenuhi kotak checkbox.

### Rendering
- Engine: **Puppeteer** (headless Chrome)
- Logo diinject sebagai **base64 inline** (`data:image/png;base64,...`) karena Puppeteer sandbox tidak bisa akses `file://` URL
- Field "Evaluated by:" diambil dari `req.user.username` (`JWT` payload)
- Tanda pengisian checkbox menggunakan karakter silang **`X`** (diubah dari sebelumnya centang `✓`).

---

## 10. Matching Logic: ESN ↔ MSN

```
Engine.esn = Engine Serial Number (unik per mesin)
Engine.msn = MSN aircraft tempat mesin terpasang
Aircraft.msn = Manufacture Serial Number pesawat

Match condition: Engine.msn === Aircraft.msn
```

Mesin spare/shop memiliki `msn = null` dan `aircraftId = null`.

### Applicability Check (Step 2)
```
SB.effectivityType   vs   Engine.model
SB.effectivityRange  vs   Engine.esn (range check)

Jika engine.model === SB.effectivityType → Applicable ✅
Jika tidak → Not Applicable ❌
```

---

## 11. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db_gmf"

# JWT Secret
JWT_SECRET="your-secret-key"

# AI Extractor Service
AI_SERVICE_URL="https://dzakievgn-sb-extractor.hf.space/api/extract"
AI_SERVICE_API_KEY="hf_xxxxx"
```

---

## 12. Aturan Bisnis Penting

### R1: SB Number adalah Primary Identifier
- `sbNumber` bersifat `@unique` — tidak boleh duplikat
- Saat upload PDF baru: jika AI mendeteksi `sb_code` yang sudah ada → **merge** ke record existing (bukan buat baru)

### R2: EES Hanya Satu per SB
- Relasi `ServiceBulletin` → `EesDocument` adalah **1:1** (`sourceSbId @unique`)
- Jika generate ulang EES, record lama harus dihapus dulu (cascade)

### R3: Engineering Recommendation Hanya Satu per SB
- Relasi `ServiceBulletin` → `EngineeringRecommendation` adalah **1:1** (`sbId @unique`)
- POST membuat baru, PATCH mengupdate existing

### R4: Urutan Langkah Bersifat Logis (Bukan Teknis)
- Langkah 1-6 adalah panduan UI flow, **bukan enforcement ketat** di backend
- User bisa memanggil Step 5 (Generate EES) tanpa menjalankan Step 4 (Engineering Rec)
- Yang wajib secara teknis: SB harus punya `rawPayload` (dari AI) sebelum bisa generate EES

### R5: AI Bersifat Satu Arah
- AI hanya dipanggil untuk **mengekstrak** data dari PDF
- Hasil AI disimpan sebagai `rawPayload` (JSON) di `ServiceBulletin`
- User bisa mengedit hasil AI sebelum generate EES
- AI **tidak** dipanggil ulang saat generate/export

### R6: Dua Template Export
- **Garuda**: Format tabel 12 kolom, header + logo berdiri sendiri
- **Citilink**: Format form CT-3-18.1 dengan checkbox dinamis
- Template dipilih via endpoint path, bukan query parameter

---

## 13. Panduan untuk Pengembang

### Menambahkan Endpoint Baru
1. Buat handler di `controllers/`
2. Buat/update business logic di `services/`
3. Buat/update query di `repositories/`
4. Daftarkan route di `routes/serviceBulletinRoutes.js`
5. Update `swagger.json`
6. **Update bagian 6 (API Endpoint Map) di dokumen ini**

### Mengubah Skema Database
1. Edit `prisma/schema.prisma`
2. Jalankan `npx prisma db push`
3. Update seeder jika perlu
4. **Update bagian 7 (Model Database) di dokumen ini**

### Mengubah Format AI Response
1. Edit normalisasi di `src/services/ocrClient.js`
2. Pastikan output `payload` tetap kompatibel dengan `normalizeOcrPayload()` di `eesService.js`
3. **Update bagian 8 (Integrasi AI) di dokumen ini**

### Menambahkan Template Export Baru
1. Buat file HTML di `src/templates/`
2. Tambahkan logic rendering di `pdfGenerationService.js`
3. Tambahkan route export di `serviceBulletinRoutes.js`
4. Tambahkan handler di `exportController.js`
5. **Update bagian 9 (Template PDF) di dokumen ini**

---

## 14. Alur Pengerjaan Kedepannya (Future Workflow & Next Steps)

Untuk memperjelas target pengembangan (roadmap) sistem kedepannya, berikut adalah tahapan pekerjaan yang perlu difokuskan oleh tim:

### A. Penyesuaian AI Service (Tim AI)
- Tim AI harus menyesuaikan *output* JSON LLM agar 100% mematuhi panduan skema terbaru (v2.1).
- Fokus utama adalah mengeluarkan 3 variabel baru khusus (`component_type`, `compliance_time_type`, `compliance_period`) untuk mengendalikan otomatisasi PDF Citilink.
- Backend sudah diprogram untuk menangani variabel tersebut secara aman, baik untuk template Garuda maupun Citilink.

### B. Integrasi Database Maskapai Internal (Tim Backend)
- Backend harus menembak API/Database internal GMF untuk menarik **Daftar Engine Serial Number (ESN)** yang valid berdasarkan model pesawat (`effected_model`) yang terdampak.
- Nilai ESN asli ini nantinya akan diinjeksi secara langsung pada saat proses `Generate PDF EES` (pada baris *Affected A/C Engine*).

### C. Finalisasi Alur Approval & Tanda Tangan (Tim Backend & Frontend)
- Pada bagian bawah PDF EES terdapat kolom *Management Approval* (seperti WQR, DE, Evaluated By).
- Kedepannya perlu dibuatkan sistem otorisasi pengguna (*Role-Based Access Control / RBAC*) agar *user* dengan level Supervisor bisa melakukan Approval secara sistem, yang kemudian akan menanamkan tanda tangan digital atau nama mereka langsung ke dalam cetakan PDF.

### D. Penyempurnaan Template UI & UX (Tim Frontend)
- Menggabungkan *form* interaktif *review* EES dengan fitur *live-preview* (pratinjau PDF di layar) agar teknisi dapat melihat hasil cetakan PDF Garuda/Citilink secara aktual sebelum menekan tombol Generate.
- Menyiapkan mekanisme pengetikan manual untuk *Evaluation Result* di *form* UI khusus untuk melengkapi dokumen Citilink.

---

## 15. Panduan Kontainerisasi Docker

Aplikasi backend ini telah dikontainerisasi menggunakan **Docker** dan **Docker Compose** untuk memastikan kelancaran deployment (terutama dependency Puppeteer pada sistem operasi Linux).

### A. Komponen Kontainer
Sistem dibagi menjadi dua kontainer utama:
1. **`app` (Node.js + Google Chrome):** Menjalankan server Express.js. Menggunakan image `node:20-slim` berbasis Debian untuk menginstal browser Chrome stabil yang digunakan oleh Puppeteer.
2. **`db` (PostgreSQL 15):** Menjalankan database PostgreSQL Alpine. Data disimpan di volume persisten `pgdata`.

### B. Konfigurasi File Docker
* **[`Dockerfile`](file:///d:/GMF%20Intern/GMF-BE/Dockerfile):** Menginstal otomatis Google Chrome dan font pendukung legibilitas, lalu mengonfigurasi `PUPPETEER_EXECUTABLE_PATH`.
* **[`docker-compose.yml`](file:///d:/GMF%20Intern/GMF-BE/docker-compose.yml):** Mengatur integrasi jaringan internal kedua kontainer, environment variables, port forwarding (3000 untuk backend, 5432 untuk database), dan mapping data volume (`pgdata` & `uploads_data`).
* **[`.dockerignore`](file:///d:/GMF%20Intern/GMF-BE/.dockerignore):** Mengabaikan folder besar (`node_modules`), file log, database upload, dan berkas kredensial sensitif (`.env`) agar proses build cepat.

### C. Alur Kerja (Development Hybrid)
Untuk pengembangan aktif, direkomendasikan menjalankan database di Docker dan server Node.js secara lokal:
1. Jalankan database kontainer: `docker compose up -d db`
2. Jalankan aplikasi lokal: `npm run dev` (dengan port database terarah ke `localhost:5432`).

---

## 16. Riwayat Perubahan Dokumen

| Tanggal | Versi | Perubahan |
|---------|-------|-----------|
| 2026-07-07 | 1.0 | Dokumen awal — mencakup arsitektur, alur 6 langkah, dua sumber SB, integrasi AI, dan aturan bisnis |
| 2026-07-08 | 1.1 | Penambahan Section 14 mengenai Alur Pengerjaan Kedepannya (Future Workflow & Next Steps) |
| 2026-07-13 | 1.2 | Perbaikan normalisasi data AI (unwrapping nested `mro_schema`), penyempurnaan layout Citilink (Portrait, page-break, 2-column checkbox, simbol silang X), pembersihan boilerplate referensi, dan optimasi visual border kolom titik dua. |
| 2026-07-15 | 1.4 | Penambahan berkas `.env.example`. Penguatan backend (autentikasi JWT dengan validasi user DB aktif). Perbaikan seeder mesin GE90 & B777 untuk keakuratan EES. Perbaikan error tipe data (Int ke String) pada parser SVR. Integrasi Docker lengkap (Dockerfile, docker-compose.yml, .dockerignore). |

### Fitur Terbaru (2026-07-13)
- **Unwrapping Nested Payload AI**: Backend secara dinamis membuka pembungkus ganda payload AI (`payload.mro_schema.mro_schema`) agar data aman diekstrak secara otomatis.
- **Normalisasi & Pembersihan Referensi**:
  - Semua referensi panjang dibersihkan dari spasi berlebih, digabungkan baris yang terputus tanda hubung, dan dihapus dari data hukum/boilerplate.
  - Duplikasi referensi dibersihkan secara otomatis.
  - Ditampilkan dalam format baris baru per poin (`- Referensi 1\n- Referensi 2`).
- **Penyempurnaan Template PDF Citilink**:
  - Layout diatur dinamis menjadi **Portrait** untuk Citilink, sementara Garuda tetap **Landscape**.
  - Checkbox unit concern diatur ulang menjadi 2 kolom vertikal: Kolom Kiri (TEA-1, TEA-2, TEA-3) dan Kolom Kanan (TEA-4, TEA-5, TEA-6).
  - Mengubah tanda pengisian checkbox dari centang (`✓`) menjadi silang (**`X`**).
  - Tanda silang **`X`** diatur agar memenuhi kotak dengan menaikkan font-size tanda silang (`12px`) dan memperkecil kotaknya (`11px` x `11px`).
  - Menghilangkan pembatas border vertikal di sekitar kolom titik dua (`:`) agar tampilan form terlihat lebih menyatu.
  - Membuka pembatasan pemotongan halaman (`page-break-inside: auto`) pada baris tabel utama agar baris referensi yang sangat panjang terpotong alami ke Halaman 2 dan tidak menyisakan ruang kosong besar di Halaman 1.
  - Meningkatkan ukuran huruf dasar template dari `11px` ke `12px` untuk legibilitas cetak.

### Fitur Terbaru (2026-07-15)
- **Autentikasi JWT & Verifikasi Database**:
  - Mengubah middleware autentikasi `verifyToken` menjadi asinkron untuk melakukan verifikasi keberadaan ID pengguna di database pada setiap permintaan API.
  - Mencegah error database 500 (Foreign Key Constraint) saat pengguna menggunakan token sesi lama setelah database di-seed ulang. Mengembalikan respons `401 Unauthorized` secara aman.
- **Seeder Mesin GE90 & Pesawat Boeing 777**:
  - Memperbarui `prisma/seed.js` untuk memasukkan pesawat PK-GIE (B777-300ER) dan dua mesin GE90-115B (ESN 906101 & 906102).
  - Memastikan pencocokan otomatis (Step 2) menghasilkan status *Applicable* untuk SB mesin GE90 sehingga kolom ESN pada hasil EES PDF terisi dengan benar.
- **Normalisasi Tipe Data Parser SVR**:
  - Mengubah pemetaan parsing JSON hasil OCR SVR di `svrService.js` dengan melakukan konversi eksplisit menggunakan fungsi `String()` pada variabel numerik (`tsn`, `csn`, `tso`, `cso`, `qty` pada konfigurasi report, serta `no` dan `totalCycle` pada status LLP).
  - Mencegah error `PrismaClientValidationError` akibat tipe data integer yang dikirim oleh AI untuk field yang didefinisikan sebagai string opsional (`String?`) di database.
- **Integrasi Docker & Docker Compose**:
  - Membuat `Dockerfile`, `docker-compose.yml`, dan `.dockerignore` siap pakai di direktori root proyek untuk kemudahan deployment backend & database PostgreSQL 15 secara terisolasi.

