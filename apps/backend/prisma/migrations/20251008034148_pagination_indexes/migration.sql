-- CreateIndex
CREATE INDEX "Expense_groupId_createdAt_id_idx" ON "Expense"("groupId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Group_createdAt_id_idx" ON "Group"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Settlement_groupId_createdAt_id_idx" ON "Settlement"("groupId", "createdAt", "id");
