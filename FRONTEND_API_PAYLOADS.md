const fs = require('fs');
const path = './FRONTEND_API_PAYLOADS.md';

const docContent = `# 📘 Frontend API Reference Guide (Request & Response)

Dokumen ini berisi dokumentasi lengkap seluruh endpoint aktif di backend Compliance System, mencakup format **Request Headers**, **Request Body**, dan **Response Body (JSON)** untuk membantu tim Frontend dalam melakukan integrasi.

---

## 🔑 1. AUTHENTICATION & MASTER DATA

### `POST /api/auth/register` (Registrasi Akun Baru)
* **Request Headers**:
  - `Content-Type: application/json`
* **Request Body (JSON)**:
```json
{
  "email": "user@gmf.com",
  "username": "user123",
  "password": "secretpassword",
  "role": "USER"
}
```
* **Response Body (JSON - Status 201)**:
```json
{
  "message": "User registered successfully",
  "data": {
    "id": "USR-3044754E",
    "email": "user@gmf.com",
    "username": "user123",
    "role": "USER"
  }
}
```

### `POST /api/auth/login` (Login Pengguna)
* **Request Headers**:
  - `Content-Type: application/json`
* **Request Body (JSON)**:
```json
{
  "username": "user123",
  "password": "secretpassword"
}
```
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "USR-3044754E",
      "email": "user@gmf.com",
      "username": "user123",
      "role": "USER"
    }
  }
}
```

### `GET /api/aircraft` (Daftar Maskapai/Pesawat Aktif)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "Aircraft retrieved successfully",
  "data": [
    {
      "id": "AC-001",
      "registration": "PK-GQG",
      "msn": "MSN-30112",
      "aircraftType": "A320",
      "active": true,
      "createdAt": "2026-07-10T06:59:24.000Z"
    }
  ]
}
```

---

## 📂 2. STEP 1: SELECT & UPLOAD SERVICE BULLETIN (SB)

### `GET /api/service-bulletins` (List Semua SB dengan Pagination)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Query Parameters** *(Semua Opsional)*:
  - `page` *(number, default: 1)*: Halaman aktif.
  - `limit` *(number, default: 20)*: Jumlah data per halaman.
  - `ocrStatus` *(string)*: Filter status OCR (`UPLOADED`, `PROCESSING`, `EXTRACTED`, `REVIEW_REQUIRED`, `FAILED`).
  - `draftStatus` *(string)*: Filter status draft (`DRAFT`, `REVIEW_REQUIRED`, `VALIDATED`, `GENERATED`).
* **Response Body (JSON - Status 200)**:
```json
{
  "data": [
    {
      "id": "SB-DOC-D07BA43D",
      "sbNumber": "GE90-100 SB 72-0846 R2",
      "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00)",
      "issuer": "GE",
      "issueDate": "2020-10-30T00:00:00.000Z",
      "status": "VALIDATED",
      "sbType": null,
      "complianceCategory": 7,
      "effectivityType": "GE90-100",
      "effectivityRange": "-110B1, -115B",
      "compliancePeriod": "one time",
      "originalFileName": "GE90-100 SB 72-0846 R2.pdf",
      "storedFileName": "sb-SB-DOC-D07BA43D-c7f199cc3951.pdf",
      "createdById": "USR-3044754E",
      "updatedById": null,
      "createdAt": "2026-07-13T02:22:23.756Z",
      "createdBy": {
        "id": "USR-3044754E",
        "username": "admin",
        "role": "ADMIN"
      },
      "ocrResult": {
        "id": "dd41708b-35dc-4538-9e6c-6b940c7f5eb8",
        "ocrStatus": "EXTRACTED",
        "draftStatus": "VALIDATED",
        "extractedAt": "2026-07-13T02:22:45.000Z"
      },
      "generatedEes": null
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### `GET /api/service-bulletins/:id` (Detail Satu SB)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "GE90-100 SB 72-0846 R2",
    "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00)",
    "issuer": "GE",
    "issueDate": "2020-10-30T00:00:00.000Z",
    "status": "VALIDATED",
    "sbType": null,
    "complianceCategory": 7,
    "effectivityType": "GE90-100",
    "effectivityRange": "-110B1, -115B",
    "compliancePeriod": "one time",
    "originalFileName": "GE90-100 SB 72-0846 R2.pdf",
    "storedFileName": "sb-SB-DOC-D07BA43D-c7f199cc3951.pdf",
    "createdById": "USR-3044754E",
    "createdAt": "2026-07-13T02:22:23.756Z",
    "ocrResult": {
      "id": "dd41708b-35dc-4538-9e6c-6b940c7f5eb8",
      "ocrStatus": "EXTRACTED",
      "draftStatus": "VALIDATED",
      "rawPayload": {
        "bulletinNumber": "SB 72-0846",
        "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00)"
      }
    },
    "generatedEes": null
  }
}
```

### `POST /api/service-bulletins/:id/upload-pdf` (Upload PDF ke SB Existing)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/pdf`
  - `x-file-name`: `nama-file-asli.pdf`
* **Request Body**: `Binary PDF Data`
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "PDF uploaded to existing SB",
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "GE90-100 SB 72-0846 R2",
    "status": "PROCESSING"
  }
}
```

### `POST /api/service-bulletins/upload-new` (Upload PDF & Buat SB Baru)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/pdf`
  - `x-file-name`: `nama-file-asli.pdf`
* **Request Body**: `Binary PDF Data`
* **Response Body (JSON - Status 201)**:
```json
{
  "message": "SB baru berhasil dibuat dari file PDF yang diupload",
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "TEMP-A3F2C-178391",
    "status": "PROCESSING"
  }
}
```

### `GET /api/service-bulletins/:id/view` (Preview PDF SB Asli)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream inline)*

### `GET /api/service-bulletins/:id/download` (Download PDF SB Asli)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream attachment)*

---

## ✈️ 3. STEP 2: APPLICABILITY CHECK

### `GET /api/service-bulletins/:id/applicability` (Hasil Pencocokan Fleet)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "data": {
    "sb": {
      "id": "SB-DOC-D07BA43D",
      "sbNumber": "GE90-100 SB 72-0846 R2",
      "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00)",
      "effectivityType": "GE90-100",
      "effectivityRange": "-110B1, -115B",
      "compliancePeriod": "one time"
    },
    "summary": {
      "totalEngines": 2,
      "applicable": 1,
      "notApplicable": 1
    },
    "engines": [
      {
        "esn": "ESN-902123",
        "msn": "MSN-30112",
        "model": "GE90-115B",
        "position": "1",
        "aircraft": {
          "registration": "PK-GQF",
          "msn": "MSN-30112",
          "aircraftType": "B777"
        },
        "isApplicable": true,
        "reason": "Engine model matches SB effectivity type"
      }
    ]
  }
}
```

---

## 🤖 4. STEP 3: AI SUMMARY REVIEW

### `GET /api/service-bulletins/:id/ai-summary` (Tarik Hasil AI)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "data": {
    "sbId": "SB-DOC-D07BA43D",
    "sbNumber": "GE90-100 SB 72-0846 R2",
    "draftStatus": "REVIEW_REQUIRED",
    "ocrStatus": "EXTRACTED",
    "aiSummary": {
      "bulletinNumber": "SB 72-0846",
      "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00)",
      "issuer": "GE90-100",
      "task_type": "BOR",
      "references": "- Boeing 777 Aircraft Maintenance Manual (AMM) Gek 109993 ge90-100\n- Engine Manual (EM) ge90-100",
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
          "requirementDesc": "Perform borescope inspection of HP Compressor stator stage 5.",
          "remarks": "Check stator stage 5 vane sector pins.",
          "taskType": "BOR",
          "isApplicable": true
        }
      ]
    },
    "extractedAt": "2026-07-13T02:22:23.756Z"
  }
}
```

### `PATCH /api/service-bulletins/:id/ai-summary` (Simpan Perubahan & Validasi)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
* **Request Body (JSON)**:
```json
{
  "validatedPayload": {
    "bulletinNumber": "SB 72-0846",
    "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00)",
    "issuer": "GE90-100",
    "task_type": "BOR",
    "references": "- Boeing 777 Aircraft Maintenance Manual (AMM) Gek 109993 ge90-100\n- Engine Manual (EM) ge90-100",
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
        "requirementDesc": "Perform borescope inspection of HP Compressor stator stage 5.",
        "remarks": "Check stator stage 5 vane sector pins.",
        "taskType": "BOR",
        "isApplicable": true
      }
    ]
  }
}
```
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "AI summary reviewed and confirmed",
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "SB 72-0846",
    "title": "ENGINE - COMPRESSOR MODULE ASSEMBLY (72-30-00)",
    "status": "VALIDATED"
  }
}
```

---

## ⚙️ 5. STEP 4: ENGINEERING RECOMMENDATION

### `GET /api/service-bulletins/:id/engineering-rec` (Ambil Data Rekomendasi)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "data": {
    "id": "REC-9304123",
    "sbId": "SB-DOC-D07BA43D",
    "recommendedAction": "COMPLY",
    "priorityLevel": "HIGH",
    "engineeringNotes": "All fleet engines are affected. Recommend compliance during next shop visit.",
    "isDeferable": false,
    "egtMarginCheck": true,
    "createdAt": "2026-07-13T02:30:11.000Z"
  }
}
```

### `POST` & `PATCH /api/service-bulletins/:id/engineering-rec` (Simpan/Update Rekomendasi)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
* **Request Body (JSON)**:
```json
{
  "recommendedAction": "COMPLY",
  "priorityLevel": "HIGH",
  "engineeringNotes": "All fleet engines are affected. Recommend compliance during next shop visit.",
  "isDeferable": false,
  "egtMarginCheck": true
}
```
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "Engineering recommendation saved successfully",
  "data": {
    "id": "REC-9304123",
    "recommendedAction": "COMPLY",
    "priorityLevel": "HIGH"
  }
}
```

---

## 📄 6. STEP 5: GENERATE & EDIT EES DOCUMENT

### `POST /api/service-bulletins/:id/generate-ees` (Generate Dokumen EES awal)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
* **Request Body (JSON)** *(Semua Opsional)*:
```json
{
  "eesNumber": "EES-CUSTOM-9999",
  "aircraftType": "A320"
}
```
* **Response Body (JSON - Status 201)**:
```json
{
  "message": "EES document generated from validated Service Bulletin draft",
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "SB 72-0846",
    "status": "GENERATED"
  }
}
```

### `GET /api/service-bulletins/:id/ees` (Mengambil Hasil EES Ter-generate)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "data": {
    "id": "EES-DOC-A19F870E",
    "eesNumber": "EES-SB 72-0846-1783911088",
    "sourceSbId": "SB-DOC-D07BA43D",
    "taskType": "BOR",
    "references": "- Boeing 777 Aircraft Maintenance Manual\n- Engine Manual",
    "effectedType": "GE90-100",
    "effectedModel": "-110B1, -115B",
    "aircraftType": "B777",
    "manufacturer": "GE",
    "partNumber": "362-097-052-0",
    "evaluations": [
      {
        "id": "EVAL-001",
        "itemNo": "1",
        "requirementDesc": "Perform borescope inspection of HP Compressor stator stage 5.",
        "remarks": "Check stator stage 5 vane sector pins.",
        "taskType": "BOR",
        "isApplicable": true
      }
    ]
  }
}
```

### `PATCH /api/service-bulletins/:id/ees` (Edit Hasil EES sebelum di-Export)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
* **Request Body (JSON)**:
*Menggunakan format payload yang sama dengan `PATCH /api/service-bulletins/:id/ai-summary` (lihat Bagian 4).*
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "EES document updated successfully",
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "SB 72-0846",
    "status": "GENERATED"
  }
}
```

---

## ⬇️ 7. STEP 6: EXPORT EES (PDF / EXCEL)

### `GET /api/service-bulletins/:id/export/garuda/pdf` (Preview Garuda PDF)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream inline)*

### `GET /api/service-bulletins/:id/export/garuda/pdf/download` (Download Garuda PDF)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream attachment)*

### `GET /api/service-bulletins/:id/export/citilink/pdf` (Preview Citilink PDF)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream inline)*

### `GET /api/service-bulletins/:id/export/citilink/pdf/download` (Download Citilink PDF)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream attachment)*

### `GET /api/service-bulletins/:id/export/excel` (Download Excel)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` *(Excel File)*

---

## ⚙️ 8. WEBHOOKS & ADMIN

### `POST /api/webhooks/ees` (Ingest Payload AI Mentah langsung)
* **Request Headers**: `Content-Type: application/json`
* **Request Body (JSON)**: *(Lihat payload integrasi AI asli)*
```json
{
  "filename": "document.pdf",
  "mro_schema": {
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
        { "requirement_desc": "Visual BSI check", "remark": "Standard remarks" }
      ],
      "description": [
        { "requirement_desc": "Replace Hub Assembly", "remark": "Rework procedure" }
      ]
    }
  },
  "routing_directive": {
    "workflow_action": "REP",
    "compliance_category": 3
  }
}
```

### `DELETE /api/service-bulletins/:id` (Hapus SB & File Terkait)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "Service Bulletin deleted successfully",
  "data": {
    "id": "SB-DOC-D07BA43D",
    "sbNumber": "SB 72-0846"
  }
}
```

---

## 🛠️ 9. SHOP VISIT REPORTS (SVR)

### `POST /api/shop-visit-reports/upload` (Upload PDF SVR Asli)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/pdf`
  - `x-file-name`: `SVR_660235_2026.pdf`
* **Request Body**: `Binary PDF Data`
* **Response Body (JSON - Status 201)**:
```json
{
  "message": "SVR PDF received and processed by SVR pipeline",
  "data": {
    "id": "b2883f3d-3762-4277-8b7a-153b9993359f",
    "engineSerialNumber": "660235",
    "engineType": "CFM56-7B26E",
    "shopInDate": "12 February 2026",
    "shopOutDate": "04 March 2026",
    "reportDate": "04 March 2026",
    "reasonForShopVisit": "HPT Blades RRT (SB 72-1082) and RDS Seal Replacement",
    "tsn": "27,680:46",
    "csn": "17,946",
    "tslv": "15,907:12",
    "cslv": "10,136",
    "authorizedReleaseStatus": "DGCA form 21-18 And FAA form 8130-3",
    "storedFileName": "svr-178392-xxxx.pdf"
  }
}
```

### `POST /api/webhooks/svr` (Ingest JSON SVR AI)
* **Request Headers**:
  - `Content-Type: application/json`
* **Request Body (JSON)**:
```json
{
  "filename": "SVR 660235 2026.pdf",
  "svr_schema": {
    "svr_schema": {
      "engine_type": "CFM56-7B26E",
      "engine_serial_number": "660235",
      "shop_in_date": "12 February 2026",
      "shop_out_date": "04 March 2026",
      "report_date": "04 March 2026",
      "reason_for_shop_visit": "HPT Blades RRT (SB 72-1082) and RDS Seal Replacement",
      "tsn": "27,680:46",
      "csn": "17,946",
      "tslv": "15,907:12",
      "cslv": "10,136",
      "authorized_release_status": "DGCA form 21-18 And FAA form 8130-3",
      "configuration_report": [
        {
          "module": "FAN MAJOR MODULE",
          "part_name": "Inner Radial Drive Shaft",
          "in_out": "OUT",
          "part_number": null,
          "serial": null,
          "qty": null,
          "tsn": null,
          "csn": null,
          "tso": null,
          "cso": null,
          "work_accompl": "REPAIRED"
        }
      ],
      "life_limited_part_status": [
        {
          "no": "1",
          "description": "HPT Blades",
          "part_number": "2403M91P03",
          "serial_number": "VX 1740"
        }
      ],
      "airworthiness_directive_status": [
        {
          "ad_number": "CFM56-7B SB 72-1082",
          "notification_date_of_compliance": "02.03.2026",
          "description": "Recommended Removal Time",
          "reference_sb": "72-1082",
          "recurr_insp": "NO",
          "module_applicability": "HPT Blades",
          "method_of_compliance": "REPLACEMENT OF HPT BLADES",
          "remarks": "COMPLIED"
        }
      ]
    }
  }
}
```
* **Response Body (JSON - Status 201)**:
*(Sama seperti response upload PDF)*

### `GET /api/shop-visit-reports` (List SVR)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Query Parameters** *(Semua Opsional)*:
  - `page`: Nomor halaman (Default: `1`)
  - `limit`: Jumlah data per halaman (Default: `20`)
  - `esn`: Filter berdasarkan Engine Serial Number (misal: `660235`)
* **Response Body (JSON - Status 200)**:
```json
{
  "data": [
    {
      "id": "b2883f3d-3762-4277-8b7a-153b9993359f",
      "engineSerialNumber": "660235",
      "engineId": "ENG-660235",
      "engineType": "CFM56-7B26E",
      "shopInDate": "12 February 2026",
      "shopOutDate": "04 March 2026",
      "reportDate": "04 March 2026",
      "reasonForShopVisit": "HPT Blades RRT (SB 72-1082) and RDS Seal Replacement",
      "tsn": "27,680:46",
      "csn": "17,946",
      "tslv": "15,907:12",
      "cslv": "10,136",
      "authorizedReleaseStatus": "DGCA form 21-18 And FAA form 8130-3",
      "originalFileName": "SVR_660235_2026.pdf",
      "storedFileName": "svr-178392-xxxx.pdf",
      "createdAt": "2026-07-14T06:57:21.000Z",
      "configurationReport": [
        {
          "id": "cfg-01",
          "module": "FAN MAJOR MODULE",
          "partName": "Inner Radial Drive Shaft",
          "inOut": "OUT",
          "partNumber": "",
          "serial": "",
          "qty": "",
          "workAccompl": "REPAIRED"
        }
      ],
      "llpStatus": [
        {
          "id": "llp-01",
          "no": "1",
          "description": "HPT Blades",
          "partNumber": "2403M91P03",
          "serialNumber": "VX 1740",
          "remark": "Replaced with Superseded Part Number"
        }
      ],
      "adStatus": [
        {
          "id": "ad-01",
          "adNumber": "CFM56-7B SB 72-1082",
          "notificationDateOfCompliance": "02.03.2026",
          "description": "Recommended Removal Time",
          "referenceSb": "72-1082",
          "remarks": "COMPLIED"
        }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### `GET /api/shop-visit-reports/:id` (Detail SVR)
* **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
*(Mengembalikan objek data SVR tunggal seperti elemen di dalam list di atas).*

### `GET /api/shop-visit-reports/:id/view` (Preview SVR PDF)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream inline)*

### `GET /api/shop-visit-reports/:id/download` (Download SVR PDF)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response**: `application/pdf` *(File Stream attachment)*

### `DELETE /api/shop-visit-reports/:id` (Hapus SVR & PDF)
* **Request Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Response Body (JSON - Status 200)**:
```json
{
  "message": "ShopVisitReport deleted successfully",
  "data": {
    "id": "b2883f3d-3762-4277-8b7a-153b9993359f",
    "engineSerialNumber": "660235"
  }
}
```
