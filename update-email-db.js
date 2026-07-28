require('dotenv').config();
const prisma = require('./src/db');

async function main() {
  const users = await prisma.user.findMany();
  
  const relevantUsers = users.filter(u => ['SECOND_ENGINEER', 'ENGINEER', 'MANAGER'].includes(u.role));
  
  if (relevantUsers.length > 0) {
    const targetUser = relevantUsers.find(u => u.role === 'SECOND_ENGINEER') || relevantUsers[0];
    
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { email: 'm.daniswara.m@gmail.com' }
    });
    console.log(`SUKSES: Email user "${targetUser.username}" (Role: ${targetUser.role}) telah diubah menjadi m.daniswara.m@gmail.com`);
  } else {
    console.log("GAGAL: Tidak ada user di database untuk diubah.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
