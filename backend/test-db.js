
const prisma = require("./prisma");

async function main() {
  await prisma.$connect();

  console.log("✅ iSyntara database connected successfully!");

  const userCount = await prisma.user.count();

  console.log(`Total users: ${userCount}`);
}

main()
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
