-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "certifications" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "projects" JSONB NOT NULL DEFAULT '[]';
