ALTER TABLE public.inventory_batches DROP CONSTRAINT IF EXISTS fk_inventory_batches_product;
ALTER TABLE public.inventory_batches DROP CONSTRAINT IF EXISTS fk_inventory_batches_store;
ALTER TABLE public.inventory_batches DROP CONSTRAINT IF EXISTS fk_inventory_batches_po_line;

ALTER TABLE public.po_lines DROP CONSTRAINT IF EXISTS fk_po_lines_product;
ALTER TABLE public.po_lines DROP CONSTRAINT IF EXISTS fk_po_lines_po;

ALTER TABLE public.pick_request_lines DROP CONSTRAINT IF EXISTS fk_pick_request_lines_pick;
ALTER TABLE public.pick_request_lines DROP CONSTRAINT IF EXISTS fk_pick_request_lines_batch;

ALTER TABLE public.pick_exceptions DROP CONSTRAINT IF EXISTS fk_pick_exceptions_batch;
ALTER TABLE public.pick_exceptions DROP CONSTRAINT IF EXISTS fk_pick_exceptions_pick;

ALTER TABLE public.stock_transfers DROP CONSTRAINT IF EXISTS fk_stock_transfers_batch;
ALTER TABLE public.stock_transfers DROP CONSTRAINT IF EXISTS fk_stock_transfers_from_store;
ALTER TABLE public.stock_transfers DROP CONSTRAINT IF EXISTS fk_stock_transfers_to_store;

ALTER TABLE public.qc_inspections DROP CONSTRAINT IF EXISTS fk_qc_inspections_batch;

ALTER TABLE public.markdown_proposals DROP CONSTRAINT IF EXISTS fk_markdown_proposals_batch;