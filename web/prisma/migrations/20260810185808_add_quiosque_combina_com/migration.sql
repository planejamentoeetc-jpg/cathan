-- AlterTable
ALTER TABLE "quiosques" ADD COLUMN     "combina_com_id" TEXT;

-- AddForeignKey
ALTER TABLE "quiosques" ADD CONSTRAINT "quiosques_combina_com_id_fkey" FOREIGN KEY ("combina_com_id") REFERENCES "quiosques"("id") ON DELETE SET NULL ON UPDATE CASCADE;
