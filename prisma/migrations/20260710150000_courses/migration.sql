-- Udemy-style video courses: a course has lessons grouped into sections,
-- members enrol, and each finished lesson is one lesson_progress row.

CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'beginner',
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "educator" TEXT,
    "summary" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_published_order_idx" ON "courses"("published", "order");
CREATE INDEX "lessons_courseId_order_idx" ON "lessons"("courseId", "order");
CREATE UNIQUE INDEX "enrollments_userId_courseId_key" ON "enrollments"("userId", "courseId");
CREATE INDEX "enrollments_userId_idx" ON "enrollments"("userId");
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");
CREATE INDEX "lesson_progress_userId_idx" ON "lesson_progress"("userId");

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: "Trading Basics". Every youtubeId below was resolved against YouTube's
-- oEmbed endpoint before being written here; titles and educators are the real
-- ones reported by YouTube, not paraphrases. Re-runnable via ON CONFLICT.
INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_trading_basics', 'trading-basics', 'Trading Basics',
   'Start here. A guided path from "what is a pip" to placing your first gold trade on MT5 — covering charts, risk, and the psychology that decides whether you keep your profits.',
   'beginner', 0, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "order") VALUES
  ('lsn_tb_01', 'crs_trading_basics', 'Foundations',        'Forex Trading for Beginners — the 30 minute guide', 'yhAA9bmo9FY', 'Accounting Guy',                  1),
  ('lsn_tb_02', 'crs_trading_basics', 'Foundations',        'Understanding Pips, Lots & Leverage',              'hocLuXtyvXA', 'FundedNext',                      2),
  ('lsn_tb_03', 'crs_trading_basics', 'Foundations',        'Leverage explained (lot sizes and pips)',          'GJ-Bjq1Xvks', 'The Moving Average',              3),
  ('lsn_tb_04', 'crs_trading_basics', 'Reading the Chart',  'How to read candlestick charts, fast',             'AOz1YPOKvEs', 'Wysetrade',                       4),
  ('lsn_tb_05', 'crs_trading_basics', 'Reading the Chart',  'The ultimate candlestick patterns course',         '_I1omSmy44Q', 'Rayner Teo',                      5),
  ('lsn_tb_06', 'crs_trading_basics', 'Reading the Chart',  'Support and resistance for beginners',             'nuVv0ZWUfs4', 'Rayner Teo',                      6),
  ('lsn_tb_07', 'crs_trading_basics', 'Reading the Chart',  'Master supply & demand trading',                   'NcuFFJ_wbeM', 'Trading Simplified',              7),
  ('lsn_tb_08', 'crs_trading_basics', 'Risk Management',    'Risk management & position sizing, in full',       '7f2bpEwiJCY', 'The Trading Geek',                8),
  ('lsn_tb_09', 'crs_trading_basics', 'Risk Management',    'Position sizing for beginners',                    'LedNZbXqP54', 'Koroush AK',                      9),
  ('lsn_tb_10', 'crs_trading_basics', 'Risk Management',    'How much should you risk per trade?',              'pSWzuugtQOY', 'Etienne Crete - Desire To TRADE', 10),
  ('lsn_tb_11', 'crs_trading_basics', 'Trading Psychology', 'A beginner''s guide to trading psychology',        'VGq1eQGH6P0', 'TC Trading',                      11),
  ('lsn_tb_12', 'crs_trading_basics', 'Trading Psychology', 'Master trading psychology in 28 minutes',          'pvYMm_CA9Zs', 'The Trading Geek',                12),
  ('lsn_tb_13', 'crs_trading_basics', 'Platform & Gold',    'Placing a trade on MetaTrader 5',                  '2k4TbQmez7g', 'MOBILE TRADING ACADEMY',          13),
  ('lsn_tb_14', 'crs_trading_basics', 'Platform & Gold',    'MT5 order types explained',                        'uyRdWsZc1p8', 'Mindfully Trading',               14),
  ('lsn_tb_15', 'crs_trading_basics', 'Platform & Gold',    'How to trade gold (XAUUSD) as a beginner',         'ZXZp7DTJw34', 'Ndemazeah Godlove',               15)
ON CONFLICT ("id") DO NOTHING;
