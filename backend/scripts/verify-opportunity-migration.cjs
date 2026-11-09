const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function verifyMigration() {
  const internships = await prisma.internship.findMany({
    orderBy: { id: "asc" },
  });

  const applications = await prisma.application.findMany();

  let passed = 0;
  const errors = [];

  for (const internship of internships) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: internship.id },
    });

    if (!opportunity) {
      errors.push(`Missing opportunity: ${internship.id}`);
      continue;
    }

    const fieldsMatch =
      opportunity.title === internship.title &&
      opportunity.description === internship.description &&
      opportunity.location === internship.location &&
      opportunity.isRemote === internship.isRemote &&
      opportunity.compensation === internship.stipend &&
      opportunity.duration === internship.duration &&
      opportunity.requirements === internship.requirements &&
      opportunity.applicationUrl === internship.applicationUrl &&
      opportunity.deadline?.getTime() === internship.deadline?.getTime() &&
      opportunity.isActive === internship.isActive &&
      opportunity.companyId === internship.companyId;

    if (!fieldsMatch) {
      errors.push(`Field mismatch: ${internship.id}`);
      continue;
    }

    passed++;
  }

  const unlinkedApplications = applications.filter(
    (application) =>
      application.opportunityId !== application.internshipId
  );

  console.log("\nOPPORTUNITY MIGRATION VERIFICATION");
  console.log("-----------------------------------");
  console.log(`Original internships: ${internships.length}`);
  console.log(`Records verified: ${passed}`);
  console.log(`Total applications: ${applications.length}`);
  console.log(`Incorrectly linked applications: ${unlinkedApplications.length}`);

  if (errors.length || unlinkedApplications.length) {
    console.log("\nVERIFICATION FAILED");
    errors.forEach((error) => console.log(error));
    console.log(unlinkedApplications);
    process.exitCode = 1;
  } else {
    console.log("\nALL CHECKS PASSED!");
  }
}

verifyMigration()
  .catch((error) => {
    console.error("Verification error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });