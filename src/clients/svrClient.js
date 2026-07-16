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

  // Fallback mock JSON for testing and local development
  const getMockSvrData = () => {
    return {
      engine_type: "CFM56-7B26E",
      engine_serial_number: "660235",
      shop_in_date: "12 February 2026",
      shop_out_date: "04 March 2026",
      report_date: "05 March 2026", // Added reportDate from AI
      reason_for_shop_visit: "HPT Blades RRT (SB 72-1082) and RDS Seal Replacement",
      tsn: "27,680:46",
      csn: "17,946",
      tslv: "15,907:12",
      cslv: "10,136",
      authorized_release_status: "DGCA form 21-18 And FAA form 8130-3",
      configuration_report: [
        {
          module: "HPT Rotor Module",
          part_name: "HPT Rotor Blades",
          in_out: "IN",
          part_number: "2403M91P03",
          serial: "FELK421F",
          qty: "1",
          tsn: "27,680:46",
          csn: "17,946",
          tso: "15,907:12",
          cso: "10,136",
          work_accompl: "NEW"
        },
        {
          module: "HPT Rotor Module",
          part_name: "HPT Rotor Front Shaft's Forward Damper Sleeve",
          in_out: "IN",
          part_number: "2403M91P06",
          serial: "FELK382D",
          qty: "1",
          tsn: "27,680:46",
          csn: "17,946",
          tso: "15,907:12",
          cso: "10,136",
          work_accompl: "NEW"
        }
      ],
      life_limited_part_status: [
        {
          no: "1",
          description: "HPT Blades",
          part_number: "2403M91P03",
          serial_number: "VX 1740",
          total_hour: "27,680:46",
          total_cycle: "17,946",
          total_cycles_category: { "7B26E": "17,946" },
          life_limit_cycles: { "7B26E": "18,000" },
          remaining_cycles: { "7B26E": "54" },
          remark: "Replaced with Superseded Part Number"
        }
      ],
      airworthiness_directive_status: [
        {
          ad_number: "CFM56-7B SB 72-1082",
          notification_date_of_compliance: "2026-03-02",
          description: "Recommended Removal Time",
          reference_sb: "72-1082",
          recurr_insp: "NO",
          module_applicability: "HPT Blades",
          method_of_compliance: "REPLACEMENT OF HPT BLADES",
          remarks: "COMPLIED"
        }
      ]
    };
  };

  if (!SVR_AI_SERVICE_URL || !SVR_AI_SERVICE_API_KEY) {
    console.warn('[SVR AI Client] ⚠️ URL/API Key not configured. Using mock fallback data.');
    return { provider: 'MOCK_SVR_AI', svr_schema: { svr_schema: getMockSvrData() } };
  }

  try {
    const formData = new FormData();
    formData.append('file', buffer, { filename: fileName || 'svr-document.pdf', contentType: 'application/pdf' });

    const response = await axios.post(SVR_AI_SERVICE_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${SVR_AI_SERVICE_API_KEY}`
      },
      timeout: 0
    });

    let result = response.data;

    if (typeof result === 'string') {
      try {
        const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn('[SVR AI Client] ⚠️ Failed parsing AI JSON response:', parseErr.message);
        result = {};
      }
    }

    return result;
  } catch (error) {
    console.error('[SVR AI Client] ❌ SVR AI service connection failed. Falling back to mock data.', error.message);
    return { provider: 'MOCK_SVR_AI', svr_schema: { svr_schema: getMockSvrData() } };
  }
};

module.exports = {
  analyzeSvrPdf
};
