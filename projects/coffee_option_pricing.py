"""
=============================================================================
CITI MARKETS QUANT  |  COFFEE COMMODITY DESK
Task: Fair-value a 6-month coffee call option using three approaches
      1. Cost-of-carry model      -> fair futures price
      2. Black-Scholes / Black-76 -> closed-form option value
      3. Monte Carlo simulation   -> numerical cross-check + tail risk

Author: Quantitative Analyst Intern
=============================================================================
MARKET DATA (given)
    Spot price      S0    = $1.20 / lb
    Risk-free rate  r     = 2.0%  p.a.
    Storage cost    u     = 1.0%  p.a.
    Time to expiry  T     = 0.5   years
    Strike          K     = $1.25 / lb
    Volatility      sigma = 25%   p.a.
=============================================================================
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.stats import norm

# --------------------------------------------------------------------------
# 0. INPUTS
# --------------------------------------------------------------------------
S0    = 1.20      # spot price, $/lb
r     = 0.02      # risk-free rate, p.a.
u     = 0.01      # storage cost, p.a.
y     = 0.00      # convenience yield (not supplied -> assumed zero)
T     = 0.50      # time to maturity, years
K     = 1.25      # strike, $/lb
sigma = 0.25      # volatility, p.a.

CONTRACT_LBS = 37_500          # ICE "C" contract size
SEED         = 42
N_PATHS      = 500_000

np.random.seed(SEED)


# --------------------------------------------------------------------------
# 1. COST OF CARRY MODEL
#        F = S0 * exp((r + u - y) * T)
#    Derived from a no-arbitrage cash-and-carry argument: borrow at r, buy
#    the beans, pay storage u, receive convenience yield y, sell the future.
# --------------------------------------------------------------------------
def cost_of_carry(S0, r, u, y, T):
    b = r + u - y                      # net cost of carry
    return S0 * np.exp(b * T), b


F, b = cost_of_carry(S0, r, u, y, T)


# --------------------------------------------------------------------------
# 2. BLACK-76 (the futures form of Black-Scholes)
#    Because F already embeds r, u and y, the futures price is a martingale
#    under Q -> drift drops out and exp(-rT) is pure discounting.
# --------------------------------------------------------------------------
def black76(F, K, r, T, sigma):
    """Return call, put, and the Greeks for an option on a futures contract."""
    sqrtT = np.sqrt(T)
    d1 = (np.log(F / K) + 0.5 * sigma ** 2 * T) / (sigma * sqrtT)
    d2 = d1 - sigma * sqrtT
    disc = np.exp(-r * T)

    call = disc * (F * norm.cdf(d1) - K * norm.cdf(d2))
    put  = disc * (K * norm.cdf(-d2) - F * norm.cdf(-d1))

    greeks = {
        "d1":     d1,
        "d2":     d2,
        "N(d1)":  norm.cdf(d1),
        "N(d2)":  norm.cdf(d2),
        "delta":  disc * norm.cdf(d1),                                  # dC/dF
        "gamma":  disc * norm.pdf(d1) / (F * sigma * sqrtT),            # d2C/dF2
        "vega":   disc * F * norm.pdf(d1) * sqrtT / 100,                # per 1 vol pt
        "theta":  (-disc * F * norm.pdf(d1) * sigma / (2 * sqrtT)
                   + r * call) / 365,                                   # per day
        "rho":    -T * call / 100,                                      # per 1% rate
    }
    return call, put, greeks


call_bs, put_bs, g = black76(F, K, r, T, sigma)


# --------------------------------------------------------------------------
# 3. MONTE CARLO SIMULATION
#    V0 = exp(-rT) * E^Q[ max(F_T - K, 0) ]
#    F_T = F * exp(-0.5*sigma^2*T + sigma*sqrt(T)*Z),  Z ~ N(0,1)
#    Antithetic variates used for variance reduction.
# --------------------------------------------------------------------------
def monte_carlo(F, K, r, T, sigma, n_paths=N_PATHS, antithetic=True):
    if antithetic:
        z = np.random.standard_normal(n_paths // 2)
        z = np.concatenate([z, -z])
    else:
        z = np.random.standard_normal(n_paths)

    F_T = F * np.exp(-0.5 * sigma ** 2 * T + sigma * np.sqrt(T) * z)
    payoff = np.maximum(F_T - K, 0.0)

    price = np.exp(-r * T) * payoff.mean()
    stderr = np.exp(-r * T) * payoff.std(ddof=1) / np.sqrt(len(payoff))
    return price, stderr, F_T


call_mc, se_mc, F_T = monte_carlo(F, K, r, T, sigma)
ci_lo, ci_hi = call_mc - 1.96 * se_mc, call_mc + 1.96 * se_mc


# --------------------------------------------------------------------------
# 4. RISK METRICS FROM THE SIMULATED DISTRIBUTION
#    Perspective: a LONG PHYSICAL position of one contract (a producer/roaster
#    holding beans) -- what does the price distribution do to their P&L?
# --------------------------------------------------------------------------
pnl_unhedged = (F_T - F) * CONTRACT_LBS          # $ P&L on 37,500 lbs
var_95  = -np.percentile(pnl_unhedged, 5)        # loss at 95% confidence
var_99  = -np.percentile(pnl_unhedged, 1)
es_99   = -pnl_unhedged[pnl_unhedged <= np.percentile(pnl_unhedged, 1)].mean()

# Protective put: buy the K=1.25 put to floor the sale price
pnl_hedged = pnl_unhedged + np.maximum(K - F_T, 0) * CONTRACT_LBS - put_bs * CONTRACT_LBS
var_99_h = -np.percentile(pnl_hedged, 1)
es_99_h  = -pnl_hedged[pnl_hedged <= np.percentile(pnl_hedged, 1)].mean()


# --------------------------------------------------------------------------
# 5. SENSITIVITY / SCENARIO ANALYSIS
#    Map real-world drivers (weather, geopolitics, supply) onto model inputs.
# --------------------------------------------------------------------------
scenarios = [
    # name,                            S0,   sigma, y,     u
    ("BASE CASE",                      1.20, 0.25,  0.00,  0.01),
    ("Brazil frost (supply shock)",    1.55, 0.45,  0.08,  0.01),
    ("Drought / poor harvest",         1.38, 0.35,  0.05,  0.01),
    ("Bumper crop, high inventories",  1.02, 0.20,  0.00,  0.015),
    ("Freight disruption (Red Sea)",   1.26, 0.32,  0.04,  0.030),
    ("Export ban / tariff shock",      1.35, 0.40,  0.06,  0.015),
    ("Demand slump (recession)",       1.08, 0.28,  0.00,  0.01),
    ("Rates spike to 6%",              1.20, 0.25,  0.00,  0.01),
]

rows = []
for name, s, vol, cy, sto in scenarios:
    rate = 0.06 if "Rates" in name else r
    f_s, _ = cost_of_carry(s, rate, sto, cy, T)
    c_s, p_s, _ = black76(f_s, K, rate, T, vol)
    rows.append({
        "Scenario":        name,
        "Spot":            s,
        "Vol":             vol,
        "Conv. yield":     cy,
        "Futures F":       f_s,
        "Curve":           "Backwardation" if f_s < s else "Contango",
        "Call $/lb":       c_s,
        "Call/contract":   c_s * CONTRACT_LBS,
        "Chg vs base %":   np.nan,
    })

df = pd.DataFrame(rows)
df["Chg vs base %"] = (df["Call $/lb"] / df.loc[0, "Call $/lb"] - 1) * 100


# --------------------------------------------------------------------------
# 6. OUTPUT
# --------------------------------------------------------------------------
line = "=" * 78
print(line)
print("COFFEE OPTION VALUATION  |  6M CALL, STRIKE $1.25/lb".center(78))
print(line)

print("\n[1] COST OF CARRY MODEL   F = S0 * exp((r + u - y) * T)")
print(f"    Net cost of carry b   = {b:.4%}  (r {r:.1%} + u {u:.1%} - y {y:.1%})")
print(f"    Fair futures price F  = ${F:.4f} / lb")
print(f"    Basis (F - S0)        = ${F - S0:+.4f}  ->  "
      f"{'CONTANGO' if F > S0 else 'BACKWARDATION'}")

print("\n[2] BLACK-76 CLOSED FORM   c = exp(-rT)[F*N(d1) - K*N(d2)]")
print(f"    d1 = {g['d1']:+.4f}      N(d1) = {g['N(d1)']:.4f}")
print(f"    d2 = {g['d2']:+.4f}      N(d2) = {g['N(d2)']:.4f}")
print(f"    CALL  = ${call_bs:.4f} / lb   ->  ${call_bs * CONTRACT_LBS:,.0f} per contract")
print(f"    PUT   = ${put_bs:.4f} / lb   ->  ${put_bs * CONTRACT_LBS:,.0f} per contract")
print(f"    Moneyness: F ${F:.4f} vs K ${K:.2f}  -> "
      f"{'OUT-of-the-money' if F < K else 'IN-the-money'}")

print("\n    GREEKS")
print(f"    Delta {g['delta']:+.4f}   Gamma {g['gamma']:+.4f}   "
      f"Vega {g['vega']:+.4f}/vol pt   Theta {g['theta']:+.5f}/day   "
      f"Rho {g['rho']:+.5f}/1%")

print(f"\n[3] MONTE CARLO   ({N_PATHS:,} antithetic paths)")
print(f"    CALL  = ${call_mc:.4f} / lb")
print(f"    95% CI  [${ci_lo:.4f}, ${ci_hi:.4f}]   std error {se_mc:.5f}")
print(f"    Difference vs closed form: ${abs(call_mc - call_bs):.5f} "
      f"({abs(call_mc - call_bs) / call_bs:.2%})  -> models AGREE")
print(f"    P(finish in-the-money) = {(F_T > K).mean():.1%}")

print("\n[4] RISK METRICS  (long 1 contract = 37,500 lb physical coffee)")
print(f"    Unhedged  99% VaR = ${var_99:>9,.0f}     99% ES = ${es_99:>9,.0f}")
print(f"    Put-hedged 99% VaR = ${var_99_h:>9,.0f}     99% ES = ${es_99_h:>9,.0f}")
print(f"    Risk reduction from protective put: "
      f"{(1 - es_99_h / es_99):.1%} of expected shortfall eliminated")
print(f"    Cost of that protection: ${put_bs * CONTRACT_LBS:,.0f} "
      f"({put_bs / S0:.1%} of notional)")

print("\n[5] SCENARIO ANALYSIS  -- how fundamentals reprice the option")
show = df[["Scenario", "Spot", "Vol", "Futures F", "Curve",
           "Call $/lb", "Chg vs base %"]].copy()
print(show.to_string(index=False,
                     formatters={"Spot":          "{:.2f}".format,
                                 "Vol":           "{:.0%}".format,
                                 "Futures F":     "{:.4f}".format,
                                 "Call $/lb":     "{:.4f}".format,
                                 "Chg vs base %": "{:+.1f}%".format}))
print("\n" + line)


# --------------------------------------------------------------------------
# 7. CHARTS
# --------------------------------------------------------------------------
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle("Coffee Call Option — 6M, Strike $1.25/lb", fontsize=15, weight="bold")

# (a) Simulated terminal price distribution
ax = axes[0, 0]
ax.hist(F_T, bins=120, color="#8C6239", alpha=0.75, edgecolor="none")
ax.axvline(K, color="#C0392B", ls="--", lw=2, label=f"Strike ${K:.2f}")
ax.axvline(F, color="#1F4E79", ls="-", lw=2, label=f"Futures ${F:.4f}")
ax.set_title(f"(a) Simulated price at expiry — {(F_T > K).mean():.0%} finish ITM")
ax.set_xlabel("Coffee price at expiry ($/lb)"); ax.set_ylabel("Frequency")
ax.legend()

# (b) Option value vs spot (payoff vs value curve)
ax = axes[0, 1]
spots = np.linspace(0.80, 1.80, 200)
vals = [black76(cost_of_carry(s, r, u, y, T)[0], K, r, T, sigma)[0] for s in spots]
ax.plot(spots, vals, lw=2.5, color="#1F4E79", label="Value today (6M to expiry)")
ax.plot(spots, np.maximum(spots - K, 0), ls="--", lw=1.8,
        color="#C0392B", label="Intrinsic value at expiry")
ax.axvline(S0, color="grey", ls=":", lw=1.5, label=f"Spot ${S0:.2f}")
ax.scatter([S0], [call_bs], zorder=5, s=70, color="#E67E22",
           label=f"Fair value ${call_bs:.4f}")
ax.set_title("(b) Option value vs spot — time value is the gap")
ax.set_xlabel("Spot price ($/lb)"); ax.set_ylabel("Call value ($/lb)")
ax.legend()

# (c) Vol / spot sensitivity surface
ax = axes[1, 0]
for v in [0.15, 0.25, 0.35, 0.45]:
    vals = [black76(cost_of_carry(s, r, u, y, T)[0], K, r, T, v)[0] for s in spots]
    ax.plot(spots, vals, lw=2, label=f"σ = {v:.0%}")
ax.axvline(S0, color="grey", ls=":", lw=1.5)
ax.set_title("(c) Vega: weather/geopolitical risk lifts the whole curve")
ax.set_xlabel("Spot price ($/lb)"); ax.set_ylabel("Call value ($/lb)")
ax.legend()

# (d) Scenario impact
ax = axes[1, 1]
sc = df.iloc[1:].sort_values("Call $/lb")
colours = ["#C0392B" if v < df.loc[0, "Call $/lb"] else "#27AE60"
           for v in sc["Call $/lb"]]
ax.barh(sc["Scenario"], sc["Call $/lb"], color=colours, alpha=0.85)
ax.axvline(df.loc[0, "Call $/lb"], color="#1F4E79", ls="--", lw=2,
           label=f"Base ${df.loc[0, 'Call $/lb']:.4f}")
ax.set_title("(d) Scenario analysis — fundamentals repricing the option")
ax.set_xlabel("Call value ($/lb)")
ax.legend()

plt.tight_layout()
plt.savefig("coffee_option_analysis.png", dpi=150, bbox_inches="tight")
print("Chart saved: coffee_option_analysis.png")

df.to_csv("scenario_analysis.csv", index=False)
print("Table saved: scenario_analysis.csv")
