-- Seed: "Prop Firms & Funded Accounts" — evaluations, the maths of passing, the
-- drawdown and consistency rules that end most funded accounts, and payouts.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint; educator
-- names are exactly as YouTube reports them, and each durationSec is the runtime
-- YouTube itself lists for the video. Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_prop_firms', 'prop-firm-trading', 'Prop Firms & Funded Accounts',
   'Trading someone else''s capital has its own rulebook, and most traders fail the rules rather than the market. What a prop firm actually is, the maths of passing an evaluation, the drawdown and consistency rules that quietly kill accounts, and how payouts really work.',
   'advanced', 10, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_pf_01', 'crs_prop_firms', 'Prop Firms Explained',  'Prop firms explained (beginners must watch)',              '9iNfy94v-v0', 'Blue Edge Financial',             356,  1),
  ('lsn_pf_02', 'crs_prop_firms', 'Prop Firms Explained',  'Prop firms explained in 5 minutes',                        '1O4_6u5hZ_I', 'Trade With Jem',                  307,  2),
  ('lsn_pf_03', 'crs_prop_firms', 'Prop Firms Explained',  'Path to profitability: funded accounts explained',         '52nxvJKM57U', 'TJR',                            1176,  3),
  ('lsn_pf_04', 'crs_prop_firms', 'Passing the Challenge', 'A beginner''s guide to passing a prop firm evaluation',    'akkPDEAm1jw', 'TJR',                            2125,  4),
  ('lsn_pf_05', 'crs_prop_firms', 'Passing the Challenge', 'How to pass prop firms using simple maths',                'H-PL14KEa5A', 'tomtrades',                      1192,  5),
  ('lsn_pf_06', 'crs_prop_firms', 'Passing the Challenge', 'The maths behind passing prop firms faster',               'QtdcgmLsoBI', 'Matt Donlevey - Photon Trading',  692,  6),
  ('lsn_pf_07', 'crs_prop_firms', 'Passing the Challenge', 'The complete guide to passing a prop firm challenge',      'VM-VdzAz9kc', 'Andrew NFX',                      448,  7),
  ('lsn_pf_08', 'crs_prop_firms', 'Passing the Challenge', 'How to pass prop firm challenges consistently',            '9yk9S2q8jAg', 'JeaFx',                           448,  8),
  ('lsn_pf_09', 'crs_prop_firms', 'Passing the Challenge', 'How to pass a funded account 101',                         'rbVc6ZFPO7s', 'TJR',                            1040,  9),
  ('lsn_pf_10', 'crs_prop_firms', 'Drawdown & Rules',      'Trailing drawdown explained',                              'hfXn0LruzYY', 'Funded Friday',                   364, 10),
  ('lsn_pf_11', 'crs_prop_firms', 'Drawdown & Rules',      'Trailing drawdown in prop firm trading: how to master it', '78ZmlGUTECk', 'A1 Trading',                     1333, 11),
  ('lsn_pf_12', 'crs_prop_firms', 'Drawdown & Rules',      'Intraday drawdown: the rule that blows up prop traders',   'WzYQbtrapEI', 'Shackmt',                         677, 12),
  ('lsn_pf_13', 'crs_prop_firms', 'Drawdown & Rules',      '6 drawdown rules that save your funded account',           '6EZ9_aJdBY8', 'FXStreet',                        435, 13),
  ('lsn_pf_14', 'crs_prop_firms', 'Drawdown & Rules',      'The prop firm consistency rule, explained',                '4F-T1oyrq_A', 'Blue Edge Financial',             538, 14),
  ('lsn_pf_15', 'crs_prop_firms', 'Drawdown & Rules',      'A guide to prop firm drawdown rules',                      'gLNAcpA67BA', 'Propvator',                       246, 15),
  ('lsn_pf_16', 'crs_prop_firms', 'Payouts',               'Prop firm payout rules: a full breakdown',                 'KJoq6JV7AEg', 'Mike Swartz',                    1403, 16),
  ('lsn_pf_17', 'crs_prop_firms', 'Payouts',               'The funded account payout strategy',                       'HXRX4YEQ4yI', 'Andrew NFX',                      771, 17),
  ('lsn_pf_18', 'crs_prop_firms', 'Payouts',               'The truth about getting funded and paid out',              'mU9V2y2rzpo', 'Trade With Jem',                  558, 18)
ON CONFLICT ("id") DO NOTHING;
