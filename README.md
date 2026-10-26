# Heritage Edge - 2026

Heritage Edge is my own personal website of trading ideas, built with code. It acts as both a portfolio and knowledge hub on markets, trading, and the technology that is changing how both work.

**Live site:** tamaraabu4-cell.github.io/all-things-quant 


## About

I'm Tamara, a London-based graduate in Business, Computing & IT (Aston University, 2026). I research trades across rates, FX and commodities, and I build the tools to test them: pricing models, backtests and trade memos.

Heritage Edge is where that work is published. It has two jobs:

- Portfolio: Finished, documented work that shows how I think about markets and how I use code to test an idea.
- Knowledge hub: Structured notes on the markets, maths and technology behind trading, written to be understood rather than memorised.

Everything is built from scratch and published publically!


## What's on the site?

| Section | What it holds |
|---|---|
| Work | Trade memos, pricing models and backtests. Each project follows the same four parts: Thesis → Method → Tech → Result. | 
| Notes | The knowledge hub: interactive notes organised around how markets are traded, not around university subjects. | 
| Desk Notes | Short pieces on how technology is changing trading, plus post-mortems on my own trades. |
| About | Who I am, my CV, and how to get in touch. | 


## Featured Work

| # | Project | Thesis | Method & Tech | Result |
|---|---|---|---|---|
| 1 | Liquidity-Sweep Reversal Backtest | Do false breakouts of recent highs and lows reverse often enough to trade? | 96-combination grid search on EURUSD daily data, in-sample/out-of-sample split, Sharpe decay test. Python. | Performance was poor on daily data. The write-up diagnoses why (wrong timeframe, too few signals, no session or trend filter) and sets out a better test. |
| 2 | Pricing Coffee Derivatives | A six-month coffee call needs a fair price, and the desk needs to know its risk after selling it. | Cost of carry → Black-76 → Monte Carlo (500k paths); coffee-linked structured note; desk risk review. Python, NumPy, SciPy. | Black-76 and Monte Carlo agree to within 0.02%. Note solved at 40.9% participation. Citi Markets Quant job simulation (Forage). |
| 3 | December FOMC Trade Memo | The market prices about a 10% chance the Fed holds on 9 December; I put it nearer 30%. | Bull call spread on SR3Z6 SOFR futures options, with scenario pricing and expected value. | Paper trade: max loss $750, max gain $2,375, positive EV at my odds. Post-mortem to follow the decision. |
| 4 | Black-Scholes Options Pricer | Python, Greeks, Implied vol solver | Upcoming |


## Repository structure

```
quant-study-notes/
├── index.html              # Homepage
├── study-guide.html        # Study guide hub
├── projects.html           # Projects page
├── blog.html               # Progress blog
├── style.css               # Shared design system
└── study-guide/
    └── Finance/
        └── finance-lv1.html
```

## Stack

- **Notes** — Vanilla HTML, CSS, JavaScript. No frameworks.
- **Math rendering** — Pure HTML/CSS fraction layout with Unicode symbols
- **Hosting** — GitHub Pages (free, no build step)
- **Data** — yfinance, FRED API, Polygon.io, HistData
- **Analysis** — Python, NumPy, Pandas, Matplotlib


## Goal

Quantitative trader or researcher role — through self-study, live projects, and prop firm trading to generate returns while building the portfolio.

Currently targeting: systematic trading roles, quant research positions, and prop firm evaluation programmes (FTMO, Topstep, funded trader programmes).


## Contact

Built and maintained by **Tamara** :

- GitHub: [@tamaraabu4-cell](https://github.com/tamaraabu4-cell)

- LinkedIn: (https://www.linkedin.com/in/tamara-abu-767577255/)

- Email: tamaraabu4@gmail.com


*Started March 2026. Updated continuously.*
