DELETE FROM public.maintenance_updates WHERE request_id = 'b1efbe90-fdfd-4ed9-937a-5f4f6cc97d7c';
DELETE FROM public.webhook_payload_log WHERE related_request_id = 'b1efbe90-fdfd-4ed9-937a-5f4f6cc97d7c';
DELETE FROM public.maintenance_requests WHERE id = 'b1efbe90-fdfd-4ed9-937a-5f4f6cc97d7c' AND description LIKE 'AUTOMATION TEST ONLY from Hermes%';