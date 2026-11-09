const { PrismaClient, OpportunityCategory, EmploymentType } = require("@prisma/client");

const prisma = new PrismaClient();

function mapEmploymentType(value) {
  if (!value) return null;

  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");

  const mappings = {
    "full time": EmploymentType.FULL_TIME,
    "part time": EmploymentType.PART_TIME,
    "contract": EmploymentType.CONTRACT,
    "temporary": EmploymentType.TEMPORARY,
    "freelance": EmploymentType.FREELANCE,
    "internship": EmploymentType.INTERNSHIP,
  };

  return mappings[normalized] || null;
}

async function migrateInternships() {
  console.log("Starting internship-to-opportunity migration...");

  const result = await prisma.$transaction(async (tx) => {
    const internships = await tx.internship.findMany({
      orderBy: { createdAt: "asc" },
    });

    let createdOpportunities = 0;
    let alreadyExistingOpportunities = 0;
    let linkedApplications = 0;

    for (const internship of internships) {
      // Confirm the original company still exists.
      const company = await tx.company.findUnique({
        where: { id: internship.companyId },
        select: { id: true },
      });

      if (!company) {
        throw new Error(
          `Company not found for internship ${internship.id}. Migration stopped.`
        );
      }

      // Check whether this opportunity was already migrated.
      const existingOpportunity = await tx.opportunity.findUnique({
        where: { id: internship.id },
      });

      if (existingOpportunity) {
        if (
          existingOpportunity.category !== OpportunityCategory.INTERNSHIP ||
          existingOpportunity.companyId !== internship.companyId
        ) {
          throw new Error(
            `Existing opportunity ${internship.id} does not match its legacy internship. Migration stopped.`
          );
        }

        alreadyExistingOpportunities++;
      } else {
        await tx.opportunity.create({
          data: {
            id: internship.id,
            title: internship.title,
            description: internship.description,
            category: OpportunityCategory.INTERNSHIP,
            employmentType: mapEmploymentType(internship.internshipType),
            location: internship.location,
            isRemote: internship.isRemote,
            compensation: internship.stipend,
            duration: internship.duration,
            requirements: internship.requirements,
            applicationUrl: internship.applicationUrl,
            deadline: internship.deadline,
            isActive: internship.isActive,
            companyId: internship.companyId,
            createdAt: internship.createdAt,
            updatedAt: internship.updatedAt,
          },
        });

        createdOpportunities++;
      }

      // Link existing applications to the new opportunity.
      const updateResult = await tx.application.updateMany({
        where: {
          internshipId: internship.id,
          opportunityId: null,
        },
        data: {
          opportunityId: internship.id,
        },
      });

      linkedApplications += updateResult.count;

      // Verify that no application points to a different opportunity.
      const incorrectlyLinked = await tx.application.count({
        where: {
          internshipId: internship.id,
          opportunityId: { not: internship.id },
        },
      });

      if (incorrectlyLinked > 0) {
        throw new Error(
          `Found ${incorrectlyLinked} incorrectly linked applications for internship ${internship.id}. Migration stopped.`
        );
      }
    }

    // Final verification inside the transaction.
    const totalInternships = await tx.internship.count();
    const totalOpportunities = await tx.opportunity.count();

    const totalApplications = await tx.application.count();
    const linkedApplicationsCount = await tx.application.count({
      where: {
        opportunityId: { not: null },
      },
    });

    const unlinkedLegacyApplications = await tx.application.count({
      where: {
        opportunityId: null,
      },
    });

    if (totalOpportunities < totalInternships) {
      throw new Error(
        "Opportunity count is lower than internship count. Migration stopped."
      );
    }

    if (unlinkedLegacyApplications > 0) {
      throw new Error(
        `${unlinkedLegacyApplications} applications are still unlinked. Migration stopped.`
      );
    }

    return {
      totalInternships,
      totalOpportunities,
      createdOpportunities,
      alreadyExistingOpportunities,
      totalApplications,
      linkedApplicationsCount,
      linkedApplications,
    };
  });

  console.log("\nMigration completed successfully!");
  console.log("-----------------------------------");
  console.log(`Original internships: ${result.totalInternships}`);
  console.log(`Total opportunities: ${result.totalOpportunities}`);
  console.log(`New opportunities created: ${result.createdOpportunities}`);
  console.log(
    `Already-existing opportunities: ${result.alreadyExistingOpportunities}`
  );
  console.log(`Total applications: ${result.totalApplications}`);
  console.log(
    `Applications linked to opportunities: ${result.linkedApplicationsCount}`
  );
  console.log(`Applications linked during this run: ${result.linkedApplications}`);
  console.log("-----------------------------------");
}

migrateInternships()
  .catch((error) => {
    console.error("\nMigration failed. Transaction rolled back.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });