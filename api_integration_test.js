/**
 * GMF AeroAsia AD/SB Monitoring API - Integration Test Script
 * 
 * Deskripsi:
 * File ini melakukan pengujian otomatis (End-to-End integration test) untuk seluruh
 * endpoint yang tercantum dalam swagger.json.
 * 
 * Prasyarat:
 * 1. Database harus sudah di-seed: `npx prisma db seed`
 * 2. Server backend harus sedang berjalan: `npm run dev`
 * 
 * Jalankan perintah ini di terminal baru:
 * `node api_integration_test.js`
 */

const BASE_URL = 'http://localhost:3000';

// ANSI console colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m"
};

function logStep(stepName, details = '') {
  console.log(`\n${colors.bold}${colors.cyan}--- [${stepName}] ---${colors.reset}`);
  if (details) console.log(`   ${details}`);
}

function logSuccess(message) {
  console.log(`   ${colors.green}✅ SUCCESS: ${message}${colors.reset}`);
}

function logFailure(message, error = null) {
  console.error(`   ${colors.red}❌ FAILED: ${message}${colors.reset}`);
  if (error) {
    console.error(`      Detail Error:`, error);
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.magenta}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}  GMF AD/SB COMPLIANCE API INTEGRATION TEST SANDBOX  ${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}====================================================${colors.reset}`);
  console.log(`Target URL: ${BASE_URL}\n`);

  let token = null;
  let uploadId = null;
  let draftId = null;
  const testEmail = `test_technician_${Math.floor(Math.random() * 10000)}@gmf.com`;
  const testPassword = 'password123';

  // ---------------------------------------------------------------------------
  // STEP 1: Register User
  // ---------------------------------------------------------------------------
  logStep('STEP 1: Register New Technician User', `POST /api/auth/register`);
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: testEmail.split('@')[0],
        password: testPassword,
        role: 'TECHNICIAN'
      })
    });
    
    const data = await res.json();
    if (res.status === 201) {
      logSuccess(`User registered: ${data.data.email} with Role: ${data.data.role}`);
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed to register user', err.message);
    return;
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Login User & Get Token
  // ---------------------------------------------------------------------------
  logStep('STEP 2: Login & Get JWT Token', `POST /api/auth/login`);
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    const data = await res.json();
    if (res.status === 200) {
      token = data.data.token;
      logSuccess(`Login successful. Token acquired (starts with: ${token.substring(0, 15)}...)`);
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed to login', err.message);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  // ---------------------------------------------------------------------------
  // STEP 3: Verify Role-based Authentication (RBAC)
  // ---------------------------------------------------------------------------
  logStep('STEP 3: Verify RBAC Role Access', `GET /api/technician-only & GET /api/admin-only`);
  try {
    // 3a. Access Technician endpoint (should succeed for Technician)
    const resTech = await fetch(`${BASE_URL}/api/technician-only`, {
      headers: authHeaders
    });
    const dataTech = await resTech.json();
    
    if (resTech.status === 200) {
      logSuccess(`Accessed /api/technician-only: ${dataTech.message}`);
    } else {
      logFailure(`Technician access endpoint returned status ${resTech.status}`);
    }

    // 3b. Access Admin endpoint (should be FORBIDDEN 403 for Technician)
    const resAdmin = await fetch(`${BASE_URL}/api/admin-only`, {
      headers: authHeaders
    });
    const dataAdmin = await resAdmin.json();
    
    if (resAdmin.status === 403) {
      logSuccess(`Correctly blocked from /api/admin-only: ${dataAdmin.message}`);
    } else {
      logFailure(`Technician should not have access to admin-only. Got status: ${resAdmin.status}`);
    }
  } catch (err) {
    logFailure('Failed to run RBAC checks', err.message);
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Upload PDF Document (Binary Stream)
  // ---------------------------------------------------------------------------
  logStep('STEP 4: Upload PDF Document (Binary Stream)', `POST /api/documents/ocr/pdf`);
  try {
    // Creating a mock tiny PDF header buffer for the stream upload
    const dummyPdfContent = Buffer.from('%PDF-1.4\n%mock_pdf_binary_content_gmf_aeroasia\n%%EOF');
    
    const res = await fetch(`${BASE_URL}/api/documents/ocr/pdf`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/pdf',
        'X-File-Name': 'RB211-73-AJ366-AI-TEST.pdf'
      },
      body: dummyPdfContent
    });

    const data = await res.json();
    if (res.status === 201) {
      uploadId = data.data.id;
      logSuccess(`PDF uploaded. storedFileName: ${data.data.storedFileName}, Assigned uploadId: ${uploadId}`);
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed to upload PDF', err.message);
    return;
  }

  // ---------------------------------------------------------------------------
  // STEP 5: Create OCR Draft (using the New AI format!)
  // ---------------------------------------------------------------------------
  logStep('STEP 5: Create OCR Draft (New AI Format)', `POST /api/ocr-drafts`);
  try {
    const testOcrPayload = {
      uploadId: uploadId,
      extractedPayload: {
        sb_code: "RB211-73-AJ366", 
        compliance_category: 4, 
        effected_type: "Trent 700 Series",
        tittle: "ENGINE - GENERAL (72-00-00) - INTRODUCTION OF NEW LPTACC",
        task_type: "non-mod",
        problem_evidence: [
          {
            requirement_desc: "The root technical issue is wear on Oil Tube",
            remark: "Not specified"
          }
        ],
        description: [
          {
            requirement_desc: "Insufficient minimum gap between the Oil Tube",
            remark: "This condition may result in a Delay and Cancellation"
          }
        ]
      }
    };

    const res = await fetch(`${BASE_URL}/api/ocr-drafts`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOcrPayload)
    });

    const data = await res.json();
    if (res.status === 201) {
      draftId = data.data.id;
      logSuccess(`OCR Draft created. Status: ${data.data.status}, Assigned draftId: ${draftId}`);
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed to create OCR Draft', err.message);
    return;
  }

  // ---------------------------------------------------------------------------
  // STEP 6: Update OCR Draft
  // ---------------------------------------------------------------------------
  logStep('STEP 6: Update OCR Draft', `PATCH /api/ocr-drafts/:id`);
  try {
    const res = await fetch(`${BASE_URL}/api/ocr-drafts/${draftId}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        validatedPayload: {
          sb_code: "RB211-73-AJ366",
          compliance_category: 4, 
          effected_type: "Trent 700 Series",
          tittle: "ENGINE - GENERAL (72-00-00) - INTRODUCTION OF NEW LPTACC",
          task_type: "non-mod",
          problem_evidence: [
            {
              requirement_desc: "The root technical issue is wear on Oil Tube (CORRECTED BY TECH)",
              remark: "Not specified"
            }
          ],
          description: [
            {
              requirement_desc: "Insufficient minimum gap between the Oil Tube",
              remark: "This condition may result in a Delay and Cancellation"
            }
          ]
        }
      })
    });

    const data = await res.json();
    if (res.status === 200) {
      logSuccess(`OCR Draft updated. New Status: ${data.data.status}`);
      if (!data.data.updatedById || !data.data.updatedBy) {
        throw new Error("Validation Error: updatedById or updatedBy relation is missing in response!");
      }
      logSuccess(`Verified last editor is tracked: updatedById = ${data.data.updatedById} (${data.data.updatedBy.username})`);
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed to update OCR Draft', err.message);
  }

  // ---------------------------------------------------------------------------
  // STEP 7: Validate OCR Draft
  // ---------------------------------------------------------------------------
  logStep('STEP 7: Validate OCR Draft', `POST /api/ocr-drafts/:id/validate`);
  try {
    const res = await fetch(`${BASE_URL}/api/ocr-drafts/${draftId}/validate`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // empty body triggers validation of existing rawPayload
    });

    const data = await res.json();
    if (res.status === 200) {
      logSuccess(`OCR Draft validated. New Status: ${data.data.status}`);
      if (!data.data.updatedById || !data.data.updatedBy) {
        throw new Error("Validation Error: updatedById or updatedBy relation is missing in response!");
      }
      logSuccess(`Verified validator is tracked: updatedById = ${data.data.updatedById} (${data.data.updatedBy.username})`);
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed to validate OCR Draft', err.message);
  }

  // ---------------------------------------------------------------------------
  // STEP 8: Generate EES Document from Draft
  // ---------------------------------------------------------------------------
  logStep('STEP 8: Generate EES Document from Draft', `POST /api/ocr-drafts/:id/generate-ees`);
  try {
    const res = await fetch(`${BASE_URL}/api/ocr-drafts/${draftId}/generate-ees`, {
      method: 'POST',
      headers: authHeaders
    });

    const data = await res.json();
    if (res.status === 201) {
      logSuccess(`EES successfully generated from draft.`);
      logSuccess(`Final Draft status: ${data.data.status}`);
      logSuccess(`Created EES Doc Number: ${data.data.sb.generatedEes.eesNumber}`);
      logSuccess(`Evaluations count created: ${data.data.sb.generatedEes.evaluations.length}`);
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed to generate EES Document', err.message);
  }

  // ---------------------------------------------------------------------------
  // STEP 9: Direct Webhook Test (No JWT auth required)
  // ---------------------------------------------------------------------------
  logStep('STEP 9: Direct EES Creation via Webhook (No JWT required)', `POST /api/webhooks/ees`);
  try {
    const webhookPayload = {
      sb_code: "RB211-73-AJ366",
      eesNumber: `EES-TEST-WH-${Math.floor(Math.random() * 100000)}`,
      compliance_category: 3, 
      tittle: "MANUAL REQUIRED SB",
      problem_evidence: [
        {
          requirement_desc: "This evidence should be IGNORED because category is 3",
          remark: "Should not appear in EES evaluations"
        }
      ]
    };

    const res = await fetch(`${BASE_URL}/api/webhooks/ees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });

    const data = await res.json();
    if (res.status === 201) {
      logSuccess('Webhook created EesDocument successfully.');
      logSuccess(`EES ID: ${data.data.id}, EES Number: ${data.data.eesNumber}`);
      
      if (data.data.evaluations.length !== 1) {
        logFailure('Expected 1 evaluations for category 3 (always populate AI data), but got: ' + data.data.evaluations.length);
      } else {
        logSuccess('SUCCESS: Verified 1 evaluation was created for category 3 (AI data is preserved).');
      }
    } else {
      throw new Error(`Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFailure('Failed EES Webhook integration test', err.message);
  }

  // ---------------------------------------------------------------------------
  // STEP 10: Cleanup (Delete OCR Draft & Document Upload)
  // ---------------------------------------------------------------------------
  logStep('STEP 10: Clean up test entries', `DELETE /api/ocr-drafts/:id & DELETE /api/documents/ocr/:id`);
  try {
    // 10a. Delete OCR Draft
    const resDraft = await fetch(`${BASE_URL}/api/ocr-drafts/${draftId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    if (resDraft.status === 200) {
      logSuccess(`Deleted test OCR draft ID: ${draftId}`);
    } else {
      logFailure(`Failed to delete draft. Status: ${resDraft.status}`);
    }

    // 10b. Delete Document Upload (removes file from server storage as well)
    const resDoc = await fetch(`${BASE_URL}/api/documents/ocr/${uploadId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    if (resDoc.status === 200) {
      logSuccess(`Deleted test document upload ID: ${uploadId}`);
    } else {
      logFailure(`Failed to delete document upload. Status: ${resDoc.status}`);
    }
  } catch (err) {
    logFailure('Failed cleaning up test records', err.message);
  }

  console.log(`\n${colors.bold}${colors.magenta}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}          ALL SANDBOX TESTS EXECUTED!               ${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}====================================================${colors.reset}`);
}

runTests();
