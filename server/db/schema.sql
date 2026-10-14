-- Demo database for Open Hearth. Dev passwords are intentional and local-only.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE OR REPLACE FUNCTION payout_scale(birth_order integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN birth_order <= 1 THEN 5000
    WHEN birth_order = 2 THEN 6500
    WHEN birth_order = 3 THEN 7000
    ELSE 7500
  END;
$$;

CREATE TABLE churches (
  id text PRIMARY KEY,
  name_ru text NOT NULL,
  name_en text NOT NULL,
  name_hy text NOT NULL,
  city_ru text NOT NULL,
  city_en text NOT NULL,
  city_hy text NOT NULL,
  country char(2) NOT NULL,
  tradition text NOT NULL CHECK (tradition IN ('evangelical', 'baptist', 'apostolic', 'pentecostal')),
  registered_year integer NOT NULL
);

CREATE TABLE pastors (
  id text PRIMARY KEY,
  church_id text NOT NULL REFERENCES churches (id),
  name text NOT NULL,
  serving_since integer NOT NULL
);

CREATE TABLE donations (
  id text PRIMARY KEY,
  donated_on date NOT NULL,
  method text NOT NULL CHECK (method IN ('bank', 'card', 'btc', 'eth', 'usdt')),
  amount_usd integer NOT NULL CHECK (amount_usd > 0),
  donor_label text NOT NULL,
  external_ref text NOT NULL,
  recurring boolean NOT NULL
);

CREATE TABLE expenses (
  id text PRIMARY KEY,
  spent_on date NOT NULL,
  category text NOT NULL CHECK (category IN ('legal', 'accounting', 'audit', 'hosting', 'payment_fees', 'salary')),
  amount_usd integer NOT NULL CHECK (amount_usd > 0),
  vendor text NOT NULL,
  receipt_preimage text NOT NULL
);

CREATE TABLE rounds (
  id text PRIMARY KEY,
  draw_date date NOT NULL,
  paid_at date NOT NULL,
  entropy_source text NOT NULL,
  entropy_value text NOT NULL,
  entropy_note text NOT NULL
);

CREATE TABLE applications (
  id text PRIMARY KEY,
  family_code text NOT NULL,
  church_id text NOT NULL REFERENCES churches (id),
  pastor_id text NOT NULL REFERENCES pastors (id),
  membership_years integer NOT NULL CHECK (membership_years >= 0),
  birth_order integer NOT NULL CHECK (birth_order >= 1),
  child_birth_month text NOT NULL CHECK (child_birth_month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount_usd integer NOT NULL CHECK (amount_usd = payout_scale(birth_order)),
  hardship boolean NOT NULL,
  hardship_category text,
  countersign_pastor_id text REFERENCES pastors (id),
  submitted_at date NOT NULL,
  approved_at date,
  marriage_year integer NOT NULL,
  marriage_registered boolean NOT NULL,
  lane text NOT NULL CHECK (lane IN ('fifo_paid', 'historical', 'live', 'review', 'notice', 'rejected')),
  paid_at date,
  rejection_code text,
  notice_until date,
  round_id text REFERENCES rounds (id),
  CHECK (
    (hardship = false AND hardship_category IS NULL AND countersign_pastor_id IS NULL)
    OR (hardship = true AND hardship_category IN ('medical', 'housing', 'income') AND countersign_pastor_id IS NOT NULL AND countersign_pastor_id <> pastor_id)
  ),
  CHECK (lane NOT IN ('fifo_paid', 'historical', 'live') OR (membership_years >= 1 AND approved_at IS NOT NULL AND marriage_registered)),
  CHECK (lane <> 'fifo_paid' OR paid_at IS NOT NULL),
  CHECK (lane <> 'rejected' OR rejection_code IS NOT NULL),
  CHECK (lane <> 'notice' OR notice_until IS NOT NULL),
  CHECK (lane <> 'historical' OR round_id IS NOT NULL)
);

-- Child-record hashes. The public website role must not be able to read this table.
CREATE TABLE application_private (
  application_id text PRIMARY KEY REFERENCES applications (id),
  child_record_hash text NOT NULL UNIQUE
);

CREATE TABLE publication (
  id text PRIMARY KEY CHECK (id = 'current'),
  as_of date NOT NULL,
  preview_round_id text NOT NULL,
  preview_draw_date date NOT NULL
);

CREATE INDEX applications_lane_idx ON applications (lane);
CREATE INDEX applications_round_idx ON applications (round_id);

COMMENT ON TABLE applications IS 'Public application facts. Names, addresses, and document numbers are not stored here.';
COMMENT ON TABLE application_private IS 'Private child-record hashes. Granted to no public role.';
COMMENT ON FUNCTION payout_scale IS 'Published grant scale in whole US dollars.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hearth_public') THEN
    CREATE ROLE hearth_public LOGIN PASSWORD 'public_read_dev';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO hearth_public;
GRANT SELECT ON churches, pastors, donations, expenses, rounds, applications, publication TO hearth_public;
REVOKE ALL ON application_private FROM PUBLIC;
REVOKE ALL ON application_private FROM hearth_public;
