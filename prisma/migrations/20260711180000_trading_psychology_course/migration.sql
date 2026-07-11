-- Seed: "Trading Psychology" — a dedicated course on the mental game, going
-- deeper than the psychology section inside Trading Basics: emotions, fear and
-- greed, thinking in probabilities, patience, and journaling.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint, and the
-- educator names are exactly as YouTube reports them. durationSec is left null
-- rather than guessed (same as the Trading Basics seed). Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_trading_psychology', 'trading-psychology', 'Trading Psychology',
   'Strategy gets you into trades; psychology decides whether you keep the profits. Master your emotions, tame fear, greed and FOMO, learn to think in probabilities, and build the patience, discipline and journaling habits that separate consistent traders from the rest.',
   'intermediate', 2, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "order") VALUES
  ('lsn_tp_01', 'crs_trading_psychology', 'The Trader''s Mind',        'Master trading psychology: discipline, emotions & mindset', 'Y3yRn7B_r9w', 'iFOREX Official Channel',          1),
  ('lsn_tp_02', 'crs_trading_psychology', 'The Trader''s Mind',        'How to master your emotions and stay profitable',          'AKwifJT958o', 'Etienne Crete - Desire To TRADE',  2),
  ('lsn_tp_03', 'crs_trading_psychology', 'The Trader''s Mind',        'Rewire your brain for a trader''s mindset',                 '4D-UrcPLI0g', 'tastylive',                        3),
  ('lsn_tp_04', 'crs_trading_psychology', 'Fear, Greed & FOMO',        'How the top 1% weaponize greed',                           'Dx41dIqqSGM', 'Trading Psychology Stick',         4),
  ('lsn_tp_05', 'crs_trading_psychology', 'Fear, Greed & FOMO',        'Why greed destroys 99% of traders',                        'IyE0CgI7cEs', 'Psychology of Profit',             5),
  ('lsn_tp_06', 'crs_trading_psychology', 'Fear, Greed & FOMO',        'The psychology trick that beats every mental system',      'rkYVWZ-8XYI', 'The Secret Mindset',               6),
  ('lsn_tp_07', 'crs_trading_psychology', 'Thinking in Probabilities', 'A probabilistic mindset: Douglas'' Trading in the Zone',    '1MQtfQMToig', 'Tradersflux',                      7),
  ('lsn_tp_08', 'crs_trading_psychology', 'Patience & Discipline',     'Developing a patient trading mind',                        'GTQSnIhK1R4', 'Rande Howell',                     8),
  ('lsn_tp_09', 'crs_trading_psychology', 'Patience & Discipline',     'How to cultivate patience & discipline',                   'zfSf8tPE1P8', 'Patrick Bailouni - Trading Mindset', 9),
  ('lsn_tp_10', 'crs_trading_psychology', 'Patience & Discipline',     'The art of patience: wait for the perfect setup',          'PRfjTwWzzVs', 'Trading Mindset Lab',             10),
  ('lsn_tp_11', 'crs_trading_psychology', 'Patience & Discipline',     'How to maintain discipline and patience',                  '-oUv_hy9MHM', 'FXCM',                            11),
  ('lsn_tp_12', 'crs_trading_psychology', 'Journaling & Review',       'What to record in your trade journal to improve',          'xO_4t_JWCbQ', 'Disciplined Trader',              12),
  ('lsn_tp_13', 'crs_trading_psychology', 'Journaling & Review',       'How I journal my trades',                                  '5u682pWNmpY', 'tomtrades',                       13)
ON CONFLICT ("id") DO NOTHING;
