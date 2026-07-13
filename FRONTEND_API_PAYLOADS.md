# 📄 Frontend API Request Payload Reference

Dokumen ini berisi kumpulan **JSON Request Body** siap pakai untuk membantu tim Frontend dalam mengembangkan dan menguji integrasi API backend Compliance System (melalui Postman atau Axios).

---

## 1. Authentication

### `POST /api/auth/register` (Registrasi Akun Baru)
* **URL**: `http://localhost:3000/api/auth/register`
* **JSON Body**:
```json
{
  "email": "admin@gmf.com",
  "username": "admin",
  "password": "supersecretpassword",
  "role": "ADMIN"
}
```
* **Keterangan Field**:
  - `email` *(string, required)*: Email unik pengguna.
  - `username` *(string, required)*: Username unik pengguna.
  - `password` *(string, required)*: Kata sandi pengguna (minimal 6 karakter).
  - `role` *(string, required)*: Hak akses akun. Pilihan: `"ADMIN"` atau `"USER"`.

### `POST /api/auth/login` (Login Pengguna)
* **URL**: `http://localhost:3000/api/auth/login`
* **JSON Body**:
```json
{
  "username": "admin",
  "password": "supersecretpassword"
}
```
* **Keterangan Field**:
  - `username` *(string, optional)*: Username pengguna (bisa menggunakan email sebagai gantinya).
  - `email` *(string, optional)*: Email pengguna (bisa menggunakan username sebagai gantinya).
  - `password` *(string, required)*: Kata sandi pengguna.

---

## 2. Step 3: AI Summary Review

### `PATCH /api/service-bulletins/:id/ai-summary` (Simpan Validasi Ekstraksi AI)
* **URL**: `http://localhost:3000/api/service-bulletins/{id_service_bulletin}/ai-summary`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **JSON Body**:
```json
{
  "validatedPayload": {
    "bulletinNumber": "SB 72-0846",
    "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00) - MODULE LEVEL BSI OF HIGH PRESSURE COMPRESSOR STATOR STAGE 5",
    "issuer": "GE90-100",
    "task_type": "BOR",
    "references": "- Boeing 777 Aircraft Maintenance Manual (AMM) Gek 109993 ge90-100\n- Engine Manual (EM) ge90-100",
    "effected_type": "GE90-100",
    "effected_model": [
      "-110B1",
      "-115B"
    ],
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
        "requirementDesc": "Perform borescope inspection of HP Compressor stator stage 5.",
        "remarks": "Check stator stage 5 vane sector pins.",
        "taskType": "BOR",
        "isApplicable": true
      },
      {
        "itemNo": "2",
        "requirementDesc": "Introduction of new stage 5 through 8 borescope vane assemblies.",
        "remarks": "Perform during next shop visit.",
        "taskType": "MOD",
        "isApplicable": true
      }
    ]
  }
}
```
* **Keterangan Field Utama**:
  - `bulletinNumber` *(string, required)*: Nomor dokumen Service Bulletin.
  - `references` *(string)*: Dokumen acuan. Gunakan format list baru (`\n- Teks`).
  - `effected_model` *(array of strings)*: Seri model mesin yang terdampak.
  - `compliance_category` *(integer)*: Kategori kepatuhan (1 s.d. 8).
  - `compliance_time_type` *(string)*: Tipe batas waktu. Pilihan: `"DATE"`, `"HOUR_CYCLE"`, `"SCHEDULED"`, `"ATTRITION"`.
  - `warranty` *(boolean)*: Status garansi (`true` / `false`).
* **Keterangan Field Evaluations (Tabel Instruksi Kerja)**:
  - `itemNo` *(string, required)*: Nomor urut item (misal: `"1"`).
  - `requirementDesc` *(string, required)*: Instruksi kerja.
  - `taskType` *(string)*: Tipe tugas spesifik (misal: `INSP`, `MOD`, `REP`, `BOR`).
  - `isApplicable` *(boolean, required)*: Apakah item ini berlaku (`true` / `false`).

---

## 3. Step 4: Engineering Recommendation

### `POST /api/service-bulletins/:id/engineering-rec` (Simpan Rekomendasi Rekayasa)
* **URL**: `http://localhost:3000/api/service-bulletins/{id_service_bulletin}/engineering-rec`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **JSON Body**:
```json
{
  "recommendedAction": "COMPLY",
  "priorityLevel": "HIGH",
  "engineeringNotes": "All fleet engines are affected. Recommend compliance during next shop visit.",
  "isDeferable": false,
  "egtMarginCheck": true
}
```
* **Keterangan Field**:
  - `recommendedAction` *(string, required)*: Keputusan tindakan rekayasa. Pilihan: `"COMPLY"`, `"DEFER"`, atau `"NA"`.
  - `priorityLevel` *(string, optional)*: Tingkat urgensi. Pilihan: `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`, `"LOW"`. Default: `"HIGH"`.
  - `engineeringNotes` *(string, optional)*: Catatan/alasan rekomendasi.
  - `isDeferable` *(boolean, optional)*: Apakah bisa ditunda (`true` / `false`).
  - `egtMarginCheck` *(boolean, optional)*: Verifikasi margin EGT (`true` / `false`).

---

## 4. Step 5: EES Generation & Editing

### `POST /api/service-bulletins/:id/generate-ees` (Generate Dokumen EES)
* **URL**: `http://localhost:3000/api/service-bulletins/{id_service_bulletin}/generate-ees`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **JSON Body**:
```json
{
  "eesNumber": "EES-LEAP-1A-72-00-0449-01A-930A-D-1783913565466",
  "aircraftType": "A320"
}
```
* **Keterangan Field (Semua Opsional)**:
  - `eesNumber` *(string, optional)*: Masukkan data jika frontend ingin menentukan/meng-override nomor EES kustom.
  - `aircraftType` *(string, optional)*: Masukkan jenis pesawat terdampak (harus terdaftar di master data sistem).

### `PATCH /api/service-bulletins/:id/ees` (Edit Hasil EES sebelum di-Export)
* **URL**: `http://localhost:3000/api/service-bulletins/{id_service_bulletin}/ees`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **JSON Body**:
*Menggunakan struktur payload yang sama persis dengan **`PATCH /api/service-bulletins/:id/ai-summary`** (lihat bagian 2 di atas).*

---

## 5. Webhook (AI Extractor Simulators)

### `POST /api/webhooks/ees` (Menerima Ekstraksi AI secara Langsung)
* **URL**: `http://localhost:3000/api/webhooks/ees`
* **JSON Body**:
```json
{
  "filename": "GE90-100 SB 72-0846 R2.pdf",
  "mro_schema": {
    "mro_schema": {
      "sb_code": "SB 72-0846",
      "tittle": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00) - MODULE LEVEL BSI OF HIGH PRESSURE COMPRESSOR STATOR STAGE 5",
      "manufacturer": "GE",
      "revision_number": "R02",
      "issued_date": "10/30/2020",
      "effected_type": "GE90-100",
      "effected_model": [
        "-110B1",
        "-115B"
      ],
      "compliance_category": 7,
      "task_type": "BOR",
      "references": "Boeing 777 Aircraft Maintenance Manual (AMM) Gek 109993 ge90-100, Engine Manual (EM) ge90-100",
      "component_type": "COMPONENT",
      "compliance_time_type": "ATTRITION",
      "compliance_period": "one time",
      "problem_evidence": [
        {
          "requirement_desc": "Perform borescope inspection of HP Compressor stator stage 5.",
          "remark": "Check stator stage 5 vane sector pins."
        }
      ],
      "description": [
        {
          "requirement_desc": "Introduction of new stage 5 through 8 borescope vane assemblies.",
          "remark": "Perform during next shop visit."
        }
      ]
    }
  },
  "routing_directive": {
    "workflow_action": "BOR",
    "compliance_category": 7
  }
}
```
