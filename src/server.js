require('dotenv').config();
const express = require('express');
const fileStorageService = require('./services/fileStorageService');
const eesRoutes = require('./routes/eesRoutes');
const authRoutes = require('./routes/authRoutes');
const ocrDocumentRoutes = require('./routes/ocrDocumentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
// Menambahkan variabel HOST untuk localhost
const HOST = process.env.HOST || 'localhost'; 

// Body parser middleware
app.use(express.json());
app.use('/storage/ocr-documents', express.static(fileStorageService.STORAGE_ROOT));

// Routes
app.use('/api', eesRoutes);
app.use('/api', authRoutes);
app.use('/api', ocrDocumentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'EES Backend Server is running' });
});

// Default root route
app.get('/', (req, res) => {
  res.send('Welcome to the EES Webhook Backend System');
});

// Start the server dengan menambahkan parameter HOST
app.listen(PORT, HOST, () => {
  console.log(`Server is running and listening at http://${HOST}:${PORT}`);
});
