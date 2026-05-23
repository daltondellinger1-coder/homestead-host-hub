DELETE FROM webhook_payload_log WHERE related_request_id = '9cfcbfa1-0eba-40f4-a5ac-21fdcadf1c64';
DELETE FROM maintenance_updates WHERE request_id = '9cfcbfa1-0eba-40f4-a5ac-21fdcadf1c64';
DELETE FROM maintenance_requests WHERE id = '9cfcbfa1-0eba-40f4-a5ac-21fdcadf1c64' AND title ILIKE '%AUTOMATION TEST ONLY%';