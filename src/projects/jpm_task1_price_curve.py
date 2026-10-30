"""
J.P. Morgan Quantitative Research (Forage) - Task 1, rebuilt
A natural gas price curve: an estimate for any date, tested before it is trusted.

Data: the month-end purchase price of natural gas from 31 Oct 2020 to
30 Sep 2024 (Nat_Gas.csv, from the simulation).

The idea in plain words
-----------------------
Gas prices do two things at once: they creep upwards over time, and they
rise every winter (heating) and fall every summer. So the curve is
    price = level + trend * t + a yearly wave
and the yearly wave is written as a sine plus a cosine, which lets one
regression find both how big the wave is and when in the year it peaks:

    P(t) = a + b t + c sin(w t) + d cos(w t),     w = 2 pi / 365.25

Everything is linear in (a, b, c, d), so one least-squares fit finds all four
together. (Fitting the trend first and the wave second can bias both, because
four years of data do not start and end at the same point in the cycle.)

A model is only useful if it forecasts well, so before using it I hide the
last 12 months, fit on the first 36, and check how far its forecasts land
from what actually happened, against a simple benchmark.
"""

import json
from datetime import date

import numpy as np
import pandas as pd

DATA_FILE = 'Nat_Gas.csv'
W = 2 * np.pi / 365.25          # one full wave per year


# ---------------------------------------------------------------------------
# Part 1: load the data
# ---------------------------------------------------------------------------

def load_prices(path=DATA_FILE):
    df = pd.read_csv(path)
    df['Dates'] = pd.to_datetime(df['Dates'], format='%m/%d/%y')
    return df.sort_values('Dates').reset_index(drop=True)


DF = load_prices()
START = DF['Dates'].iloc[0]                       # 31 Oct 2020, day 0
LAST = DF['Dates'].iloc[-1]                       # 30 Sep 2024


def days_since_start(d):
    return (pd.Timestamp(d) - START).days


# ---------------------------------------------------------------------------
# Part 2: fit the curve with one least-squares regression
# ---------------------------------------------------------------------------

def design(t):
    """The four columns of the regression: level, trend, sine, cosine."""
    t = np.asarray(t, dtype=float)
    return np.column_stack([np.ones_like(t), t, np.sin(W * t), np.cos(W * t)])


def fit(t, prices):
    coefs, *_ = np.linalg.lstsq(design(t), prices, rcond=None)
    return coefs


def curve(coefs, t):
    return design(t) @ coefs


def describe(coefs):
    """Turn (a, b, c, d) into numbers a trader can read."""
    a, b, c, d = coefs
    amplitude = np.hypot(c, d)                       # size of the yearly swing
    # The wave c sin(wt) + d cos(wt) peaks when wt = atan2(c, d)
    peak_day = (np.arctan2(c, d) / W) % 365.25
    peak_date = START + pd.Timedelta(days=float(peak_day))
    return {
        'trend_per_year': b * 365.25,
        'amplitude': amplitude,
        'peak_month': peak_date.strftime('%B'),
        'trough_month': (peak_date + pd.Timedelta(days=182.6)).strftime('%B'),
    }


T_ALL = np.array([days_since_start(d) for d in DF['Dates']])
P_ALL = DF['Prices'].to_numpy(dtype=float)


# ---------------------------------------------------------------------------
# Part 3: test the forecast on 12 months it has never seen
# ---------------------------------------------------------------------------

def backtest(hold_out=12):
    train, test = slice(0, len(DF) - hold_out), slice(len(DF) - hold_out, None)
    coefs = fit(T_ALL[train], P_ALL[train])
    model = curve(coefs, T_ALL[test])
    # Benchmark: "next year looks like last year", i.e. each hidden month is
    # forecast with the price 12 months earlier. A fair, seasonal benchmark.
    same_month_last_year = P_ALL[len(DF) - 2 * hold_out:len(DF) - hold_out]
    # Second benchmark: the last known price, held flat
    flat = np.full(hold_out, P_ALL[len(DF) - hold_out - 1])
    actual = P_ALL[test]
    mae = lambda f: float(np.mean(np.abs(f - actual)))
    return {
        'coefs': coefs,
        'dates': DF['Dates'].iloc[test],
        'actual': actual,
        'model': model,
        'mae_model': mae(model),
        'mae_last_year': mae(same_month_last_year),
        'mae_flat': mae(flat),
    }


# ---------------------------------------------------------------------------
# Part 4: the final curve, fitted on all 48 months
# ---------------------------------------------------------------------------

COEFS = fit(T_ALL, P_ALL)
RESID_SD = float(np.std(P_ALL - curve(COEFS, T_ALL), ddof=4))   # 4 fitted numbers


def price_on(d, use_actual=True):
    """Estimated purchase price on any date, up to a year past the data.

    On a month-end we already have a price for, the actual price is returned
    (unless use_actual=False); everywhere else, the fitted curve.
    """
    d = pd.Timestamp(d)
    if d > LAST + pd.DateOffset(years=1):
        raise ValueError('The curve is only trusted up to a year past the data')
    if use_actual:
        match = DF.loc[DF['Dates'] == d, 'Prices']
        if len(match):
            return float(match.iloc[0])
    return float(curve(COEFS, [days_since_start(d)])[0])


def forecast_month_ends(months=12):
    """Month-end prices for the year after the data ends."""
    ends = pd.date_range(LAST + pd.offsets.MonthEnd(1), periods=months, freq='ME')
    return [(e, price_on(e)) for e in ends]


# ---------------------------------------------------------------------------
# Part 5: charts and numbers for the website
# ---------------------------------------------------------------------------

def export_for_website(bt, path='task1_data.json'):
    daily = pd.date_range(START, LAST + pd.DateOffset(years=1), freq='7D')
    out = {
        'history': [[d.strftime('%Y-%m-%d'), round(p, 3)] for d, p in zip(DF['Dates'], P_ALL)],
        'curve': [[d.strftime('%Y-%m-%d'), round(price_on(d, use_actual=False), 3)] for d in daily],
        'band': round(1.96 * RESID_SD, 3),
        'last_date': LAST.strftime('%Y-%m-%d'),
        'backtest': {
            'dates': [d.strftime('%Y-%m-%d') for d in bt['dates']],
            'actual': [round(x, 3) for x in bt['actual']],
            'model': [round(x, 3) for x in bt['model']],
            'mae_model': round(bt['mae_model'], 3),
            'mae_last_year': round(bt['mae_last_year'], 3),
            'mae_flat': round(bt['mae_flat'], 3),
        },
        'summary': {k: (round(v, 3) if isinstance(v, float) else v) for k, v in describe(COEFS).items()},
        'forecast': [[d.strftime('%Y-%m-%d'), round(p, 3)] for d, p in forecast_month_ends()],
    }
    with open(path, 'w') as f:
        json.dump(out, f)
    return out


def save_charts(bt):
    from matplotlib import pyplot as plt
    days = pd.date_range(START, LAST + pd.DateOffset(years=1), freq='D')
    fitted = [price_on(d, use_actual=False) for d in days]

    plt.figure(figsize=(10, 5))
    plt.plot(days, fitted, label='Fitted curve')
    plt.fill_between(days, np.array(fitted) - 1.96 * RESID_SD, np.array(fitted) + 1.96 * RESID_SD,
                     alpha=0.15, label='95% range of past misses')
    plt.plot(DF['Dates'], P_ALL, 'o', ms=4, label='Month-end prices')
    plt.axvline(LAST, color='grey', linestyle=':', label='Forecast begins')
    plt.ylabel('Price ($/MMBtu)')
    plt.title('Natural gas: trend plus a yearly wave, extended one year')
    plt.legend()
    plt.tight_layout()
    plt.savefig('task1_curve.png', dpi=150)
    plt.close()

    plt.figure(figsize=(10, 5))
    plt.plot(bt['dates'], bt['actual'], 'o-', label='What actually happened')
    plt.plot(bt['dates'], bt['model'], 's--', label='Forecast from the first 36 months')
    plt.ylabel('Price ($/MMBtu)')
    plt.title('Out-of-sample test: the last 12 months, hidden from the fit')
    plt.legend()
    plt.tight_layout()
    plt.savefig('task1_backtest.png', dpi=150)
    plt.close()


if __name__ == '__main__':
    s = describe(COEFS)
    print('Fitted on all 48 months')
    print('  Trend:            +${:.3f} per year'.format(s['trend_per_year']))
    print('  Yearly swing:     +/- ${:.3f} around the trend'.format(s['amplitude']))
    print('  Dearest month:    {}   cheapest month: {}'.format(s['peak_month'], s['trough_month']))
    print('  Typical miss (1 sd): ${:.3f}'.format(RESID_SD))

    bt = backtest()
    print('\nOut-of-sample test (fit on 36 months, forecast the hidden 12)')
    print('  Average miss, this model:               ${:.3f}'.format(bt['mae_model']))
    print('  Average miss, same month last year:     ${:.3f}'.format(bt['mae_last_year']))
    print('  Average miss, last price held flat:     ${:.3f}'.format(bt['mae_flat']))

    print('\nForecast month-ends')
    for d, p in forecast_month_ends():
        print('  {}  ${:.2f}'.format(d.date(), p))

    print('\nPrice on any date')
    for d in ['2021-07-15', '2023-01-05', '2024-09-30', '2024-12-25', '2025-06-15']:
        print('  {}  ${:.2f}'.format(d, price_on(d)))

    export_for_website(bt)
    save_charts(bt)
