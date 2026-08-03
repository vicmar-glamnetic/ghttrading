-- Seed: "Forex Fundamentals" — the macro side of the pairs: majors/minors/exotics,
-- who moves the market, central banks and interest rates, correlations, and the
-- carry trade. Complements the DXY material in the Gold Trading course.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint; educator
-- names are exactly as YouTube reports them, and each durationSec is the runtime
-- YouTube itself lists for the video. Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_forex_fundamentals', 'forex-fundamentals', 'Forex Fundamentals',
   'The why behind the candles. Majors, minors and exotics, who actually moves the market, how central banks and interest rates drive currencies, how pairs correlate, and the carry trade that quietly underpins a lot of what you see on the chart.',
   'intermediate', 8, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_ff_01', 'crs_forex_fundamentals', 'Currency Pairs',                 'What is a forex currency pair?',                                   'ozVgZ4l7Y5s', 'The Trading Channel (The Trading Channel)',   574,  1),
  ('lsn_ff_02', 'crs_forex_fundamentals', 'Currency Pairs',                 'Currency pairs explained',                                         'RMADDeFVkBA', 'Rayner Teo',                                  364,  2),
  ('lsn_ff_03', 'crs_forex_fundamentals', 'Currency Pairs',                 'Majors, minors and exotic currency pairs',                         '6Qbqch03wxw', 'UKspreadbetting',                             550,  3),
  ('lsn_ff_04', 'crs_forex_fundamentals', 'Currency Pairs',                 'Majors, minors & exotics made simple',                             'JwglGNsDdCA', 'AllenFx',                                     823,  4),
  ('lsn_ff_05', 'crs_forex_fundamentals', 'What Moves the Market',          'Forex trading and investing explained',                            'fPERzHyuQGo', 'The Plain Bagel',                             883,  5),
  ('lsn_ff_06', 'crs_forex_fundamentals', 'What Moves the Market',          'What moves forex prices?',                                         '95TTJ_DoZiA', 'Trading 212',                                 748,  6),
  ('lsn_ff_07', 'crs_forex_fundamentals', 'What Moves the Market',          'The economics of foreign exchange',                                'ig_EO805rpA', 'Economics Explained',                         875,  7),
  ('lsn_ff_08', 'crs_forex_fundamentals', 'What Moves the Market',          'Market participants: how banks and governments move price',        'MtsPivlS_yU', 'Kairoi Trading Hub',                          419,  8),
  ('lsn_ff_09', 'crs_forex_fundamentals', 'Central Banks & Interest Rates', 'How central banks influence forex prices',                         'HBmOBOqVT74', 'Trading 212',                                 745,  9),
  ('lsn_ff_10', 'crs_forex_fundamentals', 'Central Banks & Interest Rates', 'Interest rates explained: the key to fundamental analysis',        'qaY45EZDbaU', 'TraderNick',                                  699, 10),
  ('lsn_ff_11', 'crs_forex_fundamentals', 'Central Banks & Interest Rates', 'How to trade interest rate data like a pro',                       '3UphfyNrANg', 'TraderNick',                                 1199, 11),
  ('lsn_ff_12', 'crs_forex_fundamentals', 'Central Banks & Interest Rates', 'How raising interest rates controls inflation',                    'R8VBRCs2jTU', 'The Economist',                               494, 12),
  ('lsn_ff_13', 'crs_forex_fundamentals', 'Fundamental Analysis',           'Fundamental analysis simplified: the ultimate guide',              'iiRncjZWjXk', 'TraderNick',                                 1477, 13),
  ('lsn_ff_14', 'crs_forex_fundamentals', 'Fundamental Analysis',           'Forex fundamental analysis course for beginners',                  'Hwrsn86ZJfI', 'Karen Foo (Britney)',                        2127, 14),
  ('lsn_ff_15', 'crs_forex_fundamentals', 'Fundamental Analysis',           'The simplified guide to fundamental analysis',                     'joSsVkCmG-g', 'JeaFx',                                       888, 15),
  ('lsn_ff_16', 'crs_forex_fundamentals', 'Correlations',                   'How to use forex correlations in your trading',                    'PBGpv7g7tJI', 'BKTraders - Kathy Lien & Boris Schlossberg',  476, 16),
  ('lsn_ff_17', 'crs_forex_fundamentals', 'Correlations',                   'How to use currency correlation in forex trading',                 'lYh566XJDB0', 'Forex Training Group',                        962, 17),
  ('lsn_ff_18', 'crs_forex_fundamentals', 'Correlations',                   'How to understand currency correlation',                           'kPclx3EeUFY', 'Iliya Sivkov - Trading Fanatic',             1814, 18),
  ('lsn_ff_19', 'crs_forex_fundamentals', 'The Carry Trade',                'Carry trade basics',                                               '8In5PK1yUAA', 'Khan Academy',                                243, 19),
  ('lsn_ff_20', 'crs_forex_fundamentals', 'The Carry Trade',                'The yen carry trade explained — and what happens when it unwinds', '7cKvjPXNnEw', 'Preet Banerjee',                              681, 20),
  ('lsn_ff_21', 'crs_forex_fundamentals', 'The Carry Trade',                'How to do the carry trade',                                        'tBKBmIhxFWA', 'TraderNick',                                 1226, 21)
ON CONFLICT ("id") DO NOTHING;
