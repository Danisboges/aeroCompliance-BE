const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

let transporter;

// Create test account for Ethereal Email if no real credentials are provided
const initializeTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('SMTP configuration loaded successfully.');
  } else {
    // Generate test Ethereal account
    console.log('No SMTP configuration found. Generating Ethereal test account...');
    let testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Ethereal test account ready.');
  }
};

// Initialize immediately
initializeTransporter().catch(console.error);

const sendApprovalRequestEmail = async (toEmail, documentNumber, assignedRole, url = '#', pdfBuffer = null) => {
  try {
    if (!transporter) await initializeTransporter();
    
    // Load HTML Template
    const templatePath = path.join(__dirname, '../templates/email-approval-request.html');
    let htmlContent = fs.existsSync(templatePath) 
      ? fs.readFileSync(templatePath, 'utf8') 
      : '<h3>Hello,</h3><p>You have been assigned as <strong>{{assignedRole}}</strong> to approve EES: <strong>{{documentNumber}}</strong>.</p><a href="{{url}}">Go to Dashboard</a>';

    htmlContent = htmlContent
      .replace(/\{\{assignedRole\}\}/g, assignedRole)
      .replace(/\{\{documentNumber\}\}/g, documentNumber)
      .replace(/\{\{url\}\}/g, url);

    const mailOptions = {
      from: '"ORBIT_GMF" <no-reply@gmf-aeroasia.co.id>',
      to: toEmail,
      subject: `[ACTION REQUIRED] Approval Needed for EES ${documentNumber}`,
      text: `Hello,\n\nYou have been assigned as ${assignedRole} to review and approve the Engine Evaluation Sheet (EES) document: ${documentNumber}.\n\nPlease review the document and provide your approval at: ${url}\n\nThank you,\nGMF AeroAsia System`,
      html: htmlContent
    };

    mailOptions.attachments = [
      {
        filename: 'Logo_GMF.png',
        path: path.resolve(process.cwd(), 'public/image/Logo_GMF.png'),
        cid: 'gmflogo' // same cid value as in the html img src
      }
    ];

    if (pdfBuffer) {
      mailOptions.attachments.push({
        filename: `Draft_EES_${documentNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("Email Request Message sent to: %s", toEmail);
    // Preview only available when sending through an Ethereal account
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log("Email Preview URL: %s", testUrl);
    }
  } catch (err) {
    console.error("Failed to send approval request email:", err.message);
  }
};

const sendApprovalRejectedEmail = async (toEmail, documentNumber, rejectReason, rejectedByRole, url = '#', pdfBuffer = null) => {
  try {
    if (!transporter) await initializeTransporter();
    
    const subjectText = `[REVISION REQUIRED] EES ${documentNumber} has been rejected/returned`;
    
    // Load HTML Template
    const templatePath = path.join(__dirname, '../templates/email-approval-rejected.html');
    let htmlContent = fs.existsSync(templatePath) 
      ? fs.readFileSync(templatePath, 'utf8') 
      : '<h3>Hello,</h3><p>EES <strong>{{documentNumber}}</strong> rejected by <strong>{{rejectedByRole}}</strong>.</p><p>Reason: {{rejectReason}}</p><a href="{{url}}">Go to Dashboard</a>';

    htmlContent = htmlContent
      .replace(/\{\{documentNumber\}\}/g, documentNumber)
      .replace(/\{\{rejectedByRole\}\}/g, rejectedByRole)
      .replace(/\{\{rejectReason\}\}/g, rejectReason)
      .replace(/\{\{url\}\}/g, url);

    const mailOptions = {
      from: '"ORBIT_GMF" <no-reply@gmf-aeroasia.co.id>',
      to: toEmail,
      subject: subjectText,
      text: `Hello,\n\nYour Engine Evaluation Sheet (EES) document ${documentNumber} has been rejected or returned by the ${rejectedByRole}.\n\nReason/Notes:\n${rejectReason}\n\nPlease review and submit a revision at: ${url}\n\nThank you,\nGMF AeroAsia System`,
      html: htmlContent
    };

    mailOptions.attachments = [
      {
        filename: 'Logo_GMF.png',
        path: path.resolve(process.cwd(), 'public/image/Logo_GMF.png'),
        cid: 'gmflogo'
      }
    ];

    if (pdfBuffer) {
      mailOptions.attachments.push({
        filename: `Rejected_EES_${documentNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("Email Reject Message sent to: %s", toEmail);
    // Preview only available when sending through an Ethereal account
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log("Email Preview URL: %s", testUrl);
    }
  } catch (err) {
    console.error("Failed to send approval rejected email:", err.message);
  }
};

module.exports = {
  sendApprovalRequestEmail,
  sendApprovalRejectedEmail
};
