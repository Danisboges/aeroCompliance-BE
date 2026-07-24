const axios = require('axios');
const FormData = require('form-data');

const IQ03_AI_SERVICE_URL = process.env.IQ03_AI_SERVICE_URL;
const IQ03_AI_SERVICE_API_KEY = process.env.IQ03_AI_SERVICE_API_KEY;

const EDS_AI_SERVICE_URL = process.env.EDS_AI_SERVICE_URL;
const EDS_AI_SERVICE_API_KEY = process.env.EDS_AI_SERVICE_API_KEY;

const IQ03_AI_SERVICE_URL = process.env.IQ03_AI_SERVICE_URL;
const IQ03_AI_SERVICE_API_KEY = process.env.IQ03_AI_SERVICE_API_KEY;

/**
 * Calls AI service to extract engine documents (IQ03, EDS, IQ03) data.
 */
const analyzeEngineDocumentPdf = async ({ fileName, buffer, docType }) => {
  let endpoint;
  let apiKey;

  if (docType === 'EDS') {
    endpoint = EDS_AI_SERVICE_URL || 'https://dzakievgn-sb-extractor.hf.space/api/extract_eds';
    apiKey = EDS_AI_SERVICE_API_KEY;
  } else if (docType === 'IQ03') {
    endpoint = IQ03_AI_SERVICE_URL || 'https://dzakievgn-sb-extractor.hf.space/api/extract_iq03';
    apiKey = IQ03_AI_SERVICE_API_KEY;
  } else {
    endpoint = IQ03_AI_SERVICE_URL || 'https://dzakievgn-sb-extractor.hf.space/api/extract_IQ03';
    apiKey = IQ03_AI_SERVICE_API_KEY;
  }

  console.log(`[Engine Doc AI Client] Sending ${docType} PDF to AI Service: ${endpoint}`);

  try {
    const formData = new FormData();
    formData.append('file', buffer, { filename: fileName || 'IQ03-document.pdf', contentType: 'application/pdf' });

    const headers = { ...formData.getHeaders() };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
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

    if (!result || !result.IQ03_schema) {
      throw new Error('Invalid response format from IQ03 AI service.');
    }

    return result;
  } catch (error) {
    console.error('[IQ03 AI Client] ❌ IQ03 AI service connection failed:', error.message);
    throw new Error(`IQ03 extraction failed: ${error.message}`);
  }
};

module.exports = {
  analyzeEngineDocumentPdf
};

