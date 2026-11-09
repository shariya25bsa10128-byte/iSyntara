/*
  Warnings:

  - A unique constraint covering the columns `[userId,opportunityId]` on the table `applications` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('INTERNSHIP', 'FULL_TIME_JOB', 'PART_TIME_JOB', 'FREELANCE', 'CONTRACT', 'RESEARCH', 'TRAINING');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'FREELANCE', 'INTERNSHIP');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "opportunityId" TEXT;

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "OpportunityCategory" NOT NULL,
    "employmentType" "EmploymentType",
    "location" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "compensation" TEXT,
    "duration" TEXT,
    "requirements" TEXT,
    "applicationUrl" TEXT,
    "deadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunities_companyId_idx" ON "opportunities"("companyId");

-- CreateIndex
CREATE INDEX "opportunities_isActive_idx" ON "opportunities"("isActive");

-- CreateIndex
CREATE INDEX "opportunities_category_idx" ON "opportunities"("category");

-- CreateIndex
CREATE INDEX "opportunities_employmentType_idx" ON "opportunities"("employmentType");

-- CreateIndex
CREATE INDEX "opportunities_createdAt_idx" ON "opportunities"("createdAt");

-- CreateIndex
CREATE INDEX "applications_opportunityId_idx" ON "applications"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_userId_opportunityId_key" ON "applications"("userId", "opportunityId");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
