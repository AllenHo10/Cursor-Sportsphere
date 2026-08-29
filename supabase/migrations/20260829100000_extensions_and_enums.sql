-- SportSphere: extensions and enum types

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'open');
CREATE TYPE public.team_type AS ENUM ('recreational', 'competitive', 'league', 'pickup');
CREATE TYPE public.team_member_role AS ENUM ('player', 'captain', 'co_captain');
CREATE TYPE public.team_member_status AS ENUM ('pending', 'invited', 'active', 'removed');
CREATE TYPE public.match_status AS ENUM ('draft', 'challenge_pending', 'scheduled', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.vote_response AS ENUM ('yes', 'maybe', 'no');
CREATE TYPE public.notification_event_type AS ENUM (
  'team_invite',
  'invite_accepted',
  'member_removed',
  'role_changed',
  'match_scheduled',
  'match_updated',
  'match_cancelled',
  'challenge_received',
  'challenge_accepted',
  'challenge_declined',
  'vote_reminder',
  'general'
);
