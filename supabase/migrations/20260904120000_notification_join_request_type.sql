-- SportSphere: join-request notification event type
-- Added in a separate migration so the new enum value is committed
-- before triggers that insert it (PostgreSQL < 16 restriction).

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'join_request';
