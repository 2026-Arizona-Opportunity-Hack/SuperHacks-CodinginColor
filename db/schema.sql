-- CIC Learn schema. Plain Postgres: runs on Supabase/Neon in production and on PGlite locally.
-- Content model: course → module → lesson → activity.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'instructor', 'reviewer')),
  organization  text NOT NULL DEFAULT 'Coding in Color',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only a SHA-256 hash of the session token is stored, so a database leak does not leak sessions.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position   int  NOT NULL,
  title      text NOT NULL,
  summary    text NOT NULL DEFAULT '',
  concepts   text[] NOT NULL DEFAULT '{}',
  published  boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  position  int  NOT NULL,
  title     text NOT NULL
);

-- kind: pretest | video | slides | check | worksheet | code | exit | posttest
-- content is JSON whose shape depends on kind (see src/lib/content.ts). Answer keys, code
-- solutions and hidden tests live in content too but are stripped before reaching a student.
CREATE TABLE IF NOT EXISTS activities (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position  int  NOT NULL,
  kind      text NOT NULL CHECK (kind IN ('pretest','video','slides','check','worksheet','code','exit','posttest')),
  title     text NOT NULL,
  concept   text NOT NULL DEFAULT '',
  content   jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS classes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  school        text NOT NULL DEFAULT '',
  cohort        text NOT NULL DEFAULT '',
  join_code     text NOT NULL UNIQUE,
  instructor_id uuid NOT NULL REFERENCES users(id),
  course_id     uuid NOT NULL REFERENCES courses(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_modules (
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  module_id   uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, module_id)
);

-- Students have no email or password (they are minors on shared lab machines).
-- A device cookie identifies them; a 6-character resume code moves them to another device.
CREATE TABLE IF NOT EXISTS students (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  roster_id    text NOT NULL DEFAULT '',
  resume_code  text NOT NULL,
  token_hash   text,
  claimed_at   timestamptz,
  last_active  timestamptz,
  xp           int NOT NULL DEFAULT 0,
  hide_from_leaderboard boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, resume_code)
);

CREATE TABLE IF NOT EXISTS progress (
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id  uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('started', 'completed')),
  score        numeric,           -- 0..100 for graded activities, null otherwise
  answer       jsonb,
  attempts     int NOT NULL DEFAULT 0,
  time_seconds int NOT NULL DEFAULT 0,
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (student_id, activity_id)
);

-- Modules a late joiner skipped by passing the placement check.
CREATE TABLE IF NOT EXISTS placements (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  module_id  uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  score      numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, module_id)
);

-- Struggle signals: failed runs, hint requests (with the hint shown, for teacher review), passes.
CREATE TABLE IF NOT EXISTS struggle_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  concept     text NOT NULL DEFAULT '',
  kind        text NOT NULL CHECK (kind IN ('fail', 'hint', 'pass')),
  detail      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS struggle_events_student ON struggle_events (student_id, created_at);

CREATE TABLE IF NOT EXISTS hand_raises (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Read-API keys: only the SHA-256 hash is stored; the full key is shown once at creation.
CREATE TABLE IF NOT EXISTS api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  prefix       text NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  created_by   uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         bigserial PRIMARY KEY,
  actor      text NOT NULL,
  action     text NOT NULL,
  target     text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pair programming: two students in the same class share one editor (last write wins, polled).
CREATE TABLE IF NOT EXISTS pair_rooms (
  code        text PRIMARY KEY,
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  content     text NOT NULL DEFAULT '',
  version     int  NOT NULL DEFAULT 0,
  updated_by  uuid REFERENCES students(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
