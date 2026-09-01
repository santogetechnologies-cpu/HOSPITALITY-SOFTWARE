-- Remove strict foreign key constraint on expense_id to prevent transaction insertion failures
-- and ensure expense_id column is flexible text type
alter table public.inventory_transactions drop constraint if exists inventory_transactions_expense_id_fkey;
alter table public.inventory_transactions alter column expense_id type text using expense_id::text;
