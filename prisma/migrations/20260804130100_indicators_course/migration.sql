-- Seed: "Indicators & Tools" — one section per indicator (moving averages, RSI,
-- MACD, Bollinger Bands, stochastics, volume), closing with an honest look at
-- which ones are worth keeping on the chart.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint; educator
-- names are exactly as YouTube reports them, and each durationSec is the runtime
-- YouTube itself lists for the video. Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_indicators', 'indicators-and-tools', 'Indicators & Tools',
   'What each indicator actually measures, and when it lies. Moving averages, RSI, MACD, Bollinger Bands, stochastics and volume — one section each, taught by people who use them, plus an honest look at which ones are worth keeping on your chart.',
   'beginner', 7, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_ind_01', 'crs_indicators', 'Moving Averages',               'Best moving average trading strategy',                      'jdYNaE5GJ0k', 'Wysetrade',                                   895,  1),
  ('lsn_ind_02', 'crs_indicators', 'Moving Averages',               'How to use the 20 SMA',                                     'WYiTLT9kwCQ', 'Oliver Velez Trading',                       1150,  2),
  ('lsn_ind_03', 'crs_indicators', 'Moving Averages',               'The best moving average trading guide',                     'NrsL_HjIvDo', 'Pro Trading School',                         1029,  3),
  ('lsn_ind_04', 'crs_indicators', 'Moving Averages',               'VWAP trading strategy for beginner day traders',            'SxX2JqSlFWE', 'Humbled Trader',                              867,  4),
  ('lsn_ind_05', 'crs_indicators', 'RSI',                           'How to use the Relative Strength Index (RSI)',              'hbcCykbX14U', 'Charles Schwab',                              261,  5),
  ('lsn_ind_06', 'crs_indicators', 'RSI',                           'RSI indicator secrets: strategies for bull & bear markets', 'cjoEGsB7ph4', 'Rayner Teo',                                 1287,  6),
  ('lsn_ind_07', 'crs_indicators', 'RSI',                           'Top 3 ways to use the RSI indicator',                       'uiM-TifFKHg', 'SMB Capital',                                1704,  7),
  ('lsn_ind_08', 'crs_indicators', 'RSI',                           'RSI divergence strategy for day trading',                   '9KVvwJHvcyE', 'Data Trader',                                 576,  8),
  ('lsn_ind_09', 'crs_indicators', 'MACD',                          'MACD indicator explained: trading with the trend',          'W78Xg_pnJ1A', 'Financial Wisdom',                            304,  9),
  ('lsn_ind_10', 'crs_indicators', 'MACD',                          'MACD indicator trading explained (for beginners)',          'xQYrUSRrLYo', 'Capital.com',                                 607, 10),
  ('lsn_ind_11', 'crs_indicators', 'MACD',                          'MACD explained: 4 advanced strategies',                     'qShed6dyrQY', 'Trade Prime',                                1624, 11),
  ('lsn_ind_12', 'crs_indicators', 'MACD',                          'The hidden power of the MACD histogram',                    'ctH45oEyXUo', 'TRADING RUSH',                                265, 12),
  ('lsn_ind_13', 'crs_indicators', 'Bollinger Bands & Stochastics', 'How to use Bollinger Bands',                                'j5l5nfvP6Dg', 'Charles Schwab',                              243, 13),
  ('lsn_ind_14', 'crs_indicators', 'Bollinger Bands & Stochastics', 'Bollinger Bands explained: 5 strategies that work',         'PF4XUgXInkw', 'MAFFMARKET',                                  543, 14),
  ('lsn_ind_15', 'crs_indicators', 'Bollinger Bands & Stochastics', 'A Bollinger Bands strategy on the 15-minute chart',         'gOMm1o_9Dcc', 'BKTraders - Kathy Lien & Boris Schlossberg',  891, 15),
  ('lsn_ind_16', 'crs_indicators', 'Bollinger Bands & Stochastics', 'The only stochastic trading guide you''ll ever need',       'qddEJ51gb0E', 'Tom Crown',                                   286, 16),
  ('lsn_ind_17', 'crs_indicators', 'Bollinger Bands & Stochastics', 'Ultimate stochastic oscillator trading strategy',           'rJrkfLRBkao', 'Wysetrade',                                   750, 17),
  ('lsn_ind_18', 'crs_indicators', 'Volume',                        'Volume analysis in trading',                                'JGylfB0TYtA', 'Mind Math Money',                             335, 18),
  ('lsn_ind_19', 'crs_indicators', 'Volume',                        'Why you should learn volume analysis',                      'hWM2Gw36FlU', 'Mind Math Money',                             642, 19),
  ('lsn_ind_20', 'crs_indicators', 'Volume',                        'The only volume profile trading video you''ll ever need',   'Xe30nXrRxYg', 'Tom Crown',                                   492, 20),
  ('lsn_ind_21', 'crs_indicators', 'Volume',                        'How to trade volume (forex)',                               'V7wjD7oaipI', 'The Moving Average',                          419, 21),
  ('lsn_ind_22', 'crs_indicators', 'Choosing Your Indicators',      'Top 5 technical indicators for beginner traders',           'P7qikc4439g', 'ClayTrader',                                  719, 22),
  ('lsn_ind_23', 'crs_indicators', 'Choosing Your Indicators',      'The most popular trading indicators, ranked',               'nRPNt-Cnkl4', 'TradingLab',                                  557, 23),
  ('lsn_ind_24', 'crs_indicators', 'Choosing Your Indicators',      '10 best trading indicators after 10,000 hours of trading',  'xv_Zwf1-8L8', 'Wysetrade',                                  2576, 24)
ON CONFLICT ("id") DO NOTHING;
