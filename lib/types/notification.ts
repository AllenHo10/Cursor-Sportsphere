export type NotificationEventType =
  | "team_invite"
  | "invite_accepted"
  | "member_removed"
  | "role_changed"
  | "match_scheduled"
  | "match_updated"
  | "match_cancelled"
  | "challenge_received"
  | "challenge_accepted"
  | "challenge_declined"
  | "vote_reminder"
  | "join_request"
  | "general";

export interface AppNotification {
  id: string;
  recipient_id: string;
  event_type: NotificationEventType;
  message: string;
  related_record_id: string | null;
  read_status: boolean;
  created_at: string;
}
