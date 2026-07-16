require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
// Import file JSON yang baru dibuat
const swaggerDocument = require('../swagger.json'); 

const path = require('path');
const fileStorageService = require('./services/fileStorageService');
const eesRoutes = require('./routes/eesRoutes');
const authRoutes = require('./routes/authRoutes');
const serviceBulletinRoutes = require('./routes/serviceBulletinRoutes');
const aircraftRoutes = require('./routes/aircraftRoutes');
const svrRoutes = require('./routes/svrRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; 

app.use(express.json());
app.use('/storage/ocr-documents', express.static(fileStorageService.STORAGE_ROOT));
app.use('/storage/ees-documents', express.static(fileStorageService.EES_STORAGE_ROOT));
app.use('/storage/svr-documents', express.static(path.resolve(__dirname, '../uploads/svr-documents')));

// Mount Swagger UI dengan file JSON
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api', eesRoutes);
app.use('/api', authRoutes);
app.use('/api', serviceBulletinRoutes); // EES Generator workflow (6-step)
app.use('/api', aircraftRoutes);
app.use('/api', svrRoutes);

// ... sisa kode server.js tetap sama
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`📑 Swagger Documentation available at http://${HOST}:${PORT}/api-docs`);
});