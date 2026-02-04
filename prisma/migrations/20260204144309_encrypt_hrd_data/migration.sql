/*
  Warnings:

  - You are about to drop the column `content` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ChatRoom` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `HRDocument` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `HRDocument` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `HRDocument` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `HRDocument` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `SalaryComponent` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SalaryComponent` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `mou` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `mou` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `mou` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `mou` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `mou` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `mou` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `offerletter` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `offerletter` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `offerletter` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `offerletter` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `offerletter` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `offerletter` table. All the data in the column will be lost.
  - You are about to drop the column `adminNote` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `attachment` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `job` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `requesterName` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `overtimeleave` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `receipt` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `receipt` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `receipt` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `receipt` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `receipt` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `receipt` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `replyletter` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `replyletter` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `replyletter` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `replyletter` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `replyletter` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `replyletter` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[typeHash,nameEnc]` on the table `SalaryComponent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[emailHash]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[usernameHash]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contentEnc` to the `Announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEnc` to the `HRDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEnc` to the `SalaryComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeEnc` to the `SalaryComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeHash` to the `SalaryComponent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentEnc` to the `mou` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionEnc` to the `mou` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEnc` to the `mou` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberEnc` to the `mou` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentEnc` to the `offerletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionEnc` to the `offerletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEnc` to the `offerletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberEnc` to the `offerletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdAtEnc` to the `overtimeleave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateEnc` to the `overtimeleave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reasonEnc` to the `overtimeleave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusEnc` to the `overtimeleave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeEnc` to the `overtimeleave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAtEnc` to the `overtimeleave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentEnc` to the `receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionEnc` to the `receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEnc` to the `receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberEnc` to the `receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentEnc` to the `replyletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionEnc` to the `replyletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEnc` to the `replyletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberEnc` to the `replyletter` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `SalaryComponent_name_type_key` ON `SalaryComponent`;

-- DropIndex
DROP INDEX `User_email_key` ON `User`;

-- DropIndex
DROP INDEX `User_username_key` ON `User`;

-- AlterTable
ALTER TABLE `Announcement` DROP COLUMN `content`,
    ADD COLUMN `contentEnc` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `ChatMessage` DROP COLUMN `content`,
    ADD COLUMN `contentEnc` TEXT NULL;

-- AlterTable
ALTER TABLE `ChatRoom` DROP COLUMN `name`,
    ADD COLUMN `nameEnc` TEXT NULL;

-- AlterTable
ALTER TABLE `HRDocument` DROP COLUMN `description`,
    DROP COLUMN `filePath`,
    DROP COLUMN `link`,
    DROP COLUMN `name`,
    ADD COLUMN `descriptionEnc` TEXT NULL,
    ADD COLUMN `filePathEnc` TEXT NULL,
    ADD COLUMN `linkEnc` TEXT NULL,
    ADD COLUMN `nameEnc` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `SalaryComponent` DROP COLUMN `name`,
    DROP COLUMN `type`,
    ADD COLUMN `nameEnc` TEXT NOT NULL,
    ADD COLUMN `typeEnc` TEXT NOT NULL,
    ADD COLUMN `typeHash` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `email`,
    DROP COLUMN `role`,
    DROP COLUMN `username`,
    ADD COLUMN `emailEnc` TEXT NULL,
    ADD COLUMN `emailHash` VARCHAR(191) NULL,
    ADD COLUMN `roleEnc` TEXT NULL,
    ADD COLUMN `usernameEnc` TEXT NULL,
    ADD COLUMN `usernameHash` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `mou` DROP COLUMN `content`,
    DROP COLUMN `filePath`,
    DROP COLUMN `institution`,
    DROP COLUMN `link`,
    DROP COLUMN `name`,
    DROP COLUMN `number`,
    ADD COLUMN `contentEnc` TEXT NOT NULL,
    ADD COLUMN `filePathEnc` TEXT NULL,
    ADD COLUMN `institutionEnc` TEXT NOT NULL,
    ADD COLUMN `linkEnc` TEXT NULL,
    ADD COLUMN `nameEnc` TEXT NOT NULL,
    ADD COLUMN `numberEnc` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `offerletter` DROP COLUMN `content`,
    DROP COLUMN `filePath`,
    DROP COLUMN `institution`,
    DROP COLUMN `link`,
    DROP COLUMN `name`,
    DROP COLUMN `number`,
    ADD COLUMN `contentEnc` TEXT NOT NULL,
    ADD COLUMN `filePathEnc` TEXT NULL,
    ADD COLUMN `institutionEnc` TEXT NOT NULL,
    ADD COLUMN `linkEnc` TEXT NULL,
    ADD COLUMN `nameEnc` TEXT NOT NULL,
    ADD COLUMN `numberEnc` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `overtimeleave` DROP COLUMN `adminNote`,
    DROP COLUMN `amount`,
    DROP COLUMN `attachment`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `date`,
    DROP COLUMN `job`,
    DROP COLUMN `reason`,
    DROP COLUMN `requesterName`,
    DROP COLUMN `status`,
    DROP COLUMN `type`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `adminNoteEnc` TEXT NULL,
    ADD COLUMN `amountEnc` TEXT NULL,
    ADD COLUMN `attachmentEnc` TEXT NULL,
    ADD COLUMN `createdAtEnc` TEXT NOT NULL,
    ADD COLUMN `dateEnc` TEXT NOT NULL,
    ADD COLUMN `jobEnc` TEXT NULL,
    ADD COLUMN `reasonEnc` TEXT NOT NULL,
    ADD COLUMN `requesterNameEnc` TEXT NULL,
    ADD COLUMN `statusEnc` TEXT NOT NULL,
    ADD COLUMN `typeEnc` TEXT NOT NULL,
    ADD COLUMN `updatedAtEnc` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `receipt` DROP COLUMN `content`,
    DROP COLUMN `filePath`,
    DROP COLUMN `institution`,
    DROP COLUMN `link`,
    DROP COLUMN `name`,
    DROP COLUMN `number`,
    ADD COLUMN `contentEnc` TEXT NOT NULL,
    ADD COLUMN `filePathEnc` TEXT NULL,
    ADD COLUMN `institutionEnc` TEXT NOT NULL,
    ADD COLUMN `linkEnc` TEXT NULL,
    ADD COLUMN `nameEnc` TEXT NOT NULL,
    ADD COLUMN `numberEnc` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `replyletter` DROP COLUMN `content`,
    DROP COLUMN `filePath`,
    DROP COLUMN `institution`,
    DROP COLUMN `link`,
    DROP COLUMN `name`,
    DROP COLUMN `number`,
    ADD COLUMN `contentEnc` TEXT NOT NULL,
    ADD COLUMN `filePathEnc` TEXT NULL,
    ADD COLUMN `institutionEnc` TEXT NOT NULL,
    ADD COLUMN `linkEnc` TEXT NULL,
    ADD COLUMN `nameEnc` TEXT NOT NULL,
    ADD COLUMN `numberEnc` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `invitationletter` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `contentEnc` TEXT NOT NULL,
    `filePathEnc` TEXT NULL,
    `institutionEnc` TEXT NOT NULL,
    `linkEnc` TEXT NULL,
    `nameEnc` TEXT NOT NULL,
    `numberEnc` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `SalaryComponent_typeHash_nameEnc_key` ON `SalaryComponent`(`typeHash`, `nameEnc`(100));

-- CreateIndex
CREATE UNIQUE INDEX `User_emailHash_key` ON `User`(`emailHash`);

-- CreateIndex
CREATE UNIQUE INDEX `User_usernameHash_key` ON `User`(`usernameHash`);
