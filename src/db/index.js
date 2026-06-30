const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Create connection pool
const pool = new Pool({ connectionString });

// Instantiate Prisma Pg Adapter
const adapter = new PrismaPg(pool);

// Instantiate Prisma Client with Adapter
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
