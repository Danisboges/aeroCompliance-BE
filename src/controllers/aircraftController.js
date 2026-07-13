const prisma = require('../db');

const getAllAircraft = async (req, res) => {
  try {
    const aircraft = await prisma.aircraft.findMany({
      where: { active: true },
      orderBy: { aircraftType: 'asc' }
    });
    return res.status(200).json({
      message: 'Aircraft retrieved successfully',
      data: aircraft
    });
  } catch (error) {
    console.error('Error fetching aircraft:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getAllAircraft };
