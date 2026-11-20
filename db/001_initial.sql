CREATE TABLE IF NOT EXISTS products (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  sku text NOT NULL UNIQUE,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  compare_at_price_cents integer CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents > 0),
  cost_cents integer NOT NULL CHECK (cost_cents >= 0),
  stock integer NOT NULL CHECK (stock >= 0),
  published boolean NOT NULL DEFAULT true,
  seo_title text,
  seo_description text,
  short_name text,
  category text NOT NULL DEFAULT 'Skincare',
  format text NOT NULL DEFAULT 'Essential',
  headline text NOT NULL DEFAULT '',
  ritual text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT 'oil-packshot',
  alt text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#efe6dc',
  detail_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  facts text NOT NULL DEFAULT '',
  quick_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ingredients text NOT NULL DEFAULT '',
  packaging text NOT NULL DEFAULT '',
  builder_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price_cents integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_name text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Skincare';
ALTER TABLE products ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'Essential';
ALTER TABLE products ADD COLUMN IF NOT EXISTS headline text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS ritual text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image text NOT NULL DEFAULT 'oil-packshot';
ALTER TABLE products ADD COLUMN IF NOT EXISTS alt text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#efe6dc';
ALTER TABLE products ADD COLUMN IF NOT EXISTS detail_images jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS facts text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS quick_facts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS builder_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  domain text,
  home_seo_title text,
  home_seo_description text,
  facebook_pixel_id text,
  tiktok_pixel_id text,
  pinterest_pixel_id text,
  google_ads_id text,
  google_ads_label text,
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  free_shipping_threshold_cents integer CHECK (free_shipping_threshold_cents IS NULL OR free_shipping_threshold_cents >= 0),
  shipping_label text NOT NULL DEFAULT 'Standard Shipping',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  number text NOT NULL UNIQUE,
  email text NOT NULL,
  request_key uuid NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'test_paid', 'shipped', 'delivered', 'expired')),
  mode text NOT NULL CHECK (mode IN ('demo','stripe_test')),
  subtotal_cents integer,
  shipping_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL CHECK (total_cents > 0),
  stripe_session_id text UNIQUE,
  carrier text,
  tracking_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS order_items (
  order_id uuid NOT NULL REFERENCES orders(id),
  slug text NOT NULL REFERENCES products(slug),
  name text NOT NULL,
  sku text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  qty integer NOT NULL CHECK (qty BETWEEN 1 AND 99),
  PRIMARY KEY (order_id, slug)
);
CREATE TABLE IF NOT EXISTS provider_events (
  id text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY,
  number text NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL,
  order_number text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_subscriptions (
  email text PRIMARY KEY,
  consent_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  seo_title text,
  seo_description text,
  published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_title text;

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS orders_created_at ON orders(created_at DESC);
