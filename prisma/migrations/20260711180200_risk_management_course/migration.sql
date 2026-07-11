-- Seed: "Risk Management" — a dedicated course on the survival skill: how much to
-- risk, position sizing and lot size, stop placement and risk-reward, and
-- surviving drawdown / risk of ruin.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint; educator
-- names are exactly as YouTube reports them, and each durationSec is the runtime
-- YouTube itself lists for the video. Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_risk_management', 'risk-management', 'Risk Management',
   'The one skill that keeps you in the game. Learn how much to risk per trade, how to size positions and calculate lot size, where to place stops for the best risk-reward, and how to survive drawdown so a losing streak never ends your trading.',
   'intermediate', 4, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_rm_01', 'crs_risk_management', 'How Much to Risk',          'Risk management and position sizing',                   'q5UiDAk1740', 'Rayner Teo',          589,  1),
  ('lsn_rm_02', 'crs_risk_management', 'How Much to Risk',          'Risk management & position sizing strategy',            'gM65dEuNsMw', 'Humbled Trader',      1013, 2),
  ('lsn_rm_03', 'crs_risk_management', 'How Much to Risk',          'Position sizing & money management',                    'tZqobytWXnI', 'Adam Khoo',           2381, 3),
  ('lsn_rm_04', 'crs_risk_management', 'Position Sizing & Lot Size', 'How to calculate the right lot size',                  'omPNkM7PdQ4', 'TraderNick',          559,  4),
  ('lsn_rm_05', 'crs_risk_management', 'Position Sizing & Lot Size', 'Position sizing, risk & strategy',                     'x5p5rBkeF6c', 'Jason Graystone',     1551, 5),
  ('lsn_rm_06', 'crs_risk_management', 'Position Sizing & Lot Size', 'Position sizing strategies (Van Tharp)',               'RKFJQo8Ogsw', 'Van Tharp Institute', 547,  6),
  ('lsn_rm_07', 'crs_risk_management', 'Stops & Risk-Reward',       'Where to put your stop loss',                           '_D1MYH6D7jc', 'JeaFx',               940,  7),
  ('lsn_rm_08', 'crs_risk_management', 'Stops & Risk-Reward',       'Risk-reward ratio: trade like a professional',          '5G1g0w6eW5I', 'Financial Wisdom',    571,  8),
  ('lsn_rm_09', 'crs_risk_management', 'Stops & Risk-Reward',       'Risk-to-reward ratio: the #1 trading secret',           'oypkaebzvUs', 'Chart Champions',     464,  9),
  ('lsn_rm_10', 'crs_risk_management', 'Drawdown & Risk of Ruin',   'What''s your risk of ruin?',                            'aJTJqqkoogU', 'Trading Tact',        320,  10),
  ('lsn_rm_11', 'crs_risk_management', 'Drawdown & Risk of Ruin',   'Why ''make it back'' thinking ruins accounts',          'FZedxBO9r1w', 'BeB Crypto',          394,  11),
  ('lsn_rm_12', 'crs_risk_management', 'Drawdown & Risk of Ruin',   'How to handle trading drawdowns',                       'o7DfwJTC_Ow', 'TheOneLanceB',        966,  12),
  ('lsn_rm_13', 'crs_risk_management', 'Drawdown & Risk of Ruin',   '15 years of trading risk management in 20 minutes',     'gb7nNveNBjg', 'TheOneLanceB',        1227, 13)
ON CONFLICT ("id") DO NOTHING;
