"""
J.P. Morgan Quantitative Research (Forage) - Task 4
Bucket FICO scores into a small number of ratings, so that Charlie's
categorical model has a sensible set of input labels.

FICO runs from 300 to 850 and takes integer values, so it cannot be fed to a
model that needs categories. We must choose r-1 boundaries that split the
range into r buckets, and we want the split that best summarises the data.

Two objectives are implemented, both solved exactly by dynamic programming:

1. MEAN SQUARED ERROR. Treat the buckets as an approximation of the FICO
   scores themselves: every borrower in a bucket is represented by the bucket
   mean, and we minimise

       MSE = (1/n) * sum_i (Y_i - Yhat_i)^2

   This is the classic 1-D quantisation problem. It summarises the *scores*
   well, but it knows nothing about defaults - it would place boundaries in
   exactly the same spots if the default column were deleted.

2. LOG-LIKELIHOOD. Treat each bucket as a Bernoulli trial with its own
   default probability p_i = k_i / n_i, and maximise

       LL(b_1, ..., b_{r-1}) = sum_i [ k_i ln(p_i) + (n_i - k_i) ln(1 - p_i) ]

   where n_i is the number of borrowers in bucket i and k_i the number who
   defaulted. This is the objective the risk team actually cares about: it
   puts boundaries where the default rate genuinely changes, so each rating
   is a homogeneous risk pool. It is the one taken forward.

Both objectives decompose over buckets - the score of a partition is the sum
of the scores of its parts - and each part depends only on where it starts and
ends. That is exactly the structure dynamic programming exploits, so we can
find the GLOBAL optimum rather than a greedy approximation. The brief suggests
splitting the range at 600 and doing five buckets either side; that is not
necessary once the DP is written, and it would impose an arbitrary boundary.

Convention: a LOWER rating means a BETTER credit score, so rating 1 is the
top FICO bucket and rating r is the riskiest.
"""

import pandas as pd
import numpy as np
from matplotlib import pyplot as plt

N_BUCKETS = 10

# ---------------------------------------------------------------------------
# Part 1: collapse the loan book onto the distinct FICO scores
# ---------------------------------------------------------------------------

df = pd.read_csv('Task_3_and_4_Loan_Data.csv')

# The DP runs over distinct FICO values, not over borrowers, so first count
# how many borrowers sit on each score and how many of them defaulted.
grouped = (df.groupby('fico_score')['default']
             .agg(['count', 'sum'])
             .rename(columns={'count': 'n', 'sum': 'k'})
             .reset_index())

scores = grouped['fico_score'].values.astype(float)   # distinct FICO values
n = grouped['n'].values.astype(float)                 # borrowers at each score
k = grouped['k'].values.astype(float)                 # defaults at each score
S = len(scores)

print('FICO scores range from {:.0f} to {:.0f}, {} distinct values'
      .format(scores.min(), scores.max(), S))
print('{:,} borrowers, {:.2%} defaulted'.format(int(n.sum()), k.sum() / n.sum()))

# Prefix sums let us score any candidate bucket [i, j) in constant time,
# which is what keeps the DP fast enough to be exact.
cum_n = np.concatenate([[0], np.cumsum(n)])
cum_k = np.concatenate([[0], np.cumsum(k)])
cum_x = np.concatenate([[0], np.cumsum(n * scores)])          # sum of scores
cum_x2 = np.concatenate([[0], np.cumsum(n * scores ** 2)])    # sum of squares


# ---------------------------------------------------------------------------
# Part 2: the two bucket-scoring functions
# ---------------------------------------------------------------------------

def bucket_log_likelihood(i, j):
    """Log-likelihood of the bucket covering score indices [i, j)."""
    n_i = cum_n[j] - cum_n[i]
    if n_i == 0:
        return 0.0
    k_i = cum_k[j] - cum_k[i]
    p_i = k_i / n_i
    # A bucket that is all defaults or all survivors is perfectly explained,
    # contributing zero. Taking 0 * ln(0) = 0 avoids the numerical blow-up.
    if p_i == 0 or p_i == 1:
        return 0.0
    return k_i * np.log(p_i) + (n_i - k_i) * np.log(1 - p_i)


def bucket_squared_error(i, j):
    """Negative sum of squared errors for the bucket [i, j), so that, like
    the log-likelihood, LARGER is better and the same DP can drive both.

    Representing every score in the bucket by the bucket mean, the sum of
    squared errors is
        sum (x - xbar)^2 = sum(x^2) - (sum x)^2 / n
    which the prefix sums give us directly.
    """
    n_i = cum_n[j] - cum_n[i]
    if n_i == 0:
        return 0.0
    sum_x = cum_x[j] - cum_x[i]
    sum_x2 = cum_x2[j] - cum_x2[i]
    return -(sum_x2 - (sum_x ** 2) / n_i)


# ---------------------------------------------------------------------------
# Part 3: the dynamic program
# ---------------------------------------------------------------------------

def optimal_buckets(score_fn, r, min_size=0):
    """Partition the distinct scores into r contiguous buckets so as to
    MAXIMISE the total of score_fn over the buckets.

    dp[b][j] = best achievable total using b buckets to cover the first j
               distinct scores
    dp[b][j] = max over i < j of ( dp[b-1][i] + score_fn(i, j) )

    Reading the argmax back from dp[r][S] recovers the boundaries. The DP
    considers every possible split point, so the result is the global
    optimum, not a greedy or heuristic partition.

    min_size is the smallest number of BORROWERS allowed in a bucket. Left
    unconstrained, the log-likelihood objective will isolate a handful of
    borrowers sitting on a single score whose default rate happens to be
    extreme, because an extreme p_i inflates the likelihood. Such a bucket is
    noise: it breaks the monotonicity of the rating scale and would not
    survive into next year's data. Requiring a minimum population is the
    standard remedy, and here it costs almost nothing in likelihood.
    """
    NEG_INF = -np.inf
    dp = np.full((r + 1, S + 1), NEG_INF)
    split = np.zeros((r + 1, S + 1), dtype=int)
    dp[0][0] = 0.0

    for b in range(1, r + 1):
        for j in range(b, S + 1):
            # Each of the b buckets needs at least one score, so the previous
            # boundary i must leave room: b-1 <= i <= j-1.
            for i in range(b - 1, j):
                if dp[b - 1][i] == NEG_INF:
                    continue
                if cum_n[j] - cum_n[i] < min_size:
                    continue
                total = dp[b - 1][i] + score_fn(i, j)
                if total > dp[b][j]:
                    dp[b][j] = total
                    split[b][j] = i

    # Walk the split table backwards to recover the bucket edges
    edges = [S]
    j = S
    for b in range(r, 0, -1):
        j = split[b][j]
        edges.append(j)
    edges.reverse()
    return dp[r][S], edges


# Require every rating to hold at least 2% of the book.
#
# This is not decoration - the unconstrained log-likelihood optimum is broken.
# Two failure modes appear at the top of the FICO range, where defaults are
# rare:
#   * it isolates the 8 borrowers sitting on FICO 753, 3 of whom defaulted, as
#     a bucket with a 37.5% default rate - a pure statistical accident;
#   * worse, a bucket with NO defaults scores exactly 0, which is the largest
#     value the log-likelihood can take, so the objective is positively drawn
#     to carving out zero-default pockets.
# Either way the resulting scale is not monotone in risk: a rating of 2 ends up
# safer than a rating of 1, which is indefensible to a credit committee.
#
# A 2% floor removes both, at a cost of about 3 points of log-likelihood.
# It was chosen by sweeping the floor and checking monotonicity - see the
# check below, which fails the run rather than shipping a broken scale.
MIN_BUCKET = int(0.02 * n.sum())

print('\nRunning the dynamic program for {} buckets...'.format(N_BUCKETS))
ll_unconstrained, ll_edges_unc = optimal_buckets(
    bucket_log_likelihood, N_BUCKETS)
ll_total, ll_edges = optimal_buckets(
    bucket_log_likelihood, N_BUCKETS, min_size=MIN_BUCKET)
mse_total, mse_edges = optimal_buckets(
    bucket_squared_error, N_BUCKETS, min_size=MIN_BUCKET)

print('Optimal log-likelihood (unconstrained): {:,.2f}'.format(ll_unconstrained))
print('Optimal log-likelihood (min {} per bucket): {:,.2f}'
      .format(MIN_BUCKET, ll_total))
print('Optimal MSE: {:,.4f}'.format(-mse_total / n.sum()))


def edges_to_boundaries(edges):
    """Turn DP index edges into the FICO score at the start of each bucket."""
    return [float(scores[i]) for i in edges[:-1]]


# ---------------------------------------------------------------------------
# Part 4: report the buckets
# ---------------------------------------------------------------------------

def summarise(edges, label):
    """Print each bucket with its FICO range, population and default rate."""
    print('\n{} - {} buckets'.format(label, len(edges) - 1))
    print('  {:<8} {:>14} {:>9} {:>9} {:>9}'
          .format('Rating', 'FICO range', 'Borrowers', 'Defaults', 'PD'))
    rows = []
    r = len(edges) - 1
    for b in range(r):
        i, j = edges[b], edges[b + 1]
        lo, hi = scores[i], scores[j - 1]
        n_i = cum_n[j] - cum_n[i]
        k_i = cum_k[j] - cum_k[i]
        p_i = k_i / n_i if n_i else 0.0
        # Rating 1 is the BEST credit, i.e. the highest FICO bucket, so the
        # ratings run backwards relative to the bucket order.
        rating = r - b
        rows.append((rating, lo, hi, n_i, k_i, p_i))
    for rating, lo, hi, n_i, k_i, p_i in sorted(rows):
        print('  {:<8} {:>6.0f} - {:<5.0f} {:>9,.0f} {:>9,.0f} {:>8.2%}'
              .format(rating, lo, hi, n_i, k_i, p_i))
    return rows


summarise(ll_edges_unc, 'LOG-LIKELIHOOD buckets, UNCONSTRAINED (rejected: '
                        'note the degenerate bucket and the broken monotonicity)')
ll_rows = summarise(ll_edges, 'LOG-LIKELIHOOD buckets, min {} per bucket '
                              '(ADOPTED)'.format(MIN_BUCKET))
mse_rows = summarise(mse_edges, 'MEAN SQUARED ERROR buckets')


# A rating scale is only usable if risk falls monotonically as the rating
# improves. Check it rather than trust it.
pd_by_rating = [p for rating, lo, hi, n_i, k_i, p in sorted(ll_rows)]
is_monotone = all(pd_by_rating[i] < pd_by_rating[i + 1]
                  for i in range(len(pd_by_rating) - 1))
print('\nRating scale is monotone in risk: {}'.format(is_monotone))
assert is_monotone, 'Rating scale is not monotone - raise MIN_BUCKET'

# Equal-frequency (quantile) buckets, the naive baseline a risk team would
# reach for first. Useful as a sanity check on how much the DP actually buys.
quantile_edges = [0]
for q in range(1, N_BUCKETS):
    target = q * n.sum() / N_BUCKETS
    quantile_edges.append(int(np.searchsorted(cum_n, target)))
quantile_edges.append(S)
quantile_edges = sorted(set(quantile_edges))
quantile_ll = sum(bucket_log_likelihood(quantile_edges[b], quantile_edges[b + 1])
                  for b in range(len(quantile_edges) - 1))

print('\nLog-likelihood achieved by each method (higher is better)')
print('  {:<28} {:>14,.2f}'.format('Log-likelihood DP', ll_total))
print('  {:<28} {:>14,.2f}'.format('MSE DP', sum(
    bucket_log_likelihood(mse_edges[b], mse_edges[b + 1])
    for b in range(len(mse_edges) - 1))))
print('  {:<28} {:>14,.2f}'.format('Equal-frequency (quantile)', quantile_ll))


# ---------------------------------------------------------------------------
# Part 5: the deliverable - the rating map
# ---------------------------------------------------------------------------

LL_BOUNDARIES = edges_to_boundaries(ll_edges)   # lower edge of each bucket


def fico_rating(fico_score, boundaries=LL_BOUNDARIES):
    """Map a FICO score to a rating. Rating 1 is the best credit."""
    r = len(boundaries)
    # Which bucket does the score fall into, counting up from the lowest?
    bucket = int(np.searchsorted(boundaries, fico_score, side='right')) - 1
    bucket = min(max(bucket, 0), r - 1)
    return r - bucket


# The PD attached to each rating, which is what Charlie's model consumes:
# a categorical input plus the historical default rate of that pool.
RATING_PD = {rating: p for rating, lo, hi, n_i, k_i, p in ll_rows}


def rating_pd(fico_score):
    """Historical probability of default for the rating this score falls in."""
    return RATING_PD[fico_rating(fico_score)]


# ---------------------------------------------------------------------------
# Part 6: charts and sample inputs
# ---------------------------------------------------------------------------

plt.figure(figsize=(10, 5))
plt.hist(df['fico_score'], bins=60, color='lightsteelblue',
         edgecolor='white', label='FICO distribution')
for boundary in LL_BOUNDARIES[1:]:
    plt.axvline(boundary, color='crimson', linestyle='--', linewidth=1)
plt.axvline(LL_BOUNDARIES[1], color='crimson', linestyle='--', linewidth=1,
            label='Bucket boundaries (log-likelihood)')
plt.xlabel('FICO score')
plt.ylabel('Number of borrowers')
plt.title('FICO Distribution and Optimal Bucket Boundaries')
plt.legend()
plt.tight_layout()
plt.savefig('07_fico_buckets.png', dpi=150)
plt.close()

# Default rate by rating - the whole point of the exercise is that this is
# monotone and well separated.
ratings = [r for r, lo, hi, n_i, k_i, p in sorted(ll_rows)]
pds = [p for r, lo, hi, n_i, k_i, p in sorted(ll_rows)]
plt.figure(figsize=(8, 5))
plt.bar([str(r) for r in ratings], pds, color='steelblue')
plt.xlabel('Rating (1 = best credit)')
plt.ylabel('Probability of default')
plt.title('Default Rate by FICO Rating')
plt.tight_layout()
plt.savefig('08_pd_by_rating.png', dpi=150)
plt.close()

if __name__ == '__main__':
    print('\nBucket boundaries (lower edge of each FICO bucket):')
    print('  {}'.format([int(b) for b in LL_BOUNDARIES]))

    print('\nSample borrowers')
    print('  {:>6} {:>8} {:>8}'.format('FICO', 'Rating', 'PD'))
    for score in [408, 520, 580, 611, 640, 680, 720, 780, 850]:
        print('  {:>6} {:>8} {:>8.2%}'
              .format(score, fico_rating(score), rating_pd(score)))


# ---------------------------------------------------------------------------
# Part 7: do the ratings keep the information in the raw score?
# ---------------------------------------------------------------------------
# Ten ratings throw away detail: everyone from 733 to 850 is treated alike.
# AUC measures how well a score ranks defaulters above non-defaulters
# (0.5 = a coin toss, 1.0 = perfect). If the ratings' AUC is close to the raw
# FICO score's, the buckets kept almost all of the useful information.

from sklearn.metrics import roc_auc_score
import json

AUC_RAW = roc_auc_score(df['default'], -df['fico_score'])          # lower FICO = riskier
AUC_RATING = roc_auc_score(df['default'], df['fico_score'].map(rating_pd))


def export_for_website(path='task4_data.json'):
    trap = [r for r in sorted(_rows(ll_edges_unc)) if r[3] < MIN_BUCKET]
    out = {
        'buckets': [[int(r), int(lo), int(hi), int(n_i), int(k_i), round(float(p), 4)]
                    for r, lo, hi, n_i, k_i, p in sorted(ll_rows)],
        'methods': [['Log-likelihood (mine)', round(float(ll_total), 2)],
                    ['Squared error', round(float(sum(bucket_log_likelihood(mse_edges[b], mse_edges[b + 1])
                                                       for b in range(len(mse_edges) - 1))), 2)],
                    ['Equal-sized buckets', round(float(quantile_ll), 2)]],
        'trap': [[int(lo), int(hi), int(n_i), int(k_i), round(float(p), 4)] for r, lo, hi, n_i, k_i, p in trap],
        'min_bucket': int(MIN_BUCKET),
        'auc_raw': round(float(AUC_RAW), 4),
        'auc_rating': round(float(AUC_RATING), 4),
    }
    with open(path, 'w') as f:
        json.dump(out, f)


def _rows(edges):
    """Bucket rows (rating, lo, hi, n, k, pd) without printing."""
    r = len(edges) - 1
    rows = []
    for b in range(r):
        i, j = edges[b], edges[b + 1]
        n_i, k_i = cum_n[j] - cum_n[i], cum_k[j] - cum_k[i]
        rows.append((r - b, scores[i], scores[j - 1], n_i, k_i, k_i / n_i if n_i else 0.0))
    return rows


if __name__ == '__main__':
    print('\nRanking power (AUC): raw FICO {:.4f}, 10 ratings {:.4f}'.format(AUC_RAW, AUC_RATING))
    export_for_website()
