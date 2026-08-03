-- Seed: "Strategy Building & Backtesting" — turning setups into a written system:
-- building a trading plan, backtesting it properly (including on TradingView),
-- then forward testing on demo before risking capital.
--
-- Every youtubeId below was resolved against YouTube's oEmbed endpoint; educator
-- names are exactly as YouTube reports them, and each durationSec is the runtime
-- YouTube itself lists for the video. Re-runnable via ON CONFLICT.

INSERT INTO "courses" ("id", "slug", "title", "description", "level", "order", "updatedAt") VALUES
  ('crs_strategy_testing', 'strategy-backtesting', 'Strategy Building & Backtesting',
   'Turn a collection of setups into a written system you can prove. How to build a trading plan you''ll actually follow, backtest it properly on TradingView instead of eyeballing charts, then forward test on demo before a single dollar is at risk.',
   'intermediate', 9, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "lessons" ("id", "courseId", "section", "title", "youtubeId", "educator", "durationSec", "order") VALUES
  ('lsn_st_01', 'crs_strategy_testing', 'Building a Trading Plan',    'How to create a forex trading plan you''ll actually follow', 'gIgRZiZSYZc', 'ChartTactix',                     872,  1),
  ('lsn_st_02', 'crs_strategy_testing', 'Building a Trading Plan',    'How to make your first trading plan, step by step',          '1APcyDafmkY', 'ANTHONYSWORLD',                   794,  2),
  ('lsn_st_03', 'crs_strategy_testing', 'Building a Trading Plan',    'How to write down a trading plan (with a PDF example)',      'IX1NviP-yeI', 'Iliya Sivkov - Trading Fanatic',  972,  3),
  ('lsn_st_04', 'crs_strategy_testing', 'Building a Trading Plan',    'How to create a profitable trading plan',                    'qzEVyEW0DtA', 'Karen Foo (Britney)',            1752,  4),
  ('lsn_st_05', 'crs_strategy_testing', 'Building a Trading Plan',    'Trading system vs trading strategy: the difference',         'ULDSZA-nq0U', 'The Duomo Initiative',            863,  5),
  ('lsn_st_06', 'crs_strategy_testing', 'Building a Trading Plan',    'How to create your own profitable trading strategy',         'ltcszQwpNEc', 'kole trades',                    1048,  6),
  ('lsn_st_07', 'crs_strategy_testing', 'Backtesting',                'The ultimate guide to backtesting: how and why',             'sOa4PovtZ1c', 'JeaFx',                           681,  7),
  ('lsn_st_08', 'crs_strategy_testing', 'Backtesting',                'How to properly backtest your trading strategy',             'YNi65AMOJWQ', 'Smart Risk',                      550,  8),
  ('lsn_st_09', 'crs_strategy_testing', 'Backtesting',                'How to backtest properly',                                   'R3T1zRyZdMc', 'The Moving Average',             1115,  9),
  ('lsn_st_10', 'crs_strategy_testing', 'Backtesting',                'How to backtest your trading strategy',                      '3oo2uiYGVjg', 'The Trading Geek',               1814, 10),
  ('lsn_st_11', 'crs_strategy_testing', 'Backtesting on TradingView', 'How to backtest on TradingView (no coding)',                 'LfBTXKks4V0', 'Trade With Jem',                  593, 11),
  ('lsn_st_12', 'crs_strategy_testing', 'Backtesting on TradingView', 'TradingView replay & backtesting tutorial',                  'DFu9yRCChKM', 'Mind Math Money',                 462, 12),
  ('lsn_st_13', 'crs_strategy_testing', 'Backtesting on TradingView', 'Your first automated backtest on TradingView',               'l6NcKYG7FY8', 'Trading Heroes',                  396, 13),
  ('lsn_st_14', 'crs_strategy_testing', 'Forward Testing',            'Backtesting vs forward testing',                             '2ID7-nXyFfs', 'Tactical Edge with Ben',          277, 14),
  ('lsn_st_15', 'crs_strategy_testing', 'Forward Testing',            'Forward testing vs backtesting: which is best?',             'LT50rwk3BG8', 'UKspreadbetting',                 481, 15),
  ('lsn_st_16', 'crs_strategy_testing', 'Forward Testing',            'Walk-forward testing explained',                             'bfwhXTnQgMI', 'Unbiased Trading',                412, 16),
  ('lsn_st_17', 'crs_strategy_testing', 'Forward Testing',            'Forward testing your trading strategy',                      '0bY14w5klOI', 'ACY Securities',                  476, 17)
ON CONFLICT ("id") DO NOTHING;
