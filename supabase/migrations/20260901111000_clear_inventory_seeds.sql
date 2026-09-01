-- Cleanup starter seeds from inventory tables
delete from public.inventory_transactions where item_id in (select id from public.inventory_items where id like 'inv-%');
delete from public.inventory_items where id like 'inv-%';
