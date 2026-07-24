# 📘 GMF AD/SB Compliance System — Application Reference Guide

> **Dokumen ini adalah satu-satunya sumber kebenaran (Single Source of Truth) untuk arsitektur, alur kerja, API, dan aturan bisnis aplikasi GMF-BE.**

---

## 1. Executive Summary & System Core

Sistem backend untuk mengelola proses evaluasi **Service Bulletin (SB)** dan **Airworthiness Directive (AD)** pada mesin pesawat di lingkungan MRO (Maintenance, Repair, and Overhaul) **GMF AeroAsia**.

### 🛠️ Tech Stack Utama

| Komponen | Teknologi |
|----------|-----------|
| **Runtime & Framework** | Node.js (CommonJS) + Express.js v5 |
| **Database & ORM** | PostgreSQL 15 + Prisma ORM |
| **AI Extractor** | Hugging Face Space (FastAPI OCR / Extraction) |
| **PDF & Excel Generator** | Puppeteer (HTML → PDF) + ExcelJS |
| **Realtime & Auth** | Socket.io + JWT (`jsonwebtoken` + `bcryptjs`) |
| **API Docs** | Swagger UI (`/api-docs` via `swagger.json`) |

---

## 2. Struktur Proyek

```
GMF-BE/
├── prisma/
│   ├── schema.prisma          # Skema database terintegrasi
│   ├── seed.js                # Seeder user, SB, AD, & fleet
│   └── seedEngines.js         # Seeder pesawat (Aircraft & Engine)
├── src/
│   ├── controllers/           # HTTP Handlers (sb, approval, relation, ees, dll)
│   ├── services/              # Business Logic (sbRelationService, sbFulfillmentService, dll)
│   ├── repositories/          # Data Access Layer (Prisma Queries)
│   ├── routes/                # Route definitions Express
│   ├── middleware/             # Auth JWT, RBAC Role, Upload Multipart
│   ├── templates/             # HTML Templates untuk PDF Garuda & Citilink
│   ├── db/                    # Client Instance Prisma
│   ├── socket.js              # Realtime Socket.io Notification Handler
│   └── server.js              # Application Entry Point
├── uploads/
│   ├── ocr-documents/         # PDF SB Asli
│   ├── ees-documents/         # Generated PDF/Excel EES
│   └── signatures/            # Transient Signature Images (Auto-deleted post-PDF)
└── APPLICATION_REFERENCE.md   # 📌 DOKUMEN INI
```

---

## 3. Alur Kerja Utama Sistem (Core Architecture)

### 3.1 Alur Ingest SB (Dua Sumber Input)
1. **Sumber A (Database Existing)**: SB sudah ada di DB $\rightarrow$ User upload PDF SB $\rightarrow$ Trigger AI Extraction.
2. **Sumber B (Upload Manual)**: User upload PDF SB baru $\rightarrow$ Auto-create SB Temp $\rightarrow$ AI Extract $\rightarrow$ Merge ke SB asli atau Simpan SB Baru.

### 3.2 Alur 6-Langkah EES Generator Flow

```
[1. Select/Upload SB] ──▶ [2. Check Applicability] ──▶ [3. AI Summary & Confirm]
                                                               │
[6. Export PDF/Excel] ◀─── [5. Generate & Edit EES] ◀── [4. Engineering Rec]
```

### 3.3 Alur Persetujuan Multi-Tier & Multi-Tenancy (Garuda vs Citilink)
- **Multi-Tenancy**: Data disekat ketat berdasarkan `operatorId` di JWT (Garuda vs Citilink).
- **Persetujuan Garuda**: `First Engineer` (Prepared) $\rightarrow$ `Second Engineer` (Checked) $\rightarrow$ `Manager` (Approved).
  - *Aturan Kategori*: SB Kategori $< 4$ **wajib** persetujuan Manager. SB Kategori $\ge 4$ **langsung APPROVED** begitu disetujui *Second Engineer*.
- **Persetujuan Citilink**: `First Engineer` $\rightarrow$ `Manager`.
- **Transient Signatures**: Gambar tanda tangan (`.png`) diunggah sementara, disematkan ke PDF EES Final, lalu **langsung dihapus dari server (`fs.unlinkSync`)**.

### 3.4 Engine Relasi Multi-Tier SB (`SbRelation` & Graph Lineage)
- Mencatat 3 jenis hubungan di tabel `SbRelation`:
  1. `CONCURRENT`: Harus dikerjakan bersamaan / alternatif.
  2. `SUPERSEDES`: Menggantikan dokumen SB lama secara total.
  3. `TERMINATES`: Menghentikan pengerjaan inspeksi SB lain.
- **Pohon Silsilah (Lineage Tree)**: Endpoint `GET /api/service-bulletins/:id/lineage` menelusuri rantai `SB W -> SB Y -> SB X` secara rekursif.

### 3.5 Compliance Engine & Penautan Bukti SVR (Shop Visit Report)
- **Evaluasi Group (`ANY_OF` / `ALL_OF`)**:
  - `ANY_OF`: Jika SB-A diselesaikan (`COMPLIED`), SB-B alternatif pada engine yang sama otomatis berubah menjadi **`NOT_REQUIRED`** dengan `resolutionReason = 'ALTERNATIVE_SB_COMPLIED'`.
  - Jika status `COMPLIED` dibatalkan, status SB-B otomatis kembali menjadi **`PENDING`**.
- **Integritas Bukti SVR**: Status `COMPLIED` dari Shop Visit menautkan `resolvedByComplianceId` dan `svrId` sebagai bukti fisik otentik audit penerbangan.

---

## 4. Map API Endpoint Utama

| Kategori | Method | Endpoint Path | Deskripsi |
|---|---|---|---|
| **Auth** | POST | `/api/auth/login` | Login user & dapatkan Token JWT |
| **Service Bulletin** | GET | `/api/service-bulletins` | List SB (Lightweight DTO + Pagination) |
| | GET | `/api/service-bulletins/:id` | Detail lengkap SB & OCR Result |
| | POST | `/api/service-bulletins/upload-new` | Upload SB Baru + Trigger AI OCR |
| **EES Generator** | GET | `/api/service-bulletins/:id/applicability` | Check engine terdampak di fleet |
| | POST | `/api/service-bulletins/:id/generate-ees` | Generate EesDocument & Items |
| | GET | `/api/ees` | List dokumen EES & Creator |
| **Approvals** | GET | `/api/approvals` | List persetujuan general (Admin/All) |
| | GET | `/api/approvals/pending-second-engineer` | List pending khusus Second Engineer (Garuda) |
| | GET | `/api/approvals/pending-manager` | List pending khusus Manager (Garuda/Citilink) |
| | POST | `/api/approvals/:eesId/submit` | Submit EES + Gambar Tanda Tangan 1st Eng |
| | POST | `/api/approvals/:eesId/review` | Action Approve/Reject/Return + Tanda Tangan |
| **SB Relations** | GET | `/api/service-bulletins/:id/relations` | Ambil relasi langsung SB |
| | GET | `/api/service-bulletins/:id/lineage` | Ambil pohon silsilah penggantian berantai |
| | POST | `/api/service-bulletins/:id/relations` | Tambah relasi SB manual |
| | GET | `/api/engines/:engineId/compliance-summary` | Summary pemenuhan SB & Group Result per Engine |
| **Export** | GET | `/api/service-bulletins/:id/export/garuda/pdf` | Export PDF EES Template Garuda |
| | GET | `/api/service-bulletins/:id/export/citilink/pdf` | Export PDF EES Template Citilink |
| **Webhook** | POST | `/api/webhooks/ees` | Webhook AI (Terima payload JSON `mro_schema`) |

---

## 5. Ringkasan Model Database Utama (Prisma)

```
[Operator] ── (1:N) ── [User]
    │                    │ (uploaded/updated)
    ├── (1:N) ─────────▶ [ServiceBulletin] ── (1:1) ── [EesDocument] ── (1:N) ── [EesEvaluationItem]
    │                          │                           │
    └── (1:N) ── [Aircraft]    ├── (1:N) ── [SbRelation]   └── (1:1) ── [Approval]
                      │        │                                           │
                      └── (N) ───▶ [Engine] ── (1:N) ── [ComplianceRecord] ─── (1:N) ── [SbComplianceAudit]
                                     ▲                         ▲
                                     └────── [ShopVisitReport] ┘
```

| Model | Key | Deskripsi Singkat |
|---|---|---|
| `Operator` | `id` | Penyekat multi-tenant data (Garuda vs Citilink) |
| `User` | `id`, `email` | Pengguna sistem (Technician, Engineer, 2nd Engineer, Manager) |
| `ServiceBulletin` | `id`, `sbNumber` | Dokumen SB utama (terhubung ke AI OCR Result & EES) |
| `EesDocument` | `id`, `eesNumber` | Dokumen EES hasil generate |
| `Approval` | `id`, `eesId` | Status alur persetujuan EES saat ini |
| `ReviewAction` | `id` | Riwayat transaksi persetujuan tak terhapuskan (Immutable Audit) |
| `SbRelation` | `id` | Relasi antar-SB (`CONCURRENT`, `SUPERSEDES`, `TERMINATES`) |
| `SbRequirementGroup` | `id`, `groupCode` | Aturan kelompok pemenuhan (`ANY_OF`, `ALL_OF`, `SEQUENCE`) |
| `SbGroupResult` | `id` | Hasil status kelompok pemenuhan per-Engine |
| `SbGroupResult` | `id` | Hasil status kelompok pemenuhan per-Engine |
| `ShopVisitReport` | `id` | Dokumen laporan pengerjaan fisik mesin di bengkel GMF (SVR) |
| `EngineDataSheet` | `id` | Dokumen spesifikasi pabrikan/lembar data mesin (EDS) |
| `Iq03Report` | `id` | Dokumen IQ03 terkait komponen dan status armada |
| `EngineHistoryLog` | `id` | Catatan permanen jejak riwayat pertukaran ESN pada pesawat |
| `EngineActiveComponent` | `id` | Single Source of Truth: Part aktif (terkini) yang terpasang di mesin |
| `EngineDocumentComponentLog` | `id` | Arsip log masuk-keluar (IN/OUT) komponen mentah dari dokumen |
| `ComplianceRecord` | `id` | Status pengerjaan SB per Engine (dengan `svrId`, `edsId`, `iq03Id` & `resolvedByComplianceId`) |
| `SbComplianceAudit` | `id` | Riwayat audit jejak perubahan status pengerjaan SB |

---

## 6. Aturan Bisnis Penting (Business Rules Summary)

1. **R1 - Unique Identifier**: `sbNumber` bersifat `@unique`. Upload PDF dengan nomor sama akan di-*merge* ke SB existing.
2. **R2 - EES 1:1**: Tiap SB hanya memiliki 1 `EesDocument`. Generate ulang akan menggantikan EES lama secara *cascade*.
3. **R3 - Operator Isolation**: Seluruh query data (Dashboard, SB, EES, Approvals) wajib disekat berdasarkan `operatorId` pengguna.
4. **R4 - Compliance Category & Manager Bypass**:
   - SB Kategori $< 4$: **Wajib** persetujuan Manager.
   - SB Kategori $\ge 4$: Bypasses Manager; otomatis **APPROVED** setelah disetujui *Second Engineer*.
5. **R5 - Transient Signatures**: Gambar tanda tangan di-upload ke `uploads/signatures`, disematkan ke PDF, lalu **langsung dimusnahkan dari server (`fs.unlinkSync`)**.
6. **R6 - Any-Of Fulfillment & Auto Not-Required**: Ketika SB-A `COMPLIED`, SB-B alternatif pada engine yang sama otomatis diubah statusnya menjadi `NOT_REQUIRED` dengan tautan `resolvedByComplianceId`.

---

## 7. Alur Pengerjaan Kedepan (Future Roadmap)

1. **Integrasi Dokumen EDS (Engine Data Sheet)**: Pengembangan parser AI OCR khusus untuk membaca spesifikasi teknis dan ESN mesin baru dari berkas EDS secara otomatis.
2. **Frontend Graph Visualizer**: Integrasi library grafis UI (React Flow) yang memanfaatkan API `/api/service-bulletins/:id/lineage` untuk menampilkan diagram pohon silsilah SB interaktif (rantai *SUPERSEDES* / *TERMINATES*).
3. **Wildcard RegEx ESN Matching**: Mengotomatiskan pencocokan ESN bermotif wildcard (seperti `89Y887` di mana $Y \in \{2, 3\}$) langsung ke armada Engine.
4. **Realtime SVR Sync & Live PDF Preview**: Menyinkronkan status pengerjaan SVR secara *real-time* dan menyediakan fitur pratinjau instan EES PDF di layar sebelum di-export.

---

## 8. Riwayat Perubahan Dokumen (Changelog Logs)

| Tanggal | Versi | Perubahan |
|---------|-------|-----------|
| 2026-07-07 | 1.0 | Dokumen awal — mencakup arsitektur, alur 6 langkah, dua sumber SB, integrasi AI, dan aturan bisnis |
| 2026-07-08 | 1.1 | Penambahan Section 14 mengenai Alur Pengerjaan Kedepannya (Future Workflow & Next Steps) |
| 2026-07-13 | 1.2 | Perbaikan normalisasi data AI (unwrapping nested `mro_schema`), penyempurnaan layout Citilink (Portrait, page-break, 2-column checkbox, simbol silang X), pembersihan boilerplate referensi, dan optimasi visual border kolom titik dua. |
| 2026-07-15 | 1.4 | Penambahan berkas `.env.example`. Penguatan backend (autentikasi JWT dengan validasi user DB aktif). Perbaikan seeder mesin GE90 & B777 untuk keakuratan EES. Perbaikan error tipe data (Int ke String) pada parser SVR. Integrasi Docker lengkap (Dockerfile, docker-compose.yml, .dockerignore). |
| 2026-07-19 | 1.5 | Penyelarasan Backend dengan Kontrak Frontend & AI. Penambahan logika transaksi Prisma pada pembuatan EES. Penyesuaian pemetaan status dokumen untuk integrasi langkah 1-6 UI. Sinkronisasi data root SB dengan validasi payload AI. Penggunaan endpoint actual AI untuk OCR SVR. |
| 2026-07-19 | 1.6 | **Major Update: Engineering Review Dashboard & Multi-Tenancy**. Implementasi tabel `Operator` untuk menyekat data Garuda dan Citilink. Penambahan `Role` baru (`FIRST_ENGINEER`, `SECOND_ENGINEER`). Penggantian struktur review dengan tabel Pivot (`Approval` dan `ReviewAction`) untuk menghindari redundansi data di `EesDocument`. Penambahan endpoint `/api/dashboard/engineering-review/summary` dan `/api/approvals`. |
| 2026-07-20 | 1.7 | Pembaruan adaptasi struktur JSON AI terbaru (preservasi seluruh data mro_schema, penyesuaian nama key `issued_date`). Implementasi fitur Notifikasi Real-time berbasis WebSocket (`socket.io`) untuk update otomatis *Unread SB* dan *Pending Approvals* di Dashboard. |
| 2026-07-21 | 1.8 | **Sistem Persetujuan Multi-Tier, Manajemen Tanda Tangan, & Optimasi API**. Menambahkan endpoint *Submit* dan *Review* EES berbasis ID dengan upload multipart gambar tanda tangan. Pemusnahan otomatis gambar tanda tangan sementara pasca pembuatan PDF Final. Optimasi drastis pada `GET /api/service-bulletins` (Lightweight DTO) menggunakan Prisma Select, serta penambahan endpoint baru `GET /api/ees`. |
| 2026-07-22 | 1.9 | **Sistem Relasi SB, Group Pemenuhan (ANY_OF/ALL_OF), & Compliance Engine Per-Engine**. Implementasi model `SbRelation` (`CONCURRENT`, `SUPERSEDES`, `TERMINATES`), `SbRequirementGroup`, `SbRequirementMember`, `SbGroupResult`, dan `SbComplianceAudit`. Parsing otomatis `mro_schema.sb_relations` dari Webhook AI. Penambahan endpoint pohon silsilah (`GET /api/service-bulletins/:id/lineage`) dan ringkasan pemenuhan engine (`GET /api/engines/:engineId/compliance-summary`). |
| 2026-07-22 | 2.0 | **Pembedaan Rekomendasi SB (Kategori < 4 Manual vs >= 4 Auto AI), Unified Dashboard, & Evaluasi Applicability SVR/EDS**. Penegasan alur pengerjaan: SB Kategori < 4 mewajibkan input rekomendasi enjiniring secara MANUAL lalu langsung menuju Cek Kesesuaian Armada. Penyelarasan antarmuka Dashboard seragam untuk seluruh Operator. Integrasi OCR SVR & EDS untuk mengekstrak ESN dan menentukan status *Applicable*, *Not Applicable*, atau *Superseded*. |

### Fitur Terbaru (2026-07-23 v2.0)
- **Algoritma Deterministik Penentuan SB Applicability (`effectedEsnGMF`) — 4 Rule Utama**:
  - **Rule 1 (Explicit ESN Match)**: Memfilter ESN spesifik (`effectedEsn`) jika tercantum di dokumen SB.
  - **Rule 2 (Engine Model Match)**: Memfilter ESN yang memiliki tipe model mesin sama (`effectedModel`).
  - **Rule 3 (Installed Part Number Match)**: Memfilter `effectedEsnGMF` berdasarkan part number target SB yang aktif terpasang pada tabel `EngineConfigReport` / `SvrConfigurationItem`.
  - **Rule 4 (SB Relation & History Match)**: Memfilter `effectedEsnGMF` berdasarkan syarat hubungan SB terdahulu/lanjutan (`SbRelation` `SUPERSEDES`, `TERMINATES`, `CONCURRENT`) dengan aturan pemenuhan `ONE_OF` / `ALL_OF`, termasuk resolusi SB yang telah *superseded*.
  - ESN yang lolos seluruh 4 rule mendapatkan status **`APPLICABLE`**, sedangkan ESN lainnya diset **`NOT_APPLICABLE`**.
- **Analisis & Optimasi ERD Database (Server Storage Efficiency)**:
  - Penyatuan tabel `EngineSBStatus` & `SVRSBStatus` menjadi 1 tabel terpadu **`ComplianceRecord`** (`engineId`, `sbId`, `svrId`, `status`, `complianceDate`).
  - Menghilangkan redundansi tabel dan menghemat ruang penyimpanan (*storage*) pada server database.
- **Pembedaan Rekomendasi EES berdasarkan Kategori SB**:
  - Untuk **SB Kategori $\ge 4$**: Hasil olahan AI secara otomatis mengisi draf rekomendasi enjiniring (*Automatic Recommendation*).
  - Untuk **SB Kategori $< 4$ (Kritis/Mandatory)**: Hasil rekomendasi AI dikosongkan/tidak disediakan. *First Engineer* wajib menginput rekomendasi & tindakan secara **MANUAL**.
- **Revisi Alur Persetujuan Garuda Indonesia**:
  - **SB Kategori $< 4$ (Kritis)**: Tidak memerlukan tanda tangan *Second Engineer*, dokumen disubmit oleh *First Engineer* dan **langsung ditinjau & ditandatangani oleh Manager**.
  - **SB Kategori $\ge 4$ (Ringan)**: Ditandatangani oleh *Second Engineer* dan langsung **APPROVED** (*Bypass Manager*).
- **Unified Dashboard (Antarmuka Seragam Multi-Operator)**:
  - Antarmuka Dashboard dibuat konsisten dan seragam antara Garuda Indonesia dan Citilink. Pembedaan fitur dilakukan strictly berbasis *Role* pengguna (*First Engineer*, *Second Engineer*, *Manager*).

- **Model Relasi Multi-Tier & Graph Silsilah SB**:
  - Penambahan tabel `SbRelation` untuk mencatat hubungan `CONCURRENT`, `SUPERSEDES`, dan `TERMINATES` antar Service Bulletin.
  - Endpoint `GET /api/service-bulletins/:id/lineage` menelusuri rantai penggantian dokumen secara rekursif (multi-tier `SB X -> SB Y -> SB W`) untuk visualisasi diagram pohon di Frontend.
- **Group Pemenuhan & Aturan Alternatif (`ANY_OF` / `ALL_OF`)**:
  - Penambahan tabel `SbRequirementGroup` dan `SbRequirementMember` untuk mendukung aturan `ANY_OF` (cukup salah satu SB dikerjakan) dan `ALL_OF` (seluruh SB wajib dikerjakan).
  - Webhook AI (`POST /api/webhooks/ees`) secara otomatis memindai `mro_schema.sb_relations` (`post` dan `pre` condition) dan membentuk grup pemenuhan secara *real-time*.
- **Compliance Engine & Audit Per-Engine**:
  - Penambahan modul `sbFulfillmentService.js`. Saat sebuah SB ditandai `COMPLIED` pada suatu engine, sistem secara otomatis mengevaluasi grup pemenuhan:
    - Untuk aturan `ANY_OF`, SB alternatif lainnya pada engine tersebut otomatis diubah statusnya menjadi **`NOT_REQUIRED`** (`resolutionReason = 'ALTERNATIVE_SB_COMPLIED'`) dengan menautkan `resolvedByComplianceId`.
    - Jika status `COMPLIED` dibatalkan, sistem secara otomatis mengembalikan status SB alternatif menjadi `PENDING`.
  - Seluruh jejak perubahan status otomatis ini dicatat di tabel `SbComplianceAudit`.

### Fitur Terbaru (2026-07-23 v2.1)
- **Refactoring Arsitektur Data Mesin (3-Pillar Component Architecture)**:
  - Mengatasi ambiguitas penggantian ESN secara parsial maupun rotasi (*Engine Swap*) dengan memperkenalkan 3 struktur terpisah: `EngineHistoryLog` (Perekam jejak rotasi ESN), `EngineActiveComponent` (Penampung suku cadang/komponen terkini yang aktif), dan `EngineDocumentComponentLog` (Penyimpan arsip mentah SVR/EDS).
  - Algoritma *Applicability Aturan 3* secara spesifik kini menembak tabel `EngineActiveComponent` sehingga tidak lagi tertipu oleh riwayat *Part Number* lama yang sudah dicopot (berstatus OUT).
- **Independensi Dokumen Mesin (SVR, EDS, IQ03)**:
  - Meninggalkan pendekatan polimorfisme (*single table*) `docType` dan memecahnya menjadi tabel otonom: `ShopVisitReport`, `EngineDataSheet`, dan `Iq03Report`.
  - Pembuatan *Service*, *Repository*, dan *AI Client* yang sepenuhnya independen (`edsService.js`, `iq03Service.js`).
  - Pemusatan Endpoint Upload API di `POST /api/shop-visit-reports/upload/:docType` agar Frontend cukup berinteraksi dengan satu URL.

### Fitur Terbaru (2026-07-21 v1.8)
- **Sistem Approval Bertingkat & Penyematan Tanda Tangan**:
  - `POST /api/approvals/:eesId/submit`: First Engineer dapat mensubmit EES untuk diproses dengan melampirkan tanda tangan "Prepared by".
  - `POST /api/approvals/:eesId/review`: Mendukung multi-tier (Manager untuk Citilink, Second Engineer -> Manager untuk Garuda) dengan kewajiban melampirkan gambar tanda tangan.
- **Pemusnahan Gambar Tanda Tangan (*Transient Signatures*)**:
  - File gambar (`.png`/`.jpg`) tanda tangan disimpan sementara di `uploads/signatures`.
  - Setelah semua Approval terpenuhi dan `finalizeGarudaPdf` menyematkan ketiga tanda tangan ke dalam `EES_FINAL_*.pdf`, backend secara otomatis **memusnahkan file gambar asli tanda tangan dari disk server (`fs.unlinkSync`)** untuk mematuhi regulasi privasi data.
- **Optimasi List API & Lightweight DTO**:
  - `GET /api/service-bulletins`: Mengalami refactoring drastis (Prisma Select) agar tidak lagi memuat relasi berat seperti `rawPayload`, `evaluations`, dan `engineeringRec`. Endpoint ini murni mereturn DTO ringan dan object `pagination`.
  - Frontend kini wajib melakukan *fetching* `GET /api/service-bulletins/{id}` untuk mendapatkan detail dokumen.
- **Penyajian Daftar EES (`GET /api/ees`)**:
  - Endpoint baru yang mendedikasikan daftar seluruh dokumen EES secara ringan berserta pagination.
  - Melakukan *join* ke tabel `ServiceBulletin` dan memuat relasi `createdBy` sehingga Frontend dapat menampilkan data Pembuat/Creator EES secara langsung.

### Fitur Terbaru (2026-07-20 v1.7)
- **Adaptasi Struktur JSON AI Baru (OCR Client)**:
  - File `ocrClient.js` telah dimodifikasi agar menyebarkan (*spread*) seluruh field dari payload `mro_schema` bawaan AI, sehingga atribut-atribut baru seperti `due_at`, `warranty`, `compliance_time_type`, dan `note` tidak akan terbuang/hilang dan tetap tersimpan di dalam database (`rawPayload`).
  - Pemetaan *(mapping)* khusus ditambahkan untuk atribut tanggal terbit karena AI mengirimkannya sebagai `issued_date`, sedangkan backend sebelumnya mengharapkan `issueDate`. Atribut `compliance_period` juga telah di-map secara eksplisit.
- **Notifikasi Real-time Dashboard (WebSockets)**:
  - Diimplementasikan library `socket.io` pada backend (terpusat di `src/socket.js`) yang terintegrasi secara *native* dengan autentikasi JWT.
  - Setiap pengguna yang terhubung akan dimasukkan ke dalam *room* socket unik (`user_<userId>`) dan *room* berdasarkan perannya (`role_<role>`).
  - Event WebSocket `dashboard_updated` akan dikirimkan (*emitted*) sebagai *trigger* bagi *frontend* untuk menyegarkan data Dashboard pada tiga kondisi:
    1. Saat dokumen SB baru sukses diunggah dan diekstrak AI (Dikirim ke semua *user* agar notifikasi "SB Baru" bertambah).
    2. Saat sebuah detail SB dibuka/dibaca oleh *user* (Fungsi `markServiceBulletinAsRead` akan mencatat ke tabel `ServiceBulletinRead` dan mengirim event khusus ke *user* tersebut agar notifikasi "Unread SB" berkurang).
    3. Saat tindakan *Approval* (Approve/Reject/Return) dieksekusi oleh *Second Engineer* (Dikirim ke semua *user* relevan agar notifikasi "Pending Approvals" ter-update).

### Fitur Terbaru (2026-07-19 v1.6)
- **Multi-Tenancy (Operator Isolation)**:
  - Database telah diskalakan menggunakan `operatorId` di level `User`, `Aircraft`, dan `ServiceBulletin`. Data dashboard dan EES secara otomatis disekat sehingga seorang Engineer hanya dapat melihat SB dan data yang terhubung ke Operator mereka (Garuda / Citilink).
- **Engineering Review Dashboard**:
  - Penambahan layanan khusus `dashboardService.js` untuk menyajikan metrik jumlah SB baru/unread, aktivitas persetujuan EES, serta agregasi *monthly review* (Approved/Rejected/Returned) berdasar tipe kategori.
- **Workflow Approvals Terpusat**:
  - Implementasi tabel `Approval` (status proses saat ini) dan `ReviewAction` (riwayat absolut tak terhapuskan) untuk mengaudit secara aman tindakan dari *First Engineer* dan *Second Engineer*.
  - Middleware otorisasi `authMiddleware.js` direfaktor untuk memastikan JWT token tidak menyuntikkan ID Operator palsu (divalidasi *real-time* ke DB).

### Fitur Terbaru (2026-07-19)
- **Penyelarasan Batas Kategori Manual (Compliance Category <= 3)**:
  - Backend sekarang akan memblokir (skip) pembuatan otomatis `EesDocument` untuk SB dengan kategori manual (<= 3) atau bertipe Alert jika dipicu melalui EES webhook secara otomatis.
  - Dokumentasi Swagger untuk `/api/webhooks/ees` telah diperbarui untuk mencerminkan logika ini.
- **Integritas Transaksi (Prisma Transaction) EES**:
  - Pembuatan dokumen EES (`eesRepository.js`) sekarang dibungkus dalam `prisma.$transaction` untuk memastikan integritas data antara operasi penghapusan EES lama dan pembuatan EES baru berserta evaluasi itemnya.
- **Pemetaan Status Dokumen (Status Mapping)**:
  - `serviceBulletinController.js` sekarang mengembalikan status draf OCR (`ocrResult.draftStatus`) pada rute utama SB untuk memastikan kelancaran UI alur kerja EES 6 langkah di sisi frontend.
- **Sinkronisasi Metadata Service Bulletin**:
  - Saat hasil ekstraksi AI divalidasi (`validateServiceBulletin`), data seperti `sbNumber`, `title`, `issuer`, `effectivityType`, dan `complianceCategory` akan langsung tersinkronisasi kembali ke field level akar (root) `ServiceBulletin`.
- **Integrasi Penuh OCR Shop Visit Report (SVR)**:
  - Mengganti penggunaan mock/dummy SVR OCR dengan endpoint AI SVR langsung: `https://dzakievgn-sb-extractor.hf.space/api/extract_svr` pada klien `svrClient.js`.
  - Menambahkan penanganan error ekstraksi yang lebih ketat jika AI gagal atau memberikan format balasan yang tidak sesuai.

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
