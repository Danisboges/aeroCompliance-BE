const jwt = require('jsonwebtoken');

// Definisikan Role agar bisa dibaca oleh middleware di bawahnya
const Role = {
  ADMIN: 'ADMIN',
  TECHNICIAN: 'TECHNICIAN'
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Access Denied: No Authorization header provided' });
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Access Denied: Invalid Authorization header format' });
  }

  const token = parts[1];

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to authorize roles (RBAC) - Khusus Admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User info not found' });
  }

  if (req.user.role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};

// --- MIDDLEWARE KHUSUS TECHNICIAN ---
const requireTechnician = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User info not found' });
  }

  if (req.user.role !== Role.TECHNICIAN) {
    return res.status(403).json({ message: 'Forbidden: Technician access required' });
  }

  next();
};

// Middleware role dinamis untuk route yang membutuhkan satu atau lebih role.
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User info not found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role permission' });
    }

    next();
  };
};

// Export semua fungsi menggunakan format CommonJS
module.exports = {
  verifyToken,
  requireAdmin,
  requireTechnician,
  requireRole
};
