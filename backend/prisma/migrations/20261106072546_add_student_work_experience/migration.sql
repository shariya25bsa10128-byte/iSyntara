-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "hasWorkExperience" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workExperience" JSONB NOT NULL DEFAULT '[]';
