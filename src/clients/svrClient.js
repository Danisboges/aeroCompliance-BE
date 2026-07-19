const axios = require('axios');
const FormData = require('form-data');

const SVR_AI_SERVICE_URL = process.env.SVR_AI_SERVICE_URL;
const SVR_AI_SERVICE_API_KEY = process.env.SVR_AI_SERVICE_API_KEY;

/**
 * Calls AI service to extract SVR data.
 * Falls back to mock SVR data if service is not configured or fails in dev.
 */
const analyzeSvrPdf = async ({ fileName, buffer }) => {
  console.log(`[SVR AI Client] Sending PDF to SVR AI Service: ${SVR_AI_SERVICE_URL}`);

  const endpoint = SVR_AI_SERVICE_URL || 'https://dzakievgn-sb-extractor.hf.space/api/extract_svr';
  console.log(`[SVR AI Client] Sending PDF to SVR AI Service: ${endpoint}`);

  try {
    const formData = new FormData();
    formData.append('file', buffer, { filename: fileName || 'svr-document.pdf', contentType: 'application/pdf' });

    const headers = { ...formData.getHeaders() };
    if (SVR_AI_SERVICE_API_KEY) {
      headers['Authorization'] = `Bearer ${SVR_AI_SERVICE_API_KEY}`;
    }

    const response = await axios.post(endpoint, formData, {
      headers,
      timeout: 0
    });

    let result = response.data;

    if (typeof result === 'string') {
      try {
        const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error(`Failed parsing AI JSON response: ${parseErr.message}`);
      }
    }

    if (!result || !result.svr_schema) {
      throw new Error('Invalid response format from SVR AI service.');
    }

    return result;
  } catch (error) {
    console.error('[SVR AI Client] ❌ SVR AI service connection failed:', error.message);
    throw new Error(`SVR extraction failed: ${error.message}`);
  }
};

module.exports = {
  analyzeSvrPdf
};
