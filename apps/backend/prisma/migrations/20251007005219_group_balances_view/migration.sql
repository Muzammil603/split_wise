CREATE OR REPLACE VIEW group_balances_view AS
WITH owed AS (
  SELECT e."groupId" AS group_id, es."userId" AS user_id, SUM(es."amountCents") AS owed_cents
  FROM "Expense" e JOIN "ExpenseSplit" es ON es."expenseId" = e.id
  GROUP BY e."groupId", es."userId"
),
paid AS (
  SELECT "groupId" AS group_id, "paidById" AS user_id, SUM("amountCents") AS paid_cents
  FROM "Expense" GROUP BY "groupId", "paidById"
),
settle_out AS (
  SELECT "groupId" AS group_id, "fromUserId" AS user_id, SUM("amountCents") AS out_cents
  FROM "Settlement" GROUP BY "groupId", "fromUserId"
),
settle_in AS (
  SELECT "groupId" AS group_id, "toUserId" AS user_id, SUM("amountCents") AS in_cents
  FROM "Settlement" GROUP BY "groupId", "toUserId"
)
SELECT gm."groupId" AS group_id,
       gm."userId"  AS user_id,
       COALESCE(paid_cents,0)-COALESCE(owed_cents,0)+COALESCE(in_cents,0)-COALESCE(out_cents,0) AS balance_cents
FROM "GroupMember" gm
LEFT JOIN owed o ON o.group_id=gm."groupId" AND o.user_id=gm."userId"
LEFT JOIN paid p ON p.group_id=gm."groupId" AND p.user_id=gm."userId"
LEFT JOIN settle_in si ON si.group_id=gm."groupId" AND si.user_id=gm."userId"
LEFT JOIN settle_out so ON so.group_id=gm."groupId" AND so.user_id=gm."userId";