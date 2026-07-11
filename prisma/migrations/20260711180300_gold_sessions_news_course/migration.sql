-- Seed: "Gold: Sessions & News" — an advanced follow-up to the Gold Trading
-- course, focused on timing: which sessions move XAUUSD, how to trade it through
-- NFP / CPI / FOMC, reading the economic calendar, and session-based scalping.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint; educator
-- names are exactly as YouTube reports them, and each durationSec is the runtime
-- YouTube itself lists for the video. Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_gold_sessions', 'gold-sessions-news', 'Gold: Sessions & News',
   'Timing is everything on gold. Building on the Gold Trading course, this dives into which sessions move XAUUSD, how to trade it through NFP, CPI and FOMC, how to read the economic calendar, and the session-based scalping setups that suit gold''s volatility.',
   'advanced', 5, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_gs_01', 'crs_gold_sessions', 'Sessions & Timing',     'The best time to trade gold (XAUUSD)',                  'F3fgiERWYQQ', 'TIOmarkets',                  497,  1),
  ('lsn_gs_02', 'crs_gold_sessions', 'Sessions & Timing',     'Best time to trade gold: London & New York overlap',   'Oh4Fcdmj8hs', 'Aryan Bhogal',                634,  2),
  ('lsn_gs_03', 'crs_gold_sessions', 'Sessions & Timing',     '3 key tips for trading gold',                          'oc2zqnvsqi0', 'TraderNick',                  554,  3),
  ('lsn_gs_04', 'crs_gold_sessions', 'Trading the News',      'How I profit from gold every FOMC meeting',            'FXbo6QjPIRk', 'VasilyTrader',                358,  4),
  ('lsn_gs_05', 'crs_gold_sessions', 'Trading the News',      'Gold news trading: NFP, CPI & Fed rates guide',        '5ZTpnMgVPuU', 'FXNX',                        334,  5),
  ('lsn_gs_06', 'crs_gold_sessions', 'Trading the News',      'Understanding NFP and its impact on gold',             'T9I3vXfhlZw', 'ElDorado FX - Trading Group', 239,  6),
  ('lsn_gs_07', 'crs_gold_sessions', 'Trading the News',      'FOMC trading strategy: avoiding the chop',             'eWVUur7WE80', 'TrueAlgo',                    232,  7),
  ('lsn_gs_08', 'crs_gold_sessions', 'The Economic Calendar', 'How to use the economic calendar for trading',         'hKCMqh0ZsY0', 'TTrades',                     785,  8),
  ('lsn_gs_09', 'crs_gold_sessions', 'The Economic Calendar', 'How to use the Forex Factory economic calendar',       'yhCy4Rk3H2g', 'ForexBoat',                   764,  9),
  ('lsn_gs_10', 'crs_gold_sessions', 'The Economic Calendar', 'How to trade the news (fundamental trading)',          'bYyC9nk214w', 'Finding Forex',               672,  10),
  ('lsn_gs_11', 'crs_gold_sessions', 'Session Scalping Gold', 'Gold scalping strategy for London & NY sessions',      'SbfkkAzO-i4', 'ForexMindsHub',               1012, 11),
  ('lsn_gs_12', 'crs_gold_sessions', 'Session Scalping Gold', 'Best New York session strategy for gold',              'p1t9x-o5Lhg', 'RBI FOREX',                   1625, 12),
  ('lsn_gs_13', 'crs_gold_sessions', 'Session Scalping Gold', 'Ultimate gold scalping strategy in 14 minutes',        'nCBF6wrOKic', 'Trade with Pat',              865,  13)
ON CONFLICT ("id") DO NOTHING;
