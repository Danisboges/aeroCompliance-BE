# Rancangan Approval Inbox dan Resubmit EES

## Status Dokumen

Dokumen ini merupakan rancangan konseptual.

Belum ada perubahan kode, database, schema Prisma, migration, maupun kontrak API yang diterapkan berdasarkan dokumen ini.

## Tujuan

Rancangan ini menangani dua kebutuhan:

1. Setiap reviewer hanya menerima EES yang memang ditugaskan kepada user tersebut.
2. EES yang dikembalikan atau ditolak untuk revisi dapat diperbaiki oleh maker dan dikirim kembali untuk approval berikutnya tanpa kehilangan riwayat.

## Kondisi Implementasi Saat Ini

Endpoint approval yang tersedia:

```http
GET /api/approvals
GET /api/approvals/{eesId}
GET /api/approvals/pending-second-engineer
GET /api/approvals/pending-manager
POST /api/approvals/{eesId}/submit
POST /api/approvals/{eesId}/review
POST /api/approvals/{eesId}/reject
```

Permasalahan yang ditemukan:

- `GET /api/approvals` menerima `assigneeId` dari query frontend.
- User dapat mencoba mengganti `assigneeId` untuk mengambil approval milik user lain dalam operator yang sama.
- Endpoint pending Second Engineer dan Manager masih menggunakan filter role, operator, dan kategori, bukan assignment user secara spesifik.
- Endpoint detail hanya membatasi berdasarkan operator.
- Endpoint review belum memastikan reviewer adalah user yang tercatat pada `assignedToId`.
- Route menggunakan istilah `Role.SECOND_ENGINEER`, padahal role user yang benar adalah `ENGINEER`.
- `POST /api/approvals/{eesId}/submit` hanya dapat digunakan pada submit pertama.
- Jika Approval untuk `eesId` sudah ada, backend menolak submit berikutnya walaupun statusnya `REJECTED` atau `RETURNED`.
- Proses regenerate EES berpotensi menghapus EES lama beserta Approval dan ReviewAction melalui cascade.

## Prinsip Utama

### Identitas user berasal dari JWT

Frontend tidak boleh menentukan user yang sedang melihat inbox melalui query.

Backend harus menggunakan:

```text
req.user.id
req.user.role
req.user.operatorId
```

Nilai tersebut berasal dari JWT yang sudah diverifikasi dan dikonfirmasi kembali terhadap database.

### Assignment adalah sumber utama

Setelah EES disubmit, sumber utama untuk menentukan reviewer adalah:

```text
Approval.assignedToId
```

Role, operator, dan `complianceCategory` digunakan sebagai validasi tambahan.

Role atau kategori tidak boleh digunakan untuk memberikan semua dokumen kepada seluruh user dengan role yang sama.

## Rancangan Endpoint

### 1. Reviewer Inbox

```http
GET /api/approvals/inbox
```

Endpoint mengembalikan EES yang harus direview oleh user login.

Filter dasar:

```text
assignedToId = req.user.id
status IN (PENDING, PARTIALLY_APPROVED)
sourceSb.operatorId = req.user.operatorId
```

Query opsional:

```http
GET /api/approvals/inbox?page=1&limit=20
GET /api/approvals/inbox?status=PENDING
GET /api/approvals/inbox?search=72-0846
GET /api/approvals/inbox?sort=oldest
```

User ID tidak boleh diterima dari query.

### 2. Submission Milik Maker

```http
GET /api/approvals/my-submissions
```

Filter dasar:

```text
submittedById = req.user.id
```

Endpoint digunakan untuk:

- Melihat progres approval.
- Melihat EES yang masih pending.
- Melihat EES yang sudah approved.
- Melihat dokumen yang rejected atau returned.
- Membuka kembali EES yang perlu direvisi.
- Menjalankan resubmit setelah revisi.

### 3. Riwayat Review User

```http
GET /api/approvals/history
```

Riwayat reviewer harus menggunakan:

```text
ReviewAction.actorId = req.user.id
```

Jangan menggunakan `assignedToId` sebagai sumber riwayat karena assignment dapat berubah pada approval berikutnya.

### 4. Daftar General Approval

```http
GET /api/approvals
```

Endpoint general direkomendasikan hanya untuk `ADMIN`.

Admin dapat menggunakan query:

```http
GET /api/approvals?assigneeId=USR-XXX
GET /api/approvals?status=PENDING
GET /api/approvals?operatorId=OP-XXX
```

User biasa tidak boleh menggunakan `assigneeId` untuk melihat inbox user lain.

### 5. Resubmit EES

```http
POST /api/approvals/{eesId}/resubmit
```

Contoh request:

```json
{
  "assignedToId": "USR-REVIEWER-ID"
}
```

Maker tidak mengirimkan `submittedById`. Backend mengambil maker dari JWT.

## Business Rule Reviewer

| Operator | Compliance Category | Role User | Workflow Stage |
|---|---:|---|---|
| Garuda | 1–3 | `MANAGER` | `MANAGER_REVIEW` |
| Garuda | 4+ | `ENGINEER` | `SECOND_ENGINEER` |
| Citilink | Semua kategori | `MANAGER` | `MANAGER_REVIEW` |

Catatan:

- Gunakan field `complianceCategory`.
- Jangan membuat field bisnis baru bernama `category`.
- `SECOND_ENGINEER` merupakan nama tahap workflow, bukan role user.
- User yang bertindak sebagai Second Engineer tetap memiliki role `ENGINEER`.
- Maker tidak boleh memilih dirinya sendiri untuk workflow Second Engineer.

## Response Reviewer Inbox

Contoh:

```json
{
  "data": [
    {
      "approvalId": "APP-123",
      "eesId": "EES-DOC-123",
      "status": "PENDING",
      "approvalLevel": 1,
      "workflowStage": "SECOND_ENGINEER",
      "submittedAt": "2026-07-31T08:00:00.000Z",
      "ees": {
        "eesNumber": "EES-GA-001",
        "taskType": "INSPECTION",
        "effectedType": "GE90-115B",
        "effectedModel": "GE90-115B",
        "aircraftType": "B777-300ER"
      },
      "serviceBulletin": {
        "id": "SB-123",
        "sbNumber": "SB 72-0846 R02",
        "title": "HPC Stator Stage 5 Inspection",
        "complianceCategory": 4,
        "operator": {
          "id": "OP-GA",
          "code": "GA",
          "name": "Garuda Indonesia"
        }
      },
      "submittedBy": {
        "id": "USR-CREATOR",
        "name": "First Engineer",
        "email": "first.engineer@gmf.co.id"
      },
      "permissions": {
        "canView": true,
        "canReview": true,
        "canApprove": true,
        "canReject": true,
        "canReturn": true
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pendingCount": 1,
    "totalPages": 1
  }
}
```

Response list tidak perlu membawa seluruh evaluations atau raw payload. Detail lengkap dapat diambil ketika user membuka EES.

## Status dan Penempatan Dokumen

| Status | Reviewer Inbox | Maker Submission | Reviewer History |
|---|---|---|---|
| `PENDING` | Ya | Ya | Tidak |
| `PARTIALLY_APPROVED` | Ya | Ya | Opsional |
| `APPROVED` | Tidak | Ya | Ya |
| `REJECTED` | Tidak | Ya | Ya |
| `RETURNED` | Tidak | Ya | Ya |

`REJECTED` dan `RETURNED` tidak boleh tetap muncul sebagai pekerjaan aktif reviewer.

Dokumen tersebut harus kembali ke maker.

## Alur Approval Pertama

```text
Maker membuat atau mengedit EES
        ↓
Maker memilih reviewer
        ↓
POST /api/approvals/{eesId}/submit
        ↓
Approval.status = PENDING
Approval.assignedToId = reviewer
        ↓
EES muncul di GET /api/approvals/inbox milik reviewer
```

## Alur Reject, Revision, dan Resubmit

```text
PENDING
   ↓ reviewer reject/return
REJECTED atau RETURNED
   ↓ assignment kembali ke maker
MAKER REVISION
   ↓ maker memilih reviewer dan resubmit
PENDING
   ↓ EES masuk kembali ke inbox reviewer
APPROVED, REJECTED, atau RETURNED
```

### Saat reviewer reject atau return

Backend memperbarui:

```text
Approval.status = REJECTED atau RETURNED
Approval.assignedToId = Approval.submittedById
EesDocument.reviewStatus = REJECTED atau RETURNED
```

Backend juga menambahkan `ReviewAction` yang menyimpan:

- Reviewer.
- Role reviewer.
- Action.
- Alasan rejection/return.
- Timestamp.
- Signature apabila relevan.

### Saat maker melakukan resubmit

Backend tidak membuat Approval baru.

Backend memperbarui Approval existing:

```text
status = PENDING
assignedToId = reviewer yang dipilih
submittedAt = waktu resubmit
reviewedAt = null
approvalLevel = level awal atau level sesuai workflow
```

Backend juga memperbarui:

```text
EesDocument.reviewStatus = PENDING
```

Kemudian backend mencatat event resubmit pada `ReviewAction`.

Dengan enum saat ini, resubmit dapat dicatat sebagai:

```text
action = PENDING
comment = "Resubmitted after revision"
```

Jika dibutuhkan audit yang lebih eksplisit, dapat dipertimbangkan action `RESUBMITTED`. Penambahan tersebut memerlukan perubahan enum dan migration.

## Validasi Resubmit

Resubmit hanya boleh berhasil jika:

1. Approval ditemukan.
2. User login sama dengan `Approval.submittedById`.
3. Status Approval adalah `REJECTED` atau `RETURNED`.
4. EES masih tersedia.
5. EES sudah dapat diedit oleh maker.
6. Reviewer tujuan ditemukan.
7. Reviewer aktif.
8. Reviewer berasal dari operator yang sesuai.
9. Role reviewer sesuai dengan `complianceCategory`.
10. Maker tidak memilih dirinya sendiri sebagai Second Engineer.
11. Signature tersedia apabila diwajibkan oleh workflow Garuda.

Resubmit harus ditolak jika:

- Approval masih `PENDING`.
- Approval masih `PARTIALLY_APPROVED`.
- Approval sudah `APPROVED`.
- User bukan maker.
- Reviewer tidak aktif.
- Reviewer berbeda operator.
- Role reviewer tidak sesuai.

Status HTTP yang disarankan:

```text
400 Bad Request    → payload tidak valid
403 Forbidden      → user bukan maker atau reviewer tidak berhak
404 Not Found      → Approval, EES, atau reviewer tidak ditemukan
409 Conflict       → status Approval tidak dapat di-resubmit
```

## Validasi Detail dan Review

Filter inbox tidak cukup untuk mencegah akses tidak sah.

Validasi assignment juga wajib diterapkan pada:

```http
GET /api/approvals/{eesId}
POST /api/approvals/{eesId}/review
POST /api/approvals/{eesId}/reject
```

Sebelum review:

```text
approval.assignedToId harus sama dengan req.user.id
approval.status harus PENDING atau PARTIALLY_APPROVED
operator EES harus sesuai operator user
role user harus sesuai complianceCategory
```

Jika user mengetahui `eesId` tetapi bukan reviewer yang ditugaskan, backend harus mengembalikan:

```http
403 Forbidden
```

## Hak Akses Detail

User boleh membuka detail Approval jika memenuhi salah satu kondisi:

- User adalah reviewer yang sedang ditugaskan.
- User adalah maker atau submitter dokumen.
- User merupakan admin yang berwenang.

User dengan operator yang sama tetapi tidak memiliki hubungan dengan Approval tidak otomatis berhak membuka detail.

## REJECTED dan RETURNED

Rekomendasi semantics:

### RETURNED

- Dokumen memerlukan revisi.
- Maker dapat mengedit.
- Maker dapat melakukan resubmit.

### REJECTED

- Penolakan final.
- Workflow selesai.
- Tidak dapat di-resubmit.

Namun, jika business process saat ini menggunakan tombol `Reject` sebagai tindakan “tolak dan kembalikan untuk revisi”, backend dapat memperlakukan `REJECTED` dan `RETURNED` sebagai status yang dapat di-resubmit.

Rekomendasi label frontend:

- `Return for Revision` untuk dokumen yang dapat diperbaiki.
- `Reject Final` untuk penolakan yang mengakhiri workflow.

Keputusan semantics ini harus disepakati sebelum implementasi.

## Menjaga EES dan Riwayat Approval

Proses revisi tidak boleh menghapus EES lama kemudian membuat EES baru jika penghapusan tersebut ikut menghapus:

- Approval.
- ReviewAction.
- Assignment.
- Rejection comment.
- Signature.
- Audit history.

Untuk solusi minimal:

- Pertahankan `eesId`.
- Update header EES yang dapat diedit.
- Update evaluations milik EES.
- Jangan menghapus Approval.
- Jangan menghapus ReviewAction.

Untuk solusi jangka panjang, dapat ditambahkan konsep revision:

```text
EesDocument
  └── EesRevision 1
  └── EesRevision 2
  └── EesRevision 3
```

Approval tetap mengacu pada EES logis, sedangkan setiap submit menyimpan revision yang direview.

## Audit Approval Kedua

Contoh riwayat:

```json
[
  {
    "action": "REJECTED",
    "actorId": "USR-REVIEWER-1",
    "actorRole": "ENGINEER",
    "comment": "Please revise warranty information",
    "createdAt": "2026-07-31T08:30:00.000Z"
  },
  {
    "action": "PENDING",
    "actorId": "USR-MAKER",
    "actorRole": "ENGINEER",
    "comment": "Resubmitted after revision",
    "createdAt": "2026-07-31T10:00:00.000Z"
  },
  {
    "action": "APPROVED",
    "actorId": "USR-REVIEWER-2",
    "actorRole": "ENGINEER",
    "comment": "Revision accepted",
    "createdAt": "2026-07-31T11:00:00.000Z"
  }
]
```

Riwayat tidak boleh ditimpa ketika approval memasuki attempt berikutnya.

Jika jumlah attempt perlu ditampilkan secara eksplisit, dapat dipertimbangkan field:

```text
attemptNumber
```

Solusi minimal dapat menghitung attempt berdasarkan urutan event resubmit di `ReviewAction`.

## Concurrency dan Double Submit

Resubmit harus menggunakan transaksi.

Backend perlu memastikan kondisi berikut masih benar pada saat update:

```text
approval.id = target approval
approval.submittedById = req.user.id
approval.status IN (REJECTED, RETURNED)
```

Jika dua request resubmit dikirim bersamaan, hanya satu yang boleh berhasil.

Request berikutnya harus menerima:

```http
409 Conflict
```

Hal yang sama berlaku pada approve atau reject. Backend harus memverifikasi assignment dan status kembali di dalam transaksi.

## Notifikasi

Setelah resubmit berhasil:

- Kirim event WebSocket kepada reviewer baru.
- Trigger refresh dashboard.
- Kirim email approval request kepada reviewer.
- Hilangkan dokumen dari revision queue maker.
- Masukkan dokumen ke reviewer inbox.

Contoh event:

```json
{
  "event": "dashboard_updated",
  "data": {
    "trigger": "approval_resubmitted",
    "eesId": "EES-DOC-123"
  }
}
```

## Index Database

Index yang tersedia:

```prisma
@@index([assignedToId, status, submittedAt])
```

Index tersebut sudah sesuai untuk query reviewer inbox:

```text
assignedToId + status + submittedAt
```

Core reviewer inbox dan resubmit existing Approval tidak memerlukan migration baru.

Migration hanya diperlukan jika menambahkan:

- Enum `RESUBMITTED`.
- Field `attemptNumber`.
- Model `EesRevision`.
- Relasi formal Approval ke User untuk submittedBy dan assignedTo.

## Tahapan Implementasi yang Disarankan

1. Sepakati semantics `REJECTED` dan `RETURNED`.
2. Tambahkan reviewer inbox berdasarkan user JWT.
3. Terapkan validasi assignment pada detail dan review.
4. Tambahkan maker submission queue.
5. Pastikan EES dapat direvisi tanpa menghapus Approval dan ReviewAction.
6. Tambahkan endpoint resubmit.
7. Catat event resubmit pada audit history.
8. Tambahkan history endpoint.
9. Batasi endpoint general untuk admin.
10. Pindahkan frontend ke endpoint inbox baru.
11. Deprecated endpoint role-wide yang lama setelah frontend selesai bermigrasi.

## Test Minimum

1. User hanya menerima Approval dengan `assignedToId` miliknya.
2. User tidak menerima Approval milik reviewer lain dalam operator yang sama.
3. User tidak menerima Approval dari operator lain.
4. Admin dapat melihat seluruh Approval sesuai izin.
5. Reviewer yang bukan assignee tidak dapat membuka atau mereview EES.
6. Garuda kategori 1–3 hanya dapat ditugaskan ke Manager.
7. Garuda kategori 4+ hanya dapat ditugaskan ke Engineer lain.
8. Citilink hanya dapat ditugaskan ke Manager.
9. User tidak aktif tidak dapat menjadi reviewer.
10. Maker dapat melihat EES berstatus `REJECTED` atau `RETURNED`.
11. Maker dapat resubmit EES yang dapat direvisi.
12. User selain maker tidak dapat melakukan resubmit.
13. Resubmit mengubah status kembali menjadi `PENDING`.
14. Resubmit memasukkan EES ke inbox reviewer baru.
15. Riwayat rejection tetap tersimpan setelah resubmit.
16. Approval kedua dapat berakhir `APPROVED`.
17. Double resubmit hanya menghasilkan satu update.
18. EES `APPROVED` tidak dapat di-resubmit.

## Acceptance Criteria

- Reviewer inbox selalu berdasarkan `req.user.id`.
- Frontend tidak mengirim user ID untuk menentukan inbox.
- Reviewer hanya dapat mereview EES yang ditugaskan kepadanya.
- Maker dapat melihat dokumen yang memerlukan revisi.
- Resubmit tidak membuat duplicate Approval.
- Resubmit tidak menghapus ReviewAction lama.
- EES kembali menjadi `PENDING` setelah resubmit.
- EES muncul di inbox reviewer yang dipilih.
- Business rule menggunakan `complianceCategory`.
- Second Engineer tetap memiliki role `ENGINEER`.
- Akses lintas user dan lintas operator ditolak.
- Seluruh perubahan status tercatat dalam audit history.
