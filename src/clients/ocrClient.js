const axios = require('axios');
const FormData = require('form-data');

// ============================================================
// KONFIGURASI AI SERVICE
// ============================================================
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

if (!AI_SERVICE_URL || !AI_SERVICE_API_KEY) {
  console.warn('[AI Client] ⚠️ Peringatan: Konfigurasi AI_SERVICE_URL atau AI_SERVICE_API_KEY belum diset di .env');
}

/**
 * Memanggil AI service untuk menganalisis PDF.
 */
const analyzePdf = async ({ fileName, checksum, buffer, storagePath }) => {
  console.log(`[AI Client] Mengirim PDF ke AI Service: ${AI_SERVICE_URL}`);

  try {
    const formData = new FormData();
    formData.append('file', buffer, { filename: fileName || 'document.pdf', contentType: 'application/pdf' });

    // Gunakan axios tanpa timeout untuk request AI yang memakan waktu lama
    const response = await axios.post(AI_SERVICE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${AI_SERVICE_API_KEY}`
      },
      timeout: 0 // Disable timeout di level axios
    });

    let result = response.data;
    console.log('[AI Client] ✅ Respons dari AI Service diterima.');
    console.log('[AI Client] 🔑 Top-level keys:', Object.keys(result || {}));

    // Jika response berupa string (biasanya karena LLM membungkus dengan ```json ... ```)
    if (typeof result === 'string') {
      try {
        const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn('[AI Client] ⚠️ Gagal melakukan parse JSON dari string AI:', parseErr.message);
        result = {};
      }
    }

    // ============================================================
    // UNWRAP: AI mengembalikan data di dalam wrapper `mro_schema`
    // Struktur: { filename, mro_schema: {...}, routing_directive: {...}, raw_ocr_content }
    // ============================================================
    const schema = result.mro_schema?.mro_schema || result.mro_schema || result; // fallback ke root jika mro_schema tidak ada
    const routing = result.routing_directive || {};
    const rawOcrContent = result.raw_ocr_content || null;

    console.log('[AI Client] 📋 Schema keys:', Object.keys(schema));
    console.log('[AI Client] 📋 sb_code:', schema.sb_code);
    console.log('[AI Client] 📋 tittle:', schema.tittle);

    // NORMALIZE items dari problem_evidence + description → format legacy items[]
    // Items dengan paragraph yang sama di-MERGE menjadi satu baris
    const mergedMap = new Map(); // key = paragraph name, value = merged item

    const mergeInto = (paragraph, entry) => {
      const taskType = schema.task_type || routing.workflow_action || 'REP';
      const reference = schema.references || '';

      if (mergedMap.has(paragraph)) {
        const existing = mergedMap.get(paragraph);
        // Gabungkan requirement_desc dan remarks dengan pemisah newline
        if (entry.requirement_desc) {
          existing.requirementDesc += '\n\n' + entry.requirement_desc;
        }
        if (entry.remark) {
          existing.remarks += '\n\n' + entry.remark;
        }
      } else {
        mergedMap.set(paragraph, {
          paragraph,
          requirementDesc: entry.requirement_desc || '',
          taskType,
          reference,
          remarks: entry.remark || ''
        });
      }
    };

    if (schema.problem_evidence && Array.isArray(schema.problem_evidence)) {
      schema.problem_evidence.forEach(ev => mergeInto('Problem Evidence', ev));
    }

    if (schema.description && Array.isArray(schema.description)) {
      schema.description.forEach(desc => mergeInto('Description', desc));
    }

    // Konversi Map ke array dengan nomor urut
    const normalizedItems = [];
    let itemCounter = 1;
    mergedMap.forEach(item => {
      normalizedItems.push({ itemNo: String(itemCounter++), ...item });
    });

    // Jika AI mengirim legacy items (tanpa wrapper mro_schema)
    if (normalizedItems.length === 0 && schema.items) {
      Object.keys(schema.items).forEach(key => {
        schema.items[key].forEach(item => normalizedItems.push(item));
      });
    }

    // Fallback jika AI gagal mengekstrak sb_code
    const defaultSbCode = fileName ? fileName.replace(/\.[^/.]+$/, '').toUpperCase() : `UNIDENTIFIED-${Date.now()}`;

    const payload = {
      ...schema,
      sb_code: schema.sb_code || schema.bulletinNumber || defaultSbCode,
      compliance_category: schema.compliance_category || routing.compliance_category || 3,
      effected_type: schema.effected_type || '',
      effected_model: schema.effected_model || [],
      title: schema.tittle || schema.title || 'Untitled Service Bulletin',
      manufacturer: schema.manufacturer || '',
      part_number: schema.part_number || '',
      issueDate: schema.issued_date || schema.issueDate || '',
      compliance_period: schema.compliance_period || '',
      isMod: false,
      task_type: schema.task_type || routing.workflow_action || '',
      references: schema.references || '',
      items: {
        '': normalizedItems
      }
    };

    console.log(`[AI Client] ✅ Payload final: sb_code=${payload.sb_code}, items=${normalizedItems.length}, title=${payload.title}`);
    return { provider: 'REAL_AI', payload };

  } catch (error) {
    const errorMsg = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` : error.message;
    console.error('[AI Client] ❌ Gagal menghubungi AI Service:', errorMsg);
    throw new Error(`Gagal menghubungi AI Service: ${errorMsg}`);
  }
};

module.exports = {
  analyzePdf
};
