# Prompt Implementasi Frontend EDS

Role: Senior Frontend Engineer untuk project AeroCompliance/ORBIT.

Task: Implementasikan halaman daftar dan detail Engine Data Submittal (EDS) menggunakan API backend yang tersedia. Gunakan Next.js App Router, TypeScript, komponen dan design system existing, serta pola API client/authentication yang sudah digunakan project. Jangan menggunakan data hardcoded sebagai sumber utama.

## API yang Digunakan

Base URL harus berasal dari environment frontend. Jangan menuliskan `localhost` secara hardcoded dan jangan menggandakan prefix `/api`.

Semua endpoint berikut membutuhkan:

```http
Authorization: Bearer <access_token>
```

### Daftar EDS

```http
GET /api/eds?page=1&limit=20&esn=906101
```

Query:

- `page`: integer, default `1`.
- `limit`: integer, default `20`.
- `esn`: string opsional untuk filter Engine Serial Number.

Contoh response:

```json
{
  "data": [
    {
      "id": "EDS-F86D0169",
      "engineSerialNumber": "906101",
      "engineType": "GE90-115B",
      "createdAt": "2026-07-30T06:08:01.189Z",
      "updatedAt": "2026-07-30T06:08:01.189Z",
      "originalFileName": "EDS_906101_2026.pdf",
      "storedFileName": "engine-doc-123.pdf",
      "hasPdf": true,
      "engine": {
        "id": "ENG-FAD3C4E3",
        "esn": "906101",
        "msn": "37701",
        "model": "GE90-115B",
        "position": "1",
        "active": true,
        "aircraft": {
          "id": "AC-01393A65",
          "registration": "PK-GIE",
          "msn": "37701",
          "aircraftType": "B777-300ER",
          "operator": {
            "id": "OP-40976567",
            "code": "GA",
            "name": "Garuda Indonesia"
          }
        }
      },
      "summary": {
        "configurationItems": 2,
        "llpItems": 1,
        "serviceBulletins": 3,
        "airworthinessDirectives": 2,
        "accessories": 1,
        "complianceRecords": 4
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### Detail EDS

```http
GET /api/eds/{id}
```

Response utama:

```json
{
  "data": {
    "id": "EDS-F86D0169",
    "engineSerialNumber": "906101",
    "engineId": "ENG-FAD3C4E3",
    "engineType": "GE90-115B",
    "originalFileName": "EDS_906101_2026.pdf",
    "storedFileName": "engine-doc-123.pdf",
    "rawPayload": {},
    "createdAt": "2026-07-30T06:08:01.189Z",
    "updatedAt": "2026-07-30T06:08:01.189Z",
    "engine": {},
    "configurationReport": [],
    "llpStatus": [],
    "sbStatus": [],
    "adStatus": [],
    "accessoriesList": [],
    "complianceRecords": []
  }
}
```

### Preview PDF

```http
GET /api/eds/{id}/view
```

Response: `application/pdf` dengan disposition `inline`.

Karena endpoint membutuhkan Bearer token, jangan langsung memasukkan URL endpoint ke `<iframe>` apabila browser tidak dapat mengirim header Authorization. Fetch sebagai `Blob`, buat URL dengan `URL.createObjectURL(blob)`, tampilkan URL tersebut di PDF viewer, lalu panggil `URL.revokeObjectURL()` saat komponen unmount atau dokumen berubah.

### Download PDF

```http
GET /api/eds/{id}/download
```

Response: `application/pdf` dengan disposition `attachment`.

Download juga harus dilakukan melalui authenticated fetch/axios sebagai `Blob`.

## TypeScript Types

Definisikan tipe yang null-safe. Semua field selain `id` dan `engineSerialNumber` dapat bernilai `null`.

```ts
type Operator = {
  id: string;
  code: string;
  name: string;
};

type Aircraft = {
  id: string;
  registration: string;
  msn: string | null;
  aircraftType: string;
  active: boolean;
  operator: Operator | null;
};

type Engine = {
  id: string;
  esn: string;
  msn: string | null;
  model: string;
  position: string | null;
  active: boolean;
  aircraft: Aircraft | null;
};

type EdsConfigurationItem = {
  id: string;
  module: string | null;
  partName: string | null;
  inOut: string | null;
  partNumber: string | null;
  serial: string | null;
  qty: string | null;
  tsn: string | null;
  csn: string | null;
  tso: string | null;
  cso: string | null;
  workAccompl: string | null;
};

type EdsLlpItem = {
  id: string;
  no: string | null;
  description: string | null;
  partNumber: string | null;
  serialNumber: string | null;
  totalHour: string | null;
  totalCycle: string | null;
  totalCyclesCategory: Record<string, unknown> | null;
  lifeLimitCycles: Record<string, unknown> | null;
  remainingCycles: Record<string, unknown> | null;
  remark: string | null;
};

type EdsSbStatus = {
  id: string;
  sbNumber: string | null;
  notificationDateOfCompliance: string | null;
  description: string | null;
  catType: string | null;
  moduleApplicability: string | null;
  methodOfCompliance: string | null;
  remarks: string | null;
};

type EdsAdStatus = {
  id: string;
  adNumber: string | null;
  notificationDateOfCompliance: string | null;
  description: string | null;
  referenceSb: string | null;
  recurrInsp: string | null;
  moduleApplicability: string | null;
  methodOfCompliance: string | null;
  remarks: string | null;
};

type EdsAccessory = {
  id: string;
  no: string | null;
  description: string | null;
  receivedPn: string | null;
  receivedSn: string | null;
  receivedTsn: string | null;
  receivedTso: string | null;
  installedPn: string | null;
  installedSn: string | null;
  installedTsn: string | null;
  installedTso: string | null;
  maintenancePerformed: string | null;
};

type EdsComplianceRecord = {
  id: string;
  status: string;
  complianceDate: string | null;
  remarks: string | null;
  sourceDate: string | null;
  sb: {
    id: string;
    sbNumber: string;
    title: string;
    complianceCategory: number | null;
  } | null;
  ad: {
    id: string;
    adNumber: string;
    title: string | null;
  } | null;
};
```

## Halaman Daftar EDS

Buat halaman daftar yang nyaman digunakan dengan:

- Judul `Engine Data Submittal`.
- Search/filter ESN dengan debounce.
- Tabel atau responsive cards.
- Pagination dari response backend.
- Empty state, loading skeleton, dan error state dengan tombol retry.

Kolom utama:

1. ESN dari `engineSerialNumber`.
2. Engine type dari `engineType`.
3. Aircraft registration dari `engine.aircraft.registration`.
4. Fleet dari `engine.aircraft.aircraftType`.
5. Operator dari `engine.aircraft.operator.name`.
6. Original file dari `originalFileName`.
7. Uploaded at dari `createdAt`.
8. Jumlah configuration, LLP, SB, AD, dan accessories dari `summary`.
9. Status PDF berdasarkan `hasPdf`.
10. Action `View detail`.

Jangan mengambil seluruh detail setiap baris. Gunakan data ringkasan dari endpoint list.

## Halaman Detail EDS

Gunakan layout:

### Header

- EDS ID.
- ESN.
- Engine type/model.
- Nama file.
- Tanggal upload.
- Badge operator.
- Tombol Preview PDF hanya jika `storedFileName` tersedia.
- Tombol Download PDF hanya jika `storedFileName` tersedia.

### Overview

Tampilkan:

- Engine ID dan ESN.
- Engine model.
- MSN.
- Position.
- Engine active status.
- Aircraft registration.
- Aircraft type.
- Aircraft MSN.
- Operator.

Jika engine atau aircraft tidak terhubung, tampilkan `Not linked`, bukan error.

### Tab Configuration

Tabel:

- Module
- Part name
- IN/OUT
- Part number
- Serial number
- Qty
- TSN
- CSN
- TSO
- CSO
- Work accomplished

Gunakan badge berbeda untuk `IN`/`INSTALLED` dan `OUT`/`REMOVED`.

### Tab LLP Status

Tabel:

- No
- Description
- Part number
- Serial number
- Total hour
- Total cycle
- Life limit
- Remaining cycles
- Remark

Nilai JSON cycle dapat memiliki key yang berbeda. Render sebagai pasangan label dan nilai, bukan mengasumsikan satu key tertentu.

### Tab Service Bulletins

Tabel:

- SB number
- Description
- Compliance category
- Notification date of compliance
- Module applicability
- Method of compliance
- Remarks

Untuk kategori bisnis, gunakan `complianceRecords[].sb.complianceCategory` saat SB berhasil dicocokkan. Jangan membuat field `category` baru. `sbStatus[].catType` hanya merupakan nilai mentah dari dokumen dan boleh digunakan sebagai fallback dengan label `Source category`.

### Tab Airworthiness Directives

Tabel:

- AD number
- Description
- Reference SB
- Recurring inspection
- Notification date
- Module applicability
- Method of compliance
- Remarks

### Tab Accessories

Tabel:

- No
- Description
- Received PN/SN
- Received TSN/TSO
- Installed PN/SN
- Installed TSN/TSO
- Maintenance performed

### Tab Compliance

Gabungkan compliance SB dan AD dalam satu tabel:

- Document type (`SB` atau `AD`)
- Document number
- Title
- Compliance category untuk SB
- Status
- Compliance date
- Source date
- Remarks

Gunakan badge status yang konsisten untuk `OPEN`, `PENDING`, `IN_PROGRESS`, `COMPLIED`, `NOT_APPLICABLE`, `NOT_REQUIRED`, `DEFERRED`, dan `OVERDUE`.

## Aturan Tampilan

- Semua nilai `null`, string kosong, atau array kosong harus ditampilkan sebagai `—` atau empty state yang jelas.
- Jangan menampilkan `rawPayload` pada UI utama. Raw payload hanya boleh tersedia dalam panel debug khusus admin apabila memang dibutuhkan.
- Jangan menghitung kategori dari teks atau `catType` jika `complianceCategory` tersedia.
- Jangan mengubah string TSN/CSN menjadi angka karena format sumber dapat mengandung koma, titik dua, atau unit.
- Format tanggal ISO untuk UI, tetapi pertahankan string tanggal compliance yang berasal dari dokumen apa adanya.
- Gunakan horizontal scrolling untuk tabel teknis pada layar kecil.
- Jangan menampilkan tombol PDF ketika `storedFileName` null atau `hasPdf` false.

## Error Handling

- `401`: hapus sesi/token tidak valid dan arahkan ke login menggunakan mekanisme existing.
- `404` detail: tampilkan EDS tidak ditemukan.
- `404` PDF: tampilkan `PDF belum tersedia`.
- `500` atau network failure: tampilkan pesan backend tidak dapat memuat data dan tombol retry.
- Jangan mengubah semua error backend menjadi pesan `502` generik apabila backend memberikan status dan body yang lebih spesifik.

## Acceptance Criteria

1. Daftar EDS berasal dari `GET /api/eds`.
2. Filter ESN dan pagination bekerja.
3. Detail berasal dari `GET /api/eds/{id}`.
4. Semua section teknis dapat menangani array kosong.
5. Accessories tampil dari `accessoriesList`.
6. Aircraft dan operator tampil dari relasi engine.
7. Kategori SB menggunakan `complianceCategory`.
8. Preview dan download PDF menggunakan authenticated Blob request.
9. Tidak ada data dummy hardcoded dalam production flow.
10. Loading, empty, unauthorized, not found, dan retry state tersedia.

Setelah implementasi, laporkan:

- File frontend yang diubah.
- Route halaman daftar dan detail.
- API client yang ditambahkan atau diperbarui.
- Screenshot atau hasil visual verification.
- Hasil lint, type-check, dan production build.
