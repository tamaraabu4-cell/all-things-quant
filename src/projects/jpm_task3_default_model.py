"""
J.P. Morgan Quantitative Research (Forage) - Task 3, rebuilt
Predict which borrowers will default, and the loss the bank should expect.

Data: 10,000 personal loans (Task_3_and_4_Loan_Data.csv, from the simulation)
with each borrower's credit lines, loan and total debt, income, years
employed, FICO score, and whether they defaulted.

The brief: build a model that takes a borrower's details and returns their
probability of default (PD), then the expected loss on the loan, assuming
the bank recovers 10% of what it lent when someone defaults.

    Expected loss = PD x LGD x EAD
      PD  = probability of default (from the model)
      LGD = loss given default = 1 - recovery rate = 90%
      EAD = exposure at default = the loan amount outstanding

The model is a logistic regression. It is not the most powerful choice, but
every coefficient can be read and explained to a credit committee, which is
what a bank's risk team needs before trusting it. To be honest about how well
it works, it is trained on 70% of the borrowers and tested on the 30% it has
never seen.

A warning I found along the way: on the unseen borrowers the model scores an
AUC of 1.000, i.e. it separates defaulters perfectly. Real credit models land
around 0.7 to 0.85, so a perfect score is a reason to investigate, not to
celebrate. Part 4 shows why: this practice dataset is synthetic, and default
is almost entirely decided by debt-to-income and the number of credit lines.
The method carries over to real data; the near-perfect accuracy would not.
"""

import json

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

DATA_FILE = 'Task_3_and_4_Loan_Data.csv'
RECOVERY_RATE = 0.10
FEATURES = ['credit_lines_outstanding', 'debt_to_income', 'payment_to_income',
            'years_employed', 'fico_score']
LABELS = {
    'credit_lines_outstanding': 'Credit lines open',
    'debt_to_income': 'Total debt / income',
    'payment_to_income': 'Loan / income',
    'years_employed': 'Years employed',
    'fico_score': 'FICO score',
}


# ---------------------------------------------------------------------------
# Part 1: load the loan book and build the ratios
# ---------------------------------------------------------------------------

def add_ratios(df):
    """Debt and loan size only mean something relative to income: $10,000 of
    debt is heavy on $25,000 a year and light on $150,000."""
    df = df.copy()
    df['debt_to_income'] = df['total_debt_outstanding'] / df['income']
    df['payment_to_income'] = df['loan_amt_outstanding'] / df['income']
    return df


LOANS = add_ratios(pd.read_csv(DATA_FILE))


# ---------------------------------------------------------------------------
# Part 2: train on 70%, test on the 30% the model never sees
# ---------------------------------------------------------------------------

train, test = train_test_split(LOANS, test_size=0.3, random_state=42,
                               stratify=LOANS['default'])

# Scaling puts every feature on the same footing, so the coefficients can be
# compared: each one is the effect of a one-standard-deviation change.
MODEL = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
MODEL.fit(train[FEATURES], train['default'])

test_pd = MODEL.predict_proba(test[FEATURES])[:, 1]
AUC = roc_auc_score(test['default'], test_pd)
BRIER = brier_score_loss(test['default'], test_pd)
ACCURACY = float(np.mean((test_pd >= 0.5) == test['default']))

# Benchmark: the same model using FICO alone. How much does the extra
# information about debt, income and employment actually add?
fico_only = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
fico_only.fit(train[['fico_score']], train['default'])
AUC_FICO_ONLY = roc_auc_score(test['default'], fico_only.predict_proba(test[['fico_score']])[:, 1])


# ---------------------------------------------------------------------------
# Part 3: the deliverable - PD and expected loss for any borrower
# ---------------------------------------------------------------------------

def probability_of_default(borrower):
    """borrower: a dict with credit_lines_outstanding, loan_amt_outstanding,
    total_debt_outstanding, income, years_employed and fico_score."""
    row = add_ratios(pd.DataFrame([borrower]))
    return float(MODEL.predict_proba(row[FEATURES])[0, 1])


def expected_loss(borrower, recovery_rate=RECOVERY_RATE):
    """Expected loss on the loan = PD x (1 - recovery) x amount outstanding."""
    return (probability_of_default(borrower) * (1 - recovery_rate)
            * borrower['loan_amt_outstanding'])


# ---------------------------------------------------------------------------
# Part 4: checks a risk team would ask for
# ---------------------------------------------------------------------------

def calibration(n_bins=10):
    """Sort test borrowers by predicted PD into ten equal groups and compare
    the average prediction with the share who actually defaulted. If the
    model is calibrated, the two match: a 20% PD should default 20% of the time."""
    t = test.assign(pd_hat=test_pd)
    t['group'] = pd.qcut(t['pd_hat'], n_bins, labels=False, duplicates='drop')
    g = t.groupby('group').agg(predicted=('pd_hat', 'mean'), actual=('default', 'mean'))
    return g


def portfolio_check():
    """Does expected loss add up to the loss that actually happened on the
    test book? Realised loss = 90% of every defaulted loan."""
    ead = test['loan_amt_outstanding']
    expected = float(np.sum(test_pd * (1 - RECOVERY_RATE) * ead))
    realised = float(np.sum(test['default'] * (1 - RECOVERY_RATE) * ead))
    return expected, realised


def why_so_good():
    """Default rate across the book, by tenth of debt-to-income and by number
    of credit lines. Real data never shows walls this sharp."""
    by_dti = LOANS.groupby(pd.qcut(LOANS['debt_to_income'], 10), observed=True)['default'].mean()
    by_lines = LOANS.groupby('credit_lines_outstanding')['default'].mean()
    return by_dti, by_lines


def coefficients():
    lr = MODEL.named_steps['logisticregression']
    return dict(zip(FEATURES, lr.coef_[0]))


# ---------------------------------------------------------------------------
# Part 5: numbers and charts for the website
# ---------------------------------------------------------------------------

def export_for_website(path='task3_data.json'):
    fpr, tpr, _ = roc_curve(test['default'], test_pd)
    keep = np.unique(np.linspace(0, len(fpr) - 1, 60).astype(int))
    cal = calibration()
    expected, realised = portfolio_check()
    out = {
        'auc': round(AUC, 4), 'auc_fico_only': round(AUC_FICO_ONLY, 4),
        'accuracy': round(ACCURACY, 4), 'brier': round(BRIER, 4),
        'n_train': len(train), 'n_test': len(test),
        'default_rate': round(float(LOANS['default'].mean()), 4),
        'roc': [[round(float(fpr[i]), 4), round(float(tpr[i]), 4)] for i in keep],
        'calibration': [[round(float(p), 4), round(float(a), 4)]
                        for p, a in zip(cal['predicted'], cal['actual'])],
        'coefficients': [[LABELS[f], round(float(c), 3)]
                         for f, c in sorted(coefficients().items(), key=lambda x: -abs(x[1]))],
        'portfolio': {'expected': round(expected), 'realised': round(realised)},
        'by_dti': [['{:.0%}–{:.0%}'.format(iv.left if iv.left > 0 else 0, iv.right), round(float(r), 4)]
                   for iv, r in why_so_good()[0].items()],
        'by_lines': [[int(k), round(float(r), 4)] for k, r in why_so_good()[1].items()],
        'examples': EXAMPLES_OUT,
    }
    with open(path, 'w') as f:
        json.dump(out, f)


EXAMPLES = [
    ('Steady borrower', dict(credit_lines_outstanding=0, loan_amt_outstanding=4000,
                             total_debt_outstanding=5000, income=75000,
                             years_employed=6, fico_score=680)),
    ('Stretched borrower', dict(credit_lines_outstanding=4, loan_amt_outstanding=6000,
                                total_debt_outstanding=25000, income=40000,
                                years_employed=2, fico_score=580)),
    ('On the edge', dict(credit_lines_outstanding=3, loan_amt_outstanding=5000,
                         total_debt_outstanding=9500, income=50000,
                         years_employed=4, fico_score=620)),
]
EXAMPLES_OUT = [{'name': n, 'pd': round(probability_of_default(b), 4),
                 'el': round(expected_loss(b), 2), 'loan': b['loan_amt_outstanding']}
                for n, b in EXAMPLES]


def save_charts():
    from matplotlib import pyplot as plt
    fpr, tpr, _ = roc_curve(test['default'], test_pd)
    plt.figure(figsize=(6, 6))
    plt.plot(fpr, tpr, label='Model (AUC {:.3f})'.format(AUC))
    plt.plot([0, 1], [0, 1], ':', label='Coin toss (AUC 0.5)')
    plt.xlabel('Good borrowers wrongly flagged')
    plt.ylabel('Defaulters caught')
    plt.title('How well the model separates defaulters (test set)')
    plt.legend()
    plt.tight_layout()
    plt.savefig('task3_roc.png', dpi=150)
    plt.close()

    cal = calibration()
    plt.figure(figsize=(6, 6))
    plt.plot(cal['predicted'], cal['actual'], 'o-', label='Model')
    plt.plot([0, 1], [0, 1], ':', label='Perfect calibration')
    plt.xlabel('Predicted probability of default')
    plt.ylabel('Share that actually defaulted')
    plt.title('Calibration on the test set')
    plt.legend()
    plt.tight_layout()
    plt.savefig('task3_calibration.png', dpi=150)
    plt.close()


if __name__ == '__main__':
    print('{:,} loans, {:.2%} defaulted'.format(len(LOANS), LOANS['default'].mean()))
    print('Trained on {:,}, tested on {:,} unseen borrowers\n'.format(len(train), len(test)))
    print('Test-set results')
    print('  AUC:                    {:.4f}   (FICO alone: {:.4f})'.format(AUC, AUC_FICO_ONLY))
    print('  Accuracy at PD >= 50%:  {:.2%}'.format(ACCURACY))
    print('  Brier score:            {:.4f}'.format(BRIER))

    print('\nWhat drives default (one standard deviation change, log-odds)')
    for f, c in sorted(coefficients().items(), key=lambda x: -abs(x[1])):
        print('  {:<24} {:+.3f}'.format(LABELS[f], c))

    print('\nCalibration (predicted vs actual default rate, by tenth of the book)')
    for p, a in calibration().itertuples(index=False):
        print('  predicted {:6.2%}   actual {:6.2%}'.format(p, a))

    by_dti, by_lines = why_so_good()
    print('\nWhy the score is so high: default rate by debt-to-income tenth')
    for iv, r in by_dti.items():
        print('  {:>16}  {:6.1%}'.format(str(iv), r))
    print('  ...and by credit lines open')
    for k, r in by_lines.items():
        print('  {:>16}  {:6.1%}'.format(k, r))

    expected, realised = portfolio_check()
    print('\nTest book: expected loss ${:,.0f} vs realised loss ${:,.0f}'.format(expected, realised))

    print('\nSample borrowers')
    for e in EXAMPLES_OUT:
        print('  {:<20} PD {:6.2%}   expected loss ${:,.2f} on ${:,} lent'.format(
            e['name'], e['pd'], e['el'], e['loan']))

    export_for_website()
    save_charts()
