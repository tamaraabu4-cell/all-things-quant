"""
J.P. Morgan Quantitative Research (Forage) - Task 2, upgraded
Price a natural gas storage contract, then find the best months to use it.

A storage contract is worth the gas we sell minus the gas we buy, less every
cost incurred in executing the agreement:

    value = sum(withdrawals: volume * price)          <- revenue
          - sum(injections:  volume * price)          <- cost of gas
          - sum(injections + withdrawals: volume * injection_withdrawal_cost_rate)
          - sum(injections + withdrawals: transport_cost)
          - storage_cost_rate * (months the facility is rented)

Interest rates are zero, so no discounting is applied and the cash flows can
simply be summed. There is no transport delay, so gas injected on a date is
available to be withdrawn on any later date.

The client may inject and withdraw on multiple dates, so the model steps
through the dates in chronological order, tracking the volume in the tank.
Two physical constraints bind at every step:
  - the injection/withdrawal RATE limits how much gas can be moved in one go;
  - the tank has a MAXIMUM VOLUME, so we cannot inject gas we have no room
    for, and we cannot withdraw gas we do not hold.

Prices come from the rebuilt Task 1 curve (jpm_task1_price_curve.py).

The upgrade: a pricer answers "what is THIS trade worth?". A trader also wants
"what is the BEST trade this storage allows?", so Part 4 tries every pair of
month-ends over the coming year and finds the most valuable one.
"""

import json

import pandas as pd

from jpm_task1_price_curve import price_on, LAST


# ---------------------------------------------------------------------------
# Part 1: the contract pricer
# ---------------------------------------------------------------------------

def months_between(first, last):
    """Number of storage months billed between two dates, counted inclusively
    on calendar months, since the facility is rented by the month."""
    first, last = pd.Timestamp(first), pd.Timestamp(last)
    return (last.year - first.year) * 12 + (last.month - first.month) + 1


def price_contract(in_dates, out_dates, in_prices=None, out_prices=None,
                   rate=None, max_volume=None, storage_cost_rate=0.0,
                   injection_withdrawal_cost_rate=0.0, transport_cost=0.0,
                   verbose=False):
    """Value a gas storage contract.

    in_dates    : dates on which gas is injected (bought)
    out_dates   : dates on which gas is withdrawn (sold)
    in_prices   : purchase prices ($/MMBtu) on the injection dates.
                  If None, the Task 1 curve is used.
    out_prices  : sale prices ($/MMBtu) on the withdrawal dates.
                  If None, the Task 1 curve is used.
    rate        : maximum volume (MMBtu) that can be injected or withdrawn
                  on any single date
    max_volume  : maximum volume (MMBtu) the facility can hold
    storage_cost_rate            : fixed rent ($) per month of storage
    injection_withdrawal_cost_rate : cost ($/MMBtu) each time gas is moved
    transport_cost               : fixed cost ($) per injection or withdrawal
    verbose     : print the cash flow ledger

    Returns the net value of the contract in dollars.
    """
    # Fall back to the Task 1 curve where the desk has not supplied a
    # traded price. This lets the client quote off dates alone.
    if in_prices is None:
        in_prices = [price_on(d) for d in in_dates]
    if out_prices is None:
        out_prices = [price_on(d) for d in out_dates]

    # Build one chronological list of events, so that injections and
    # withdrawals interleave correctly however the client orders their dates.
    events = ([(pd.Timestamp(d), 'inject', p)
               for d, p in zip(in_dates, in_prices)]
              + [(pd.Timestamp(d), 'withdraw', p)
                 for d, p in zip(out_dates, out_prices)])
    events.sort(key=lambda e: e[0])

    volume = 0.0          # gas currently in the tank (MMBtu)
    value = 0.0           # running value of the contract ($)
    ledger = []

    for event_date, action, price in events:
        if action == 'inject':
            # We can only inject at the rate, and only as much as the tank
            # still has room for.
            moved = min(rate, max_volume - volume)
            if moved <= 0:
                ledger.append((event_date, 'inject', 0.0, 0.0, volume,
                               'tank full - no gas injected'))
                continue
            volume += moved
            # Pay for the gas, pay to inject it, pay to truck it in.
            cash = -(moved * price
                     + moved * injection_withdrawal_cost_rate
                     + transport_cost)
        else:
            # We can only withdraw at the rate, and only gas we actually hold.
            moved = min(rate, volume)
            if moved <= 0:
                ledger.append((event_date, 'withdraw', 0.0, 0.0, volume,
                               'tank empty - no gas withdrawn'))
                continue
            volume -= moved
            # Receive the sale proceeds, pay to withdraw it, pay to truck it out.
            cash = (moved * price
                    - moved * injection_withdrawal_cost_rate
                    - transport_cost)

        value += cash
        ledger.append((event_date, action, moved, cash, volume, ''))

    # Rent is paid for every month the facility is held, from the first
    # injection through to the final withdrawal.
    if events:
        rent_months = months_between(events[0][0], events[-1][0])
        rent = storage_cost_rate * rent_months
        value -= rent
    else:
        rent_months, rent = 0, 0.0

    if verbose:
        print('  {:<12} {:<9} {:>12} {:>14} {:>12}  {}'
              .format('Date', 'Action', 'Volume', 'Cash flow', 'In tank', ''))
        for d, a, m, c, v, note in ledger:
            print('  {:<12} {:<9} {:>12,.0f} {:>14,.0f} {:>12,.0f}  {}'
                  .format(d.strftime('%Y-%m-%d'), a, m, c, v, note))
        print('  {:<12} {:<9} {:>12} {:>14,.0f} {:>12}  {} months rent'
              .format('storage', 'rent', '', -rent, '', rent_months))
        print('  Contract value: ${:,.2f}'.format(value))

    return value


# The terms used throughout: the same as Example 1 below
TERMS = dict(
    rate=1e6,                             # 1 million MMBtu per movement
    max_volume=1e6,                       # tank holds 1 million MMBtu
    storage_cost_rate=100_000,            # $100K per month rent
    injection_withdrawal_cost_rate=0.01,  # $10K per 1m MMBtu moved
    transport_cost=50_000,                # $50K each way
)


# ---------------------------------------------------------------------------
# Part 2: the best months to use the storage
# ---------------------------------------------------------------------------

def best_months(terms=TERMS):
    """Try every (inject, withdraw) pair of month-ends from the last data
    point to a year ahead, filling and emptying the tank once.

    Returns the month-ends, their prices, a grid of contract values
    (None where the withdrawal is not after the injection) and the best pair.
    """
    months = pd.date_range(LAST, periods=13, freq='ME')       # Sep 2024 .. Sep 2025
    prices = [price_on(m) for m in months]
    grid = [[None] * len(months) for _ in months]
    best = None
    for i, buy in enumerate(months):
        for j, sell in enumerate(months):
            if j <= i:
                continue
            v = price_contract([buy], [sell], [prices[i]], [prices[j]], **terms)
            grid[i][j] = v
            if best is None or v > best[2]:
                best = (buy, sell, v)
    return months, prices, grid, best


def export_for_website(months, prices, grid, best, path='task2_data.json'):
    out = {
        'months': [m.strftime('%Y-%m-%d') for m in months],
        'prices': [round(p, 6) for p in prices],
        'terms': {k: float(v) for k, v in TERMS.items()},
        'grid': [[None if v is None else round(v) for v in row] for row in grid],
        'best': {'inject': best[0].strftime('%Y-%m-%d'), 'withdraw': best[1].strftime('%Y-%m-%d'),
                 'value': round(best[2])},
    }
    with open(path, 'w') as f:
        json.dump(out, f)


# ---------------------------------------------------------------------------
# Part 3: sample inputs
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    # The trade the client has in mind: buy gas cheap in summer, store it,
    # sell it into the winter peak.
    print('\nExample 1 - single summer injection, single winter withdrawal')
    print('Injection price:  ${:.2f}/MMBtu on 2024-06-30'.format(price_on('2024-06-30')))
    print('Withdrawal price: ${:.2f}/MMBtu on 2024-12-31'.format(price_on('2024-12-31')))
    price_contract(in_dates=['2024-06-30'], out_dates=['2024-12-31'], verbose=True, **TERMS)

    # The client fills the tank over several summer months and empties it
    # over several winter months, at a rate of 500k MMBtu per movement.
    print('\nExample 2 - staggered injections and withdrawals')
    price_contract(
        in_dates=['2024-06-30', '2024-07-31', '2024-08-31'],
        out_dates=['2024-12-31', '2025-01-31', '2025-02-28'],
        **{**TERMS, 'rate': 5e5}, verbose=True)          # only 2 of the 3 injections fit

    # A trade that looks profitable on the price difference alone, but is
    # destroyed by the rent once the gas is held for a long time.
    print('\nExample 3 - carry too long and the rent eats the spread')
    price_contract(in_dates=['2024-06-30'], out_dates=['2025-06-30'], verbose=True, **TERMS)

    # The desk can also override the curve and pass traded prices directly.
    print('\nExample 4 - desk supplies its own prices')
    price_contract(in_dates=['2024-06-30'], out_dates=['2024-12-31'],
                   in_prices=[2.0], out_prices=[3.0], verbose=True, **TERMS)

    # The upgrade: search every pair of months over the coming year
    months, prices, grid, best = best_months()
    print('\nBest single fill-and-empty over the coming year')
    print('  Inject {} at ${:.2f}, withdraw {} at ${:.2f}: worth ${:,.0f}'.format(
        best[0].date(), price_on(best[0]), best[1].date(), price_on(best[1]), best[2]))
    worth = sum(v > 0 for row in grid for v in row if v is not None)
    total = sum(v is not None for row in grid for v in row)
    print('  {} of {} possible month pairs make money'.format(worth, total))
    export_for_website(months, prices, grid, best)
