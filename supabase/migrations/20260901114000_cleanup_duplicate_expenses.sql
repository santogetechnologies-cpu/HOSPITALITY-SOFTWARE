-- Clean up duplicate inventory expenses created by previous loop
-- Retains only the earliest unique expense per description & amount

delete from public.expenses
where id in (
    select id from (
        select id,
               row_number() over (partition by description, amount order by created_at asc) as rn
        from public.expenses
        where category = 'Inventory / Supplies'
    ) sub
    where rn > 1
);
