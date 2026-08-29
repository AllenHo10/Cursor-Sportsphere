-- SportSphere: notifications

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_type public.notification_event_type NOT NULL,
  message text NOT NULL,
  related_record_id uuid,
  read_status boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_idx
  ON public.notifications (recipient_id, read_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id uuid,
  p_event_type public.notification_event_type,
  p_message text,
  p_related_record_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (recipient_id, event_type, message, related_record_id)
  VALUES (p_recipient_id, p_event_type, p_message, p_related_record_id)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated, service_role;
