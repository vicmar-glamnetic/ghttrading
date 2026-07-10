-- Seed: "Gold Trading" — a separate course from Trading Basics, aimed at the
-- instrument this community actually trades.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint, and every
-- durationSec was read from the video's own page. Educator names are exactly as
-- YouTube reports them. Nothing here is guessed.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_gold_trading', 'gold-trading', 'Gold Trading',
   'Gold moves differently to everything else. Learn what actually drives XAUUSD — the dollar, yields, and the news calendar — then the session timing, strategies and scalping setups that suit its volatility.',
   'intermediate', 1, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_gt_01', 'crs_gold_trading', 'Gold Foundations', 'How to start trading gold (XAUUSD)',            '2khan4o6tsg', 'VasilyTrader',           336,  1),
  ('lsn_gt_02', 'crs_gold_trading', 'Gold Foundations', 'How to trade XAUUSD like a pro',                'Rr2MG6XQsnE', 'Jeffrey Benson Forex',   3231, 2),
  ('lsn_gt_03', 'crs_gold_trading', 'What Moves Gold',  'The US Dollar Index (DXY), explained',          'tTW9fhCex6o', 'Mind Math Money',        661,  3),
  ('lsn_gt_04', 'crs_gold_trading', 'What Moves Gold',  'Using the dollar index to read gold',           'QtHN5T29mns', 'JeaFx',                  526,  4),
  ('lsn_gt_05', 'crs_gold_trading', 'What Moves Gold',  'Correlation in trading: DXY, EURUSD and gold',  '65zvI50brmE', 'APNacademy(lets solve)', 936,  5),
  ('lsn_gt_06', 'crs_gold_trading', 'What Moves Gold',  'Trading gold through news: NFP, CPI, FOMC',     'Z72ew7Ue9t0', 'Tony snip3r',            877,  6),
  ('lsn_gt_07', 'crs_gold_trading', 'What Moves Gold',  'The best time of day to trade gold',            'K-VpMSwuMm8', 'ACY Securities',         175,  7),
  ('lsn_gt_08', 'crs_gold_trading', 'Gold Strategies',  'A simple, profitable gold strategy',            '5N6ixNiksa0', 'APNacademy(lets solve)', 458,  8),
  ('lsn_gt_09', 'crs_gold_trading', 'Gold Strategies',  'Gold strategy: beginner to pro, step by step',  'r7uTxifNgow', 'APNacademy(lets solve)', 2779, 9),
  ('lsn_gt_10', 'crs_gold_trading', 'Gold Strategies',  'Stop trading gold with broken setups',          'jMw-QlSW5iE', 'The Secret Mindset',     669,  10),
  ('lsn_gt_11', 'crs_gold_trading', 'Scalping Gold',    'The 5-minute order block setup',                'nDgnYg6Tfpg', 'FXNX',                   239,  11),
  ('lsn_gt_12', 'crs_gold_trading', 'Scalping Gold',    'A simple 5-minute gold scalping strategy',      'OJ_vO1VcTTQ', 'A.C.T. Forex',           602,  12),
  ('lsn_gt_13', 'crs_gold_trading', 'Scalping Gold',    'Three gold scalping strategies compared',       'xXy2CBssQQA', 'Smart Risk',             999,  13),
  ('lsn_gt_14', 'crs_gold_trading', 'Scalping Gold',    'Scalping gold on the lower timeframes',         'mlBa14r2Ixo', 'Samuel Tochi',           623,  14)
ON CONFLICT ("id") DO NOTHING;
