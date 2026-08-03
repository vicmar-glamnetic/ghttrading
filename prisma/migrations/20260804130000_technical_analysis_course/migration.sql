-- Seed: "Technical Analysis & Chart Patterns" — the chart-reading course that sits
-- between Trading Basics and Smart Money Concepts: continuation and reversal
-- patterns, trendlines, Fibonacci, and top-down multi-timeframe analysis.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint; educator
-- names are exactly as YouTube reports them, and each durationSec is the runtime
-- YouTube itself lists for the video. Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_technical_analysis', 'technical-analysis', 'Technical Analysis & Chart Patterns',
   'Read a chart the way a technician does. Continuation and reversal patterns, drawing trendlines that actually hold, Fibonacci retracements for entries, and the top-down multi-timeframe routine that stops you trading a 5-minute setup against the daily trend.',
   'intermediate', 6, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_ta_01', 'crs_technical_analysis', 'Foundations',              'Master technical analysis in 62 minutes (complete course)',       'R3lFBU0R76A', 'Mind Math Money',    3728,  1),
  ('lsn_ta_02', 'crs_technical_analysis', 'Foundations',              'Full technical analysis guide: all levels to pro',                '17dYvqJNtGA', 'Craig Percoco',      2069,  2),
  ('lsn_ta_03', 'crs_technical_analysis', 'Foundations',              'The best guide to chart patterns & price action',                 'WbMnfiknBoc', 'The Moving Average',  549,  3),
  ('lsn_ta_04', 'crs_technical_analysis', 'Continuation Patterns',    'A complete chart pattern course',                                 'KLHmpcT0hXc', 'Pro Trading School', 1177,  4),
  ('lsn_ta_05', 'crs_technical_analysis', 'Continuation Patterns',    'Triangle patterns: ascending, descending & symmetrical',          'U4qs-5uIxjc', 'Wysetrade',           842,  5),
  ('lsn_ta_06', 'crs_technical_analysis', 'Continuation Patterns',    'Bull flag and bear flag pattern strategy',                        'qdLm169MzpI', 'Wysetrade',           617,  6),
  ('lsn_ta_07', 'crs_technical_analysis', 'Continuation Patterns',    'How to avoid false breakouts',                                    'ZudTPpJCbbA', 'TradingLab',          503,  7),
  ('lsn_ta_08', 'crs_technical_analysis', 'Reversal Patterns',        'Head and shoulders pattern (trading strategy)',                   'T5uZqbbJIdk', 'Rayner Teo',          762,  8),
  ('lsn_ta_09', 'crs_technical_analysis', 'Reversal Patterns',        'How to trade head and shoulders — and what to do when they fail', 'BIVD7H_I7Ng', 'Justin Bennett',     1275,  9),
  ('lsn_ta_10', 'crs_technical_analysis', 'Reversal Patterns',        'How to trade the double top chart pattern like a pro',            'DF9uHpbb5Z8', 'Rayner Teo',          715, 10),
  ('lsn_ta_11', 'crs_technical_analysis', 'Reversal Patterns',        'How to trade double tops and double bottoms in forex',            '9vIHs29CVAw', 'Jason Graystone',     960, 11),
  ('lsn_ta_12', 'crs_technical_analysis', 'Trendlines',               'Trendline trading strategy in 3 simple steps',                    'SCMD4Xgj37o', 'Humbled Trader',     1242, 12),
  ('lsn_ta_13', 'crs_technical_analysis', 'Trendlines',               'Trendline trading system — full course',                          'f2bN_wK8XTg', 'Tradeciety.com',     1687, 13),
  ('lsn_ta_14', 'crs_technical_analysis', 'Trendlines',               'Why you are drawing trendlines wrong',                            'AOrfBAv76yg', 'LuxAlgo',             371, 14),
  ('lsn_ta_15', 'crs_technical_analysis', 'Fibonacci',                'The only Fibonacci video you''ll ever need',                      'IlfFo_3exos', 'BrandonTrades',       927, 15),
  ('lsn_ta_16', 'crs_technical_analysis', 'Fibonacci',                'Fibonacci trading course: using retracements for entries',        '_tVMtC5TUoY', 'JeaFx',               768, 16),
  ('lsn_ta_17', 'crs_technical_analysis', 'Fibonacci',                'The easiest Fibonacci retracement strategy',                      '4rCZn2Qi_NQ', 'Pro Trading School',  731, 17),
  ('lsn_ta_18', 'crs_technical_analysis', 'Multi-Timeframe Analysis', 'Using multiple timeframes to improve your entries',               'YR_32PJVWQA', 'Rayner Teo',          673, 18),
  ('lsn_ta_19', 'crs_technical_analysis', 'Multi-Timeframe Analysis', 'How to master top-down analysis in 19 minutes',                   'lCJ3SQXaQds', 'The Trading Geek',   1149, 19),
  ('lsn_ta_20', 'crs_technical_analysis', 'Multi-Timeframe Analysis', '7 trading strategies with multi-timeframe analysis',              'D-HZGcHzifg', 'Tradeciety.com',      973, 20),
  ('lsn_ta_21', 'crs_technical_analysis', 'Multi-Timeframe Analysis', 'The best timeframes for trading forex, crypto & stocks',          'ZCg4wSDLpp0', 'The Trading Geek',    695, 21)
ON CONFLICT ("id") DO NOTHING;
