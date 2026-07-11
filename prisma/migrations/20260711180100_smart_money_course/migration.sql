-- Seed: "Smart Money Concepts" — an advanced price-action course covering the
-- institutional model this community leans on when scalping gold: market
-- structure, break of structure / change of character, liquidity, fair value
-- gaps and order blocks.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint, and the
-- educator names are exactly as YouTube reports them. durationSec is left null
-- rather than guessed (same as the Trading Basics seed). Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_smart_money', 'smart-money-concepts', 'Smart Money Concepts',
   'Read the chart the way institutions do. Work up from market structure to break of structure and change of character, then learn to spot liquidity, fair value gaps and order blocks — the toolkit behind the order-block scalps in the Gold course.',
   'advanced', 3, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "order") VALUES
  ('lsn_smc_01', 'crs_smart_money', 'Market Structure',            'The only market structure lesson you''ll ever need',        'LclxDYccla8', 'JeaFx',                        1),
  ('lsn_smc_02', 'crs_smart_money', 'Market Structure',            'Master market structure in 68 minutes',                    'ygleB1CLhUE', 'JeaFx',                        2),
  ('lsn_smc_03', 'crs_smart_money', 'Market Structure',            'How to trade market structure like a pro',                 'jt5ncnNoCTQ', 'Trader Mayne',                 3),
  ('lsn_smc_04', 'crs_smart_money', 'Market Structure',            'Advanced market structure (full tutorial)',                '1NQ5U9CHL-4', 'Smart Risk',                   4),
  ('lsn_smc_05', 'crs_smart_money', 'Break of Structure & CHoCH',  'Market structure mastery: structure breaks (BOS)',         'sFGNaboAwFc', 'Iliya Sivkov - Trading Fanatic', 5),
  ('lsn_smc_06', 'crs_smart_money', 'Break of Structure & CHoCH',  'Break of structure explained',                             'Zzk864cVJek', 'TJR',                          6),
  ('lsn_smc_07', 'crs_smart_money', 'Break of Structure & CHoCH',  'How to trade breaks of structure',                         'omORHbDCul4', 'Akil Stokes - Trading Coach',  7),
  ('lsn_smc_08', 'crs_smart_money', 'Liquidity & Fair Value Gaps', 'Master fair value gaps + liquidity like a pro',            'dudHOoyOin0', 'Tradence',                     8),
  ('lsn_smc_09', 'crs_smart_money', 'Liquidity & Fair Value Gaps', 'Liquidity, FVG & order blocks explained (ICT)',            'QrYW_qzWmrg', 'Com Lucro Trader',             9),
  ('lsn_smc_10', 'crs_smart_money', 'Order Blocks & Strategy',     'Combining liquidity sweeps, FVGs & order blocks',          'RjR2kTErlq4', 'Smart Risk',                  10),
  ('lsn_smc_11', 'crs_smart_money', 'Order Blocks & Strategy',     'The secrets of order flow and order blocks',               'WgegYApBOU0', 'Fortune Talks',               11),
  ('lsn_smc_12', 'crs_smart_money', 'Order Blocks & Strategy',     'The ultimate smart money course: liquidity & manipulation','enwGyswTzUE', 'Fortune Talks',               12)
ON CONFLICT ("id") DO NOTHING;
