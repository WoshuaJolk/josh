-- Add BANNED status to TpoUserStatus enum
ALTER TYPE "TpoUserStatus" ADD VALUE IF NOT EXISTS 'BANNED';
