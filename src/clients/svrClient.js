const axios = require('axios');
const FormData = require('form-data');
const https = require('https');

const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false
});

const SVR_AI_SERVICE_URL = process.env.SVR_AI_SERVICE_URL;
const SVR_AI_SERVICE_API_KEY = process.env.SVR_AI_SERVICE_API_KEY;

const EDS_AI_SERVICE_URL = process.env.EDS_AI_SERVICE_URL;
const EDS_AI_SERVICE_API_KEY = process.env.EDS_AI_SERVICE_API_KEY;

const IQ03_AI_SERVICE_URL = process.env.IQ03_AI_SERVICE_URL;
const IQ03_AI_SERVICE_API_KEY = process.env.IQ03_AI_SERVICE_API_KEY;

/**
 * Calls AI service to extract engine documents (SVR, EDS, IQ03) data.
 */
const analyzeEngineDocumentPdf = async ({ fileName, buffer, docType }) => {
  let endpoint;
  let apiKey;

  if (docType === 'EDS') {
    endpoint = EDS_AI_SERVICE_URL;
    apiKey = EDS_AI_SERVICE_API_KEY;
  } else if (docType === 'IQ03') {
    endpoint = IQ03_AI_SERVICE_URL;
    apiKey = IQ03_AI_SERVICE_API_KEY;
  } else {
    endpoint = SVR_AI_SERVICE_URL;
    apiKey = SVR_AI_SERVICE_API_KEY;
  }

  console.log(`[Engine Doc AI Client] Sending ${docType} PDF to AI Service: ${endpoint}`);

  try {
    const formData = new FormData();
    formData.append('files', buffer, { filename: fileName || 'svr-document.pdf', contentType: 'application/pdf' });

    const headers = { 
      ...formData.getHeaders(),
      'Content-Length': formData.getLengthSync(),
      'ngrok-skip-browser-warning': 'true'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await axios.post(endpoint, formData, {
      headers,
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      httpsAgent
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
    const errorMsg = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` : error.message;
    console.error('[SVR AI Client] ❌ SVR AI service connection failed:', errorMsg);
    throw new Error(`SVR extraction failed: ${errorMsg}`);
  }
};

module.exports = {
  analyzeEngineDocumentPdf
};
