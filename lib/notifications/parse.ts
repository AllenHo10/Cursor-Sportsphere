import type {
  AppNotification,
  NotificationEventType,
} from "@/lib/types/notification";

const EVENT_TYPES: NotificationEventType[] = [
  "team_invite",
  "invite_accepted",
  "member_removed",
  "role_changed",
  "match_scheduled",
  "match_updated",
  "match_cancelled",
  "challenge_received",
  "challenge_accepted",
  "challenge_declined",
  "vote_reminder",
  "join_request",
  "general",
];

const MATCH_EVENT_TYPES = new Set<NotificationEventType>([
  "match_scheduled",
  "match_updated",
  "match_cancelled",
  "challenge_received",
  "challenge_accepted",
  "challenge_declined",
  "vote_reminder",
]);

const MANAGE_TEAM_EVENT_TYPES = new Set<NotificationEventType>([
  "join_request",
  "invite_accepted",
]);

const TEAM_EVENT_TYPES = new Set<NotificationEventType>([
  "team_invite",
  "member_removed",
  "role_changed",
  "join_request",
  "invite_accepted",
]);

const EVENT_LABELS: Record<NotificationEventType, string> = {
  team_invite: "Team invite",
  invite_accepted: "Invite accepted",
  member_removed: "Removed from team",
  role_changed: "Role updated",
  match_scheduled: "Match reminder",
  match_updated: "Schedule change",
  match_cancelled: "Match cancelled",
  challenge_received: "Challenge",
  challenge_accepted: "Challenge accepted",
  challenge_declined: "Challenge declined",
  vote_reminder: "Voting request",
  join_request: "Join request",
  general: "Notification",
};

function asEventType(value: unknown): NotificationEventType {
  if (typeof value === "string" && EVENT_TYPES.includes(value as NotificationEventType)) {
    return value as NotificationEventType;
  }
  return "general";
}

export function parseNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    recipient_id: row.recipient_id as string,
    event_type: asEventType(row.event_type),
    message: row.message as string,
    related_record_id: (row.related_record_id as string | null) ?? null,
    read_status: Boolean(row.read_status),
    created_at: row.created_at as string,
  };
}

export function getNotificationLabel(eventType: NotificationEventType) {
  return EVENT_LABELS[eventType];
}

export function getNotificationHref(notification: AppNotification) {
  const relatedId = notification.related_record_id;
  if (!relatedId) return "/dashboard";

  if (MANAGE_TEAM_EVENT_TYPES.has(notification.event_type)) {
    return `/teams/${relatedId}/manage`;
  }

  if (TEAM_EVENT_TYPES.has(notification.event_type) || notification.event_type === "general") {
    return `/teams/${relatedId}`;
  }

  if (MATCH_EVENT_TYPES.has(notification.event_type)) {
    return `/matches/${relatedId}`;
  }

  return "/dashboard";
}

export function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
