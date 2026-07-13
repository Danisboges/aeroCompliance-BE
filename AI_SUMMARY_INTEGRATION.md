# 📘 AI Summary Integration Guide for Frontend

Dokumen ini berisi panduan teknis bagi pengembang frontend untuk melakukan integrasi dengan endpoint **AI Summary (Langkah 3: Review AI)** pada backend Compliance System.

---

## 1. Flow Integrasi Step 3 (Review AI Summary)

```
[Halaman Review AI] 
       │
       ├── ▶ 1. GET `/api/service-bulletins/:id/ai-summary` (Tarik data awal hasil AI)
       │
       ├── ▶ 2. Render Form (User mereview data di halaman input dan tabel evaluations)
       │
       └── ▶ 3. PATCH `/api/service-bulletins/:id/ai-summary` (Kirim data hasil edit ke backend)
```

---

## 2. API Endpoint Spesifikasi

### 🔍 A. GET /api/service-bulletins/:id/ai-summary
Mengambil data hasil analisis AI asli (`rawPayload`) yang tersimpan setelah proses unggah PDF.

* **URL Parameter**: `id` (ID Service Bulletin, misal: `SB-DOC-D07BA43D`)
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON)**:
```json
{
  "data": {
    "sbId": "SB-DOC-D07BA43D",
    "sbNumber": "GE90-100 SB 72-0846 R2",
    "draftStatus": "REVIEW_REQUIRED",
    "ocrStatus": "EXTRACTED",
    "aiSummary": {
      "bulletinNumber": "SB 72-0846",
      "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00) - MODULE LEVEL BSI OF HIGH PRESSURE COMPRESSOR STATOR STAGE 5",
      "issuer": "GE90-100",
      "task_type": "BOR",
      "references": "- Boeing 777 Aircraft Maintenance Manual (AMM) Gek 109993 ge90-100\\n- Engine Manual (EM) ge90-100",
      "effected_type": "GE90-100",
      "effected_model": ["-110B1", "-115B"],
      "compliance_category": 7,
      "compliance_time_type": "ATTRITION",
      "compliance_period": "one time",
      "manufacturer": "GE",
      "part_number": "362-097-052-0",
      "note": "-",
      "warranty": false,
      "warranty_due_date": null,
      "warranty_note": null,
      "evaluations": [
        {
          "itemNo": "1",
          "requirementDesc": "The root technical issue described is the vane sector pin condition of the High Pressure Compressor Stator Stage 5. This issue is identified through a module level borescope inspection (BSI) for engines visiting shop that are not planned for full HPC module overhaul.",
          "remarks": "The operational impact...",
          "taskType": "BOR",
          "isApplicable": true
        }
      ]
    },
    "extractedAt": "2026-07-13T02:22:23.756Z"
  }
}
```

---

### 📝 B. PATCH /api/service-bulletins/:id/ai-summary
Mengirimkan data yang telah divalidasi atau diedit oleh user dari frontend untuk disimpan kembali. 

* **URL Parameter**: `id` (ID Service Bulletin)
* **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
```json
{
  "validatedPayload": {
    "bulletinNumber": "SB 72-0846",
    "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00) - MODULE LEVEL BSI OF HIGH PRESSURE COMPRESSOR STATOR STAGE 5",
    "issuer": "GE90-100",
    "task_type": "BOR",
    "references": "- Boeing 777 Aircraft Maintenance Manual (AMM) Gek 109993 ge90-100\\n- Engine Manual (EM) ge90-100",
    "effected_type": "GE90-100",
    "effected_model": ["-110B1", "-115B"],
    "compliance_category": 7,
    "compliance_time_type": "ATTRITION",
    "compliance_period": "one time",
    "manufacturer": "GE",
    "part_number": "362-097-052-0",
    "note": "-",
    "warranty": false,
    "warranty_due_date": null,
    "warranty_note": null,
    "evaluations": [
      {
        "itemNo": "1",
        "requirementDesc": "The root technical issue described is the vane sector pin condition...",
        "remarks": "The operational impact...",
        "taskType": "BOR",
        "isApplicable": true
      }
    ]
  }
}
```
* **Response Body (JSON)**:
```json
{
  "message": "AI summary reviewed and confirmed",
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "SB 72-0846",
    "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00) - MODULE LEVEL BSI OF HIGH PRESSURE COMPRESSOR STATOR STAGE 5",
    "status": "VALIDATED"
  }
}
```

---

## 3. Pemetaan Input Form & Kolom Data

### A. Bagian Formulir Utama (Metadata)
Setiap field di formulir utama frontend harus dipetakan ke field root di dalam objek `validatedPayload` sebagai berikut:

| Nama Kolom UI | Key Object JSON | Jenis Input UI | Deskripsi / Penjelasan |
| :--- | :--- | :--- | :--- |
| **Bulletin No** | `bulletinNumber` | Text | Nomor Service Bulletin (misal: `SB 72-0846`). **[WAJIB]** |
| **Title** | `title` | Text | Judul dokumen Service Bulletin. |
| **Issuer** | `issuer` | Text | Penerbit dokumen (misal: `GE90-100`, `LEAP-1A`). |
| **Task Type** | `task_type` | Text / Select | Tipe pekerjaan utama (misal: `BOR`, `INSP`, `MOD`, `REP`). |
| **References** | `references` | Text Area | Teks referensi (gunakan list baru dengan garis baru `\n` diawali tanda `-` per baris). |
| **Effected Type** | `effected_type` | Text | Tipe mesin yang terdampak secara global (misal: `GE90-100`). |
| **Effected Model** | `effected_model` | Multi-select / Chips | Seri model mesin dalam bentuk array (misal: `["-110B1", "-115B"]`). |
| **Manufacturer** | `manufacturer` | Text | Nama produsen engine (misal: `GE`, `CFM`). |
| **Part Number** | `part_number` | Text | Nomor part/komponen utama yang terdampak. |
| **Compliance Category**| `compliance_category` | Number | Angka kategori kepatuhan SB (1 s.d 8). |
| **Compliance Time Type**| `compliance_time_type`| Select | Jenis batas waktu (pilihan: `DATE`, `HOUR_CYCLE`, `SCHEDULED`, `ATTRITION`). |
| **Compliance Period** | `compliance_period` | Text | Deskripsi periode (misal: `one time`, `every 500 flight hours`). |
| **Note** | `note` | Text Area | Catatan tambahan umum. |
| **Warranty** | `warranty` | Switch / Checkbox | Status garansi (True = Ada Garansi, False = Tidak Ada). |
| **Warranty Due Date** | `warranty_due_date` | Date Picker | Tanggal jatuh tempo garansi (jika `warranty` = true). |
| **Warranty Note** | `warranty_note` | Text Area | Catatan detail garansi (jika `warranty` = true). |

### B. Bagian Tabel Evaluasi (`evaluations`)
Tabel dinamis di bagian bawah halaman review untuk memodifikasi baris-baris instruksi kerja dari SB.

| Nama Kolom Tabel UI | Key Object JSON | Jenis Kolom UI | Deskripsi |
| :--- | :--- | :--- | :--- |
| **No** | `itemNo` | Text (disabled) | Nomor urut baris evaluasi (misal: `"1"`, `"2"`). |
| **Requirement Description** | `requirementDesc` | Text Area | Deskripsi instruksi kerja dari dokumen SB. **[WAJIB]** |
| **Remarks** | `remarks` | Text / Text Area | Catatan atau rekomendasi khusus untuk baris tersebut. |
| **Task Type** | `taskType` | Select / Text | Tipe tugas untuk baris ini (misal: `BOR`, `INSP`, `MOD`, `REP`). |
| **Applicability** | `isApplicable` | Checkbox / Switch | Status apakah baris pekerjaan ini applicable (`true`) atau tidak (`false`). |

---

## 4. Validasi & Catatan Penting untuk Frontend

1. **Pastikan Struktur Objek Dibungkus `validatedPayload`**:
   Saat mengirim data pembaruan lewat `PATCH /api/service-bulletins/:id/ai-summary`, seluruh field formulir di atas **harus** dibungkus di dalam objek bernama `validatedPayload` pada root request body.
2. **Perubahan Status Draft**:
   Setelah frontend berhasil menembak endpoint PATCH ini, backend akan otomatis memutakhirkan `draftStatus` dokumen Service Bulletin menjadi **`VALIDATED`**. Pengguna baru diperbolehkan berpindah ke halaman *Step 4 (Engineering Recommendation)* atau *Step 5 (Generate EES)* setelah statusnya tervalidasi.
3. **Format Model Terdampak (`effected_model`)**:
   Backend menyimpan field ini dalam format array string. Frontend disarankan menampilkan dalam bentuk tag/chips yang bisa ditambahkan atau dihapus secara dinamis di form.
