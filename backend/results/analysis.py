"""
Research Study Data Analysis
Generates all metrics and visualizations for dissertation results chapter
"""

import pandas as pd
import glob
import numpy as np
import matplotlib.pyplot as plt 
from matplotlib.patches import Patch
import seaborn as sns
from datetime import datetime
from collections import Counter
import os
import ast

# CONFIGURATION
# Set visual style
sns.set_style("whitegrid")
plt.rcParams.update({
    'figure.figsize': (10, 6),
    'font.size': 14,
    'axes.titlesize': 14,
    'axes.labelsize': 14,
    'xtick.labelsize': 14,
    'ytick.labelsize': 14,
    'legend.fontsize': 14
})

# Create output directory
os.makedirs('dissertation_results', exist_ok=True)

# Category mapping for normalization
CATEGORY_MAPPING = {
    "PER": "PER",
    "PERSON": "PER",
    "PHONE": "CODE",
}

print("RESEARCH STUDY DATA ANALYSIS")

# STEP 1: LOAD DATA
print("\n[1/13] Loading data...")

sessions_df = pd.read_csv('sessions.csv')
interactions_df = pd.read_csv('interactions.csv')
survey_df = pd.read_csv('surveyResponses.csv')

print(f" Loaded {len(sessions_df)} sessions")
print(f" Loaded {len(interactions_df)} interactions")
print(f" Loaded {len(survey_df)} survey responses")

# Keep raw copy for funnel analysis
sessions_raw = sessions_df.copy()

# STEP 2: FILTER VALID SESSIONS
print("\n[2/13] Filtering valid sessions...")

# Only include completed, non-withdrawn sessions
valid_sessions = sessions_df[
    (sessions_df["surveyCompleted"] == True) &
    (sessions_df["withdrew"] == False)
]

valid_session_ids = valid_sessions["id"]

print(f" Excluded withdrawn users: {sessions_df['withdrew'].sum()}")
print(f" Using completed sessions only: {len(valid_session_ids)}")

# Filter all dataframes to valid sessions only
interactions_df = interactions_df[interactions_df["sessionId"].isin(valid_session_ids)]
survey_df = survey_df[survey_df["sessionId"].isin(valid_session_ids)]
sessions_df = sessions_df[sessions_df["id"].isin(valid_session_ids)]

# STEP 3: CLEAN AND PREPARE DATA
print("\n[3/13] Cleaning data...")

# Convert timestamps
date_columns = ['createdAt', 'consentGivenAt', 'chatStartedAt', 'chatEndedAt', 'surveyCompletedAt']
for col in date_columns:
    if col in sessions_df.columns:
        sessions_df[col] = pd.to_datetime(sessions_df[col])

interactions_df['createdAt'] = pd.to_datetime(interactions_df['createdAt'])

# Parse PII categories
def parse_pii_array(text):
    """Parse PII categories from database format"""
    if pd.isna(text) or text == '':
        return []
    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, list):
            return parsed
        return []
    except:
        return []

def clean_category(cat):
    """Normalize category names"""
    cleaned = cat.strip().replace('"', '').replace('[', '').replace(']', '').upper()
    return CATEGORY_MAPPING.get(cleaned, cleaned)

interactions_df['piiCategoriesDetected'] = interactions_df['piiCategoriesDetected'].apply(parse_pii_array)
interactions_df['piiCategoriesDetected'] = interactions_df['piiCategoriesDetected'].apply(
    lambda lst: [clean_category(x) for x in lst]
)

# Create helper columns
interactions_df['has_pii'] = interactions_df['piiCategoriesDetected'].apply(lambda x: len(x) > 0)
interactions_df['was_blocked'] = interactions_df['enforcementAction'] == 'blocked'
interactions_df['pii_count'] = interactions_df['piiCategoriesDetected'].apply(len)

print(" Data cleaned and prepared")

# STEP 4: PARTICIPANT OVERVIEW
print("\n[4/13] Analyzing participant overview...")

# Funnel metrics
total_sessions = len(sessions_raw)
viewed_info = sessions_raw['infoSheetViewed'].sum()
consented = sessions_raw['consentGiven'].sum()
declined = sessions_raw['consentDeclined'].sum()
started_chat = sessions_raw['chatStarted'].sum()
completed_chat = sessions_raw['chatEndedAt'].notna().sum()
completed_survey = sessions_raw['surveyCompleted'].sum()
withdrew = sessions_raw['withdrew'].sum()

print(f"""
PARTICIPANT FUNNEL
Total Sessions: {total_sessions}
Viewed Info Sheet: {viewed_info} ({viewed_info/total_sessions*100:.1f}%)
Consented: {consented} ({consented/total_sessions*100:.1f}%)
Declined: {declined} ({declined/total_sessions*100:.1f}%)
Started Chat: {started_chat} ({started_chat/total_sessions*100:.1f}%)
Completed Chat: {completed_chat} ({completed_chat/total_sessions*100:.1f}%)
Completed Survey: {completed_survey} ({completed_survey/total_sessions*100:.1f}%)
Withdrew: {withdrew} ({withdrew/total_sessions*100:.1f}%)
Completion Rate: {completed_survey/total_sessions*100:.1f}%
""")

# Session duration
completed_sessions = sessions_df[sessions_df['chatEndedAt'].notna()].copy()
if len(completed_sessions) > 0:
    completed_sessions['duration_minutes'] = (
        completed_sessions['chatEndedAt'] - completed_sessions['chatStartedAt']
    ).dt.total_seconds() / 60

    print(f"""
SESSION DURATION
Mean: {completed_sessions['duration_minutes'].mean():.2f} minutes
Median: {completed_sessions['duration_minutes'].median():.2f} minutes
Min: {completed_sessions['duration_minutes'].min():.2f} minutes
Max: {completed_sessions['duration_minutes'].max():.2f} minutes
""")

# Interactions per session
interactions_per_session = interactions_df.groupby('sessionId').size()
print(f"""
INTERACTIONS PER SESSION
Mean: {interactions_per_session.mean():.2f}
Median: {interactions_per_session.median():.0f}
Min: {interactions_per_session.min()}
Max: {interactions_per_session.max()}
""")

# VISUALIZATION 1: Funnel Chart
stages = ['Total\nSessions', 'Viewed\nInfo', 'Consented', 'Started\nChat', 'Completed\nChat', 'Completed\nSurvey']
counts = [total_sessions, viewed_info, consented, started_chat, completed_chat, completed_survey]
percentages = [100, viewed_info/total_sessions*100, consented/total_sessions*100, 
               started_chat/total_sessions*100, completed_chat/total_sessions*100, 
               completed_survey/total_sessions*100]

# Reverse for funnel visualization
stages_reversed = stages[::-1]
counts_reversed = counts[::-1]
percentages_reversed = percentages[::-1]

fig, ax = plt.subplots(figsize=(12, 6))
colors = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#6A994E', '#577590']

max_val = max(counts_reversed)

for i, (stage, count, color) in enumerate(zip(stages_reversed, counts_reversed, colors[::-1])):
    left = (max_val - count) / 2
    ax.barh(stage, count, left=left, color=color)
    # Centered labels
    ax.text(max_val / 2, i, f'{count} ({percentages_reversed[i]:.1f}%)',
            va='center', ha='center', fontweight='bold', color='white', fontsize=12)

ax.set_title('Participant Progression Through Study', fontsize=14, fontweight='bold')
ax.set_xticks([])
ax.set_xlabel("")
plt.grid(True, which='both', linestyle='--', linewidth=0.5, alpha=0.7)
plt.minorticks_on()
plt.tight_layout()
plt.savefig('dissertation_results/01_funnel_chart.png', dpi=300, bbox_inches='tight')
print("Saved: 01_funnel_chart.png")

# STEP 5: PRIVACY LEAKAGE OVERVIEW
print("\n[5/13] Analyzing privacy leakage...")

total_interactions = len(interactions_df)
interactions_with_pii = interactions_df['has_pii'].sum()
blocked_interactions = interactions_df['was_blocked'].sum()
leakage_rate_interaction = interactions_with_pii / total_interactions * 100

# Sessions with at least one leakage
sessions_with_leakage = interactions_df[interactions_df['has_pii']]['sessionId'].nunique()
total_active_sessions = interactions_df['sessionId'].nunique()
leakage_rate_session = sessions_with_leakage / total_active_sessions * 100

print(f"""
PRIVACY LEAKAGE OVERVIEW
Total Interactions: {total_interactions}
Interactions with PII Detected: {interactions_with_pii} ({leakage_rate_interaction:.1f}%)
Blocked Interactions: {blocked_interactions} ({blocked_interactions/total_interactions*100:.1f}%)
Sessions with ≥1 Leakage: {sessions_with_leakage}/{total_active_sessions} ({leakage_rate_session:.1f}%)
""")

# Enforcement actions breakdown
enforcement_counts = interactions_df['enforcementAction'].value_counts()
print("\nENFORCEMENT ACTIONS")
for action, count in enforcement_counts.items():
    print(f"{action}: {count} ({count/total_interactions*100:.1f}%)")

# VISUALIZATION 2: Leakage Overview (Two Pies)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Pie 1: PII Detection
sizes1 = [interactions_with_pii, total_interactions - interactions_with_pii]
colors1 = ['#E63946', '#457B9D']

ax1.pie(sizes1, autopct='%1.1f%%', colors=colors1, startangle=90, explode=(0.05, 0),
        textprops={'fontsize': 12, 'fontweight': 'bold'})
ax1.set_title('Interactions: PII Detection', fontsize=14, fontweight='bold')
ax1.legend(
    handles=[
        Patch(facecolor='#E63946', label='PII Detected'),
        Patch(facecolor='#457B9D', label='No PII Detected')
    ],
    loc='upper right', fontsize=11
)

# Pie 2: Enforcement Actions
color_map = {'blocked': '#F4A261', 'allowed': '#2A9D8F'}
enforcement_counts = enforcement_counts.reindex(['allowed', 'blocked'])
colors2 = [color_map[label] for label in enforcement_counts.index]

ax2.pie(enforcement_counts.values, autopct='%1.1f%%', colors=colors2, startangle=90,
        textprops={'fontsize': 12, 'fontweight': 'bold'})
ax2.set_title('Enforcement Actions Distribution', fontsize=14, fontweight='bold')
ax2.legend(
    handles=[
        Patch(facecolor='#2A9D8F', label='Allowed'),
        Patch(facecolor='#F4A261', label='Blocked')
    ],
    loc='upper right', fontsize=11
)

plt.tight_layout()
plt.savefig('dissertation_results/02_leakage_overview.png', dpi=300, bbox_inches='tight')
print("Saved: 02_leakage_overview.png")


# STEP 6: PII TYPES AND FREQUENCY
print("\n[6/13] Analyzing PII types and frequencies...")

# Flatten all PII categories
all_pii_categories = []
for categories in interactions_df['piiCategoriesDetected']:
    all_pii_categories.extend(categories)

pii_counter = Counter(all_pii_categories)

print(f"""
PII CATEGORY FREQUENCIES
Total PII Instances Detected: {len(all_pii_categories)}
""")
for category, count in pii_counter.most_common():
    print(f"{category}: {count} ({count/len(all_pii_categories)*100:.1f}%)")

# Average PII types per interaction
pii_interactions = interactions_df[interactions_df['has_pii']]
if len(pii_interactions) > 0:
    avg_pii_per_interaction = pii_interactions['pii_count'].mean()
    print(f"\nAverage PII types per interaction (when detected): {avg_pii_per_interaction:.2f}")

# VISUALIZATION 3: PII Categories Bar Chart
if len(pii_counter) > 0:
    categories = list(pii_counter.keys())
    counts_list = list(pii_counter.values())

    plt.figure(figsize=(12, 6))
    bars = plt.bar(categories, counts_list, color='#E63946', edgecolor='black', linewidth=1.5)
    plt.xlabel('PII Category', fontweight='bold')
    plt.ylabel('Frequency', fontweight='bold')
    plt.title('Frequency of PII Categories Detected', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right')
    plt.grid(True, which='both', linestyle='--', linewidth=0.5, alpha=0.7)
    plt.minorticks_on()

    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height, f'{int(height)}',
                 ha='center', va='bottom', fontweight='bold')

    plt.tight_layout()
    plt.savefig('dissertation_results/03_pii_categories.png', dpi=300, bbox_inches='tight')
    print("Saved: 03_pii_categories.png")

# STEP 7: DIRECT VS INDIRECT LEAKAGE
print("\n[7/13] Analyzing direct vs indirect leakage...")

# Direct = PII explicitly detected
direct_leakage = interactions_df[interactions_df['has_pii']]

# Indirect = Not detected but potentially suspicious (proxy: long messages)
indirect_leakage = interactions_df[
    (~interactions_df['has_pii']) &
    (interactions_df['templatedPrompt'].str.len() > 50)
]

print(f"""
DIRECT VS INDIRECT LEAKAGE
Direct Leakage (explicit PII): {len(direct_leakage)} ({len(direct_leakage)/total_interactions*100:.1f}%)
Indirect Leakage (inferred/contextual): {len(indirect_leakage)} ({len(indirect_leakage)/total_interactions*100:.1f}%)
""")

if (len(direct_leakage) + len(indirect_leakage)) > 0:
    indirect_pct = len(indirect_leakage) / (len(direct_leakage) + len(indirect_leakage)) * 100
    print(f"% of Total Leakage that is Indirect: {indirect_pct:.1f}%")

# VISUALIZATION 4: Direct vs Indirect
leakage_types = ['Direct\n(Explicit PII)', 'Indirect\n(Inferred/Contextual)']
leakage_counts = [len(direct_leakage), len(indirect_leakage)]

plt.figure(figsize=(8, 6))
bars = plt.bar(leakage_types, leakage_counts, color=['#457B9D', '#E63946'], 
               edgecolor='black', linewidth=1.5)
plt.ylabel('Number of Interactions', fontweight='bold', fontsize=14)
plt.title('Direct vs Indirect Privacy Leakage', fontsize=14, fontweight='bold', pad=10)
plt.grid(True, which='both', linestyle='--', linewidth=0.5, alpha=0.7)
plt.minorticks_on()

for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width() / 2, height - 2,
             f'{int(height)} ({height/total_interactions*100:.1f}%)',
             ha='center', va='top', fontsize=14, fontweight='bold', color='white')

plt.tight_layout()
plt.savefig('dissertation_results/04_direct_vs_indirect.png', dpi=300, bbox_inches='tight')
print("Saved: 04_direct_vs_indirect.png")


# STEP 8: SURVEY ANALYSIS
print("\n[8/13] Analyzing survey responses...")

# Likert scale responses
likert_questions = survey_df[survey_df['questionType'] == 'likert'].copy()

if len(likert_questions) > 0:
    likert_map = {
        'Strongly Disagree': 1, 'Disagree': 2, 'Neutral': 3,
        'Agree': 4, 'Strongly Agree': 5
    }
    likert_questions['numeric_response'] = likert_questions['response'].map(likert_map)

    print("\nLIKERT SCALE RESPONSES")
    for question in likert_questions['questionText'].unique():
        q_data = likert_questions[likert_questions['questionText'] == question]['numeric_response']
        print(f"\n{question[:60]}...")
        print(f"  Mean: {q_data.mean():.2f}")
        print(f"  Median: {q_data.median():.1f}")
        print(f"  Std Dev: {q_data.std():.2f}")

    # Correlation: Awareness vs Leakage
    session_awareness = likert_questions.groupby('sessionId')['numeric_response'].mean()
    session_leakage = interactions_df.groupby('sessionId')['has_pii'].sum()

    correlation_df = pd.DataFrame({
        'awareness_score': session_awareness,
        'leakage_count': session_leakage
    }).dropna()

    if len(correlation_df) > 0:
        correlation = correlation_df['awareness_score'].corr(correlation_df['leakage_count'])
        print(f"\nCORRELATION")
        print(f"Awareness vs Leakage: {correlation:.3f}")

# Multiple choice responses
mc_questions = survey_df[survey_df['questionType'] == 'multiple_choice']
if len(mc_questions) > 0:
    print("\nMULTIPLE CHOICE RESPONSES")
    for question in mc_questions['questionText'].unique():
        print(f"\n{question[:60]}...")
        q_data = mc_questions[mc_questions['questionText'] == question]
        response_counts = q_data['response'].value_counts()
        for response, count in response_counts.items():
            print(f"  {response}: {count} ({count/len(q_data)*100:.1f}%)")


# STEP 9: MODEL PERFORMANCE METRICS (GROUND TRUTH)
print("\n[9/13] Preparing for model performance evaluation...")

# Export sample for manual annotation
sample_size = min(50, len(interactions_df))
sample_interactions = interactions_df.sample(n=sample_size, random_state=42)

sample_export = sample_interactions[[
    'id', 'templatedPrompt', 'piiCategoriesDetected', 
    'enforcementAction', 'blockReason', 'blockCategory'
]].copy()

sample_export['piiCategoriesDetected'] = sample_export['piiCategoriesDetected'].apply(
    lambda x: ','.join(x) if len(x) > 0 else ''
)

sample_export.to_csv('dissertation_results/ground_truth_annotation.csv', index=False)
print(f" Exported {sample_size} interactions for manual annotation")
print("   Open: dissertation_results/ground_truth_annotation.csv")
print("   Add columns: 'true_has_pii' and 'true_categories'")
print("   Save as: dissertation_results/ground_truth_labeled.csv")

# Check if labeled file exists
if os.path.exists('dissertation_results/ground_truth_labeled.csv'):
    print("\n Found labeled ground truth file!")
    
    from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix
    
    ground_truth = pd.read_csv('dissertation_results/ground_truth_labeled.csv')
    
    # Parse categories
    ground_truth['true_categories_list'] = ground_truth['true_categories'].apply(
        lambda x: x.split(',') if pd.notna(x) and x != '' else []
    )
    ground_truth['predicted_categories_list'] = ground_truth['piiCategoriesDetected'].apply(
        lambda x: x.split(',') if pd.notna(x) and x != '' else []
    )
    
    # Binary classification
    y_true = ground_truth['true_has_pii'].astype(int)
    y_pred = ground_truth['predicted_categories_list'].apply(lambda x: 1 if len(x) > 0 else 0)
    
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    accuracy = accuracy_score(y_true, y_pred)
    
    print(f"""
DETECTION PERFORMANCE (Binary)
Precision: {precision:.3f} ({precision*100:.1f}%)
Recall: {recall:.3f} ({recall*100:.1f}%)
F1 Score: {f1:.3f} ({f1*100:.1f}%)
Accuracy: {accuracy:.3f} ({accuracy*100:.1f}%)
""")
    
    # VISUALIZATION 5: Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['No PII', 'PII Detected'],
                yticklabels=['No PII', 'PII Detected'],
                cbar_kws={'label': 'Count'}, linewidths=1, linecolor='black')
    plt.xlabel('Predicted', fontweight='bold')
    plt.ylabel('Actual', fontweight='bold')
    plt.title('Confusion Matrix: PII Detection', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('dissertation_results/08_confusion_matrix.png', dpi=300, bbox_inches='tight')
    print("Saved: 08_confusion_matrix.png")
    
    # Per-category metrics
    all_categories = set()
    for cats in ground_truth['true_categories_list']:
        all_categories.update(cats)
    for cats in ground_truth['predicted_categories_list']:
        all_categories.update(cats)
    
    category_metrics = []
    
    for category in all_categories:
        if category == '':
            continue
            
        y_true_cat = ground_truth['true_categories_list'].apply(lambda x: 1 if category in x else 0)
        y_pred_cat = ground_truth['predicted_categories_list'].apply(lambda x: 1 if category in x else 0)
        
        if y_true_cat.sum() > 0:
            prec = precision_score(y_true_cat, y_pred_cat, zero_division=0)
            rec = recall_score(y_true_cat, y_pred_cat, zero_division=0)
            f1_cat = f1_score(y_true_cat, y_pred_cat, zero_division=0)
            
            category_metrics.append({
                'category': category,
                'precision': prec,
                'recall': rec,
                'f1': f1_cat
            })
    
    if len(category_metrics) > 0:
        metrics_df = pd.DataFrame(category_metrics)
        
        # Remove empty categories
        metrics_df = metrics_df[
            (metrics_df['precision'] > 0) |
            (metrics_df['recall'] > 0) |
            (metrics_df['f1'] > 0)
        ]
        
        print("\nPER-CATEGORY PERFORMANCE")
        print(metrics_df.to_string(index=False))
        
        # VISUALIZATION 6: Per-category metrics
        metrics_df_melted = metrics_df.melt(id_vars='category', var_name='metric', value_name='score')
        
        plt.figure(figsize=(12, 6))
        sns.barplot(data=metrics_df_melted, x='category', y='score', hue='metric', palette='Set2')
        plt.ylabel('Score', fontweight='bold')
        plt.xlabel('PII Category', fontweight='bold')
        plt.title('Precision, Recall, F1 per PII Category', fontsize=14, fontweight='bold')
        plt.xticks(rotation=45, ha='right')
        plt.legend(title='Metric')
        plt.ylim(0, 1.1)
        plt.tight_layout()
        plt.savefig('dissertation_results/09_category_metrics.png', dpi=300, bbox_inches='tight')
        print(" Saved: 09_category_metrics.png")
        
        # Confusion matrix breakdown
        tn, fp, fn, tp = cm.ravel()
        print(f"""
CONFUSION MATRIX BREAKDOWN
True Positives: {tp}
False Positives: {fp}
False Negatives: {fn}
True Negatives: {tn}
""")

# STEP 10: LEAKAGE PROGRESSION OVER TIME
print("\n[10/13] Analyzing leakage progression...")

interactions_df['interaction_index'] = interactions_df.groupby('sessionId').cumcount() + 1

leakage_by_index = interactions_df.groupby('interaction_index').agg({
    'has_pii': 'mean'
}).reset_index()
leakage_by_index.columns = ['interaction_index', 'leakage_rate']

print("\nLEAKAGE BY INTERACTION POSITION")
print(leakage_by_index.head(10))

# VISUALIZATION 7: Leakage Progression
plt.figure(figsize=(12, 6))
plt.plot(leakage_by_index['interaction_index'], leakage_by_index['leakage_rate'] * 100, 
         marker='o', linewidth=2, markersize=6, color='#E63946')
plt.xlabel('Interaction Number (1st, 2nd, 3rd...)', fontweight='bold')
plt.ylabel('Leakage Rate (%)', fontweight='bold')
plt.title('Privacy Leakage Rate by Interaction Position', fontsize=14, fontweight='bold')
plt.grid(True, which='both', linestyle='--', linewidth=0.5, alpha=0.7)
plt.minorticks_on()
plt.tight_layout()
plt.savefig('dissertation_results/05_leakage_progression.png', dpi=300, bbox_inches='tight')
print("Saved: 05_leakage_progression.png")

# STEP 11: RESPONSE TIME ANALYSIS
print("\n[11/13] Analyzing response times...")

if 'responseTime' in interactions_df.columns:
    with_pii = interactions_df[interactions_df['has_pii']]['responseTime'].dropna()
    without_pii = interactions_df[~interactions_df['has_pii']]['responseTime'].dropna()
    
    if len(with_pii) > 0 and len(without_pii) > 0:
        print(f"""
RESPONSE TIME COMPARISON
With PII Detection:
  Mean: {with_pii.mean():.0f} ms
  Median: {with_pii.median():.0f} ms
Without PII Detection:
  Mean: {without_pii.mean():.0f} ms
  Median: {without_pii.median():.0f} ms
""")
        
        # VISUALIZATION 8: Response Time Boxplot
        plt.figure(figsize=(10, 6))
        plt.boxplot([without_pii, with_pii], labels=['No PII', 'PII Detected'], 
                   patch_artist=True, 
                   boxprops=dict(facecolor='lightblue', color='black'),
                   medianprops=dict(color='red', linewidth=2))
        plt.ylabel('Response Time (ms)', fontweight='bold')
        plt.title('Response Time Comparison: PII vs No PII', fontsize=14, fontweight='bold')
        plt.grid(axis='y', alpha=0.3)
        plt.tight_layout()
        plt.savefig('dissertation_results/06_response_time_comparison.png', dpi=300, bbox_inches='tight')
        print("Saved: 06_response_time_comparison.png")


# STEP 12: EXPORT DATA TABLES
print("\n[12/13] Exporting data tables...")

# Funnel data
pd.DataFrame({
    'Stage': stages,
    'Count': counts,
    'Percentage': percentages
}).to_csv('dissertation_results/table_funnel_data.csv', index=False)

# PII categories
if len(pii_counter) > 0:
    pd.DataFrame({
        'Category': list(pii_counter.keys()),
        'Count': list(pii_counter.values()),
        'Percentage': [c/len(all_pii_categories)*100 for c in pii_counter.values()]
    }).to_csv('dissertation_results/table_pii_categories.csv', index=False)

# Leakage progression
leakage_by_index.to_csv('dissertation_results/table_leakage_progression.csv', index=False)

print(" Exported data tables")


# STEP 13: GENERATE SUMMARY REPORT
print("\n[13/13] Generating summary report...")

with open('dissertation_results/ANALYSIS_SUMMARY.txt', 'w') as f:
    f.write("RESEARCH STUDY ANALYSIS SUMMARY\n")
    
    f.write("1. PARTICIPANT OVERVIEW\n")
    f.write(f"   Total Sessions: {total_sessions}\n")
    f.write(f"   Completion Rate: {completed_survey/total_sessions*100:.1f}%\n")
    f.write(f"   Average Interactions: {interactions_per_session.mean():.2f}\n")
    if len(completed_sessions) > 0:
        f.write(f"   Average Duration: {completed_sessions['duration_minutes'].mean():.2f} min\n")
    f.write("\n")
    
    f.write("2. PRIVACY LEAKAGE\n")
    f.write(f"   Interaction Leakage Rate: {leakage_rate_interaction:.1f}%\n")
    f.write(f"   Session Leakage Rate: {leakage_rate_session:.1f}%\n")
    if len(pii_counter) > 0:
        f.write(f"   Most Common PII: {pii_counter.most_common(1)[0][0]}\n")
    f.write("\n")
    
    f.write("3. PII CATEGORIES\n")
    for category, count in pii_counter.most_common():
        f.write(f"   {category}: {count} ({count/len(all_pii_categories)*100:.1f}%)\n")
    f.write("\n")
    
    f.write("4. DIRECT VS INDIRECT LEAKAGE\n")
    f.write(f"   Direct: {len(direct_leakage)} ({len(direct_leakage)/total_interactions*100:.1f}%)\n")
    f.write(f"   Indirect: {len(indirect_leakage)} ({len(indirect_leakage)/total_interactions*100:.1f}%)\n")
    f.write("\n")
    
    if os.path.exists('dissertation_results/ground_truth_labeled.csv'):
        f.write("5. DETECTION PERFORMANCE\n")
        f.write(f"   Precision: {precision:.3f} ({precision*100:.1f}%)\n")
        f.write(f"   Recall: {recall:.3f} ({recall*100:.1f}%)\n")
        f.write(f"   F1 Score: {f1:.3f} ({f1*100:.1f}%)\n")
        f.write(f"   Accuracy: {accuracy:.3f} ({accuracy*100:.1f}%)\n")
        f.write("\n")
    
    f.write("All visualizations saved in dissertation_results/\n")

print("Saved: ANALYSIS_SUMMARY.txt")

# COMPLETION
print("ANALYSIS COMPLETE")
print(f"""
Generated Files:
  Visualizations: dissertation_results/*.png
  Data Tables: dissertation_results/table_*.csv
  Summary: dissertation_results/ANALYSIS_SUMMARY.txt

Next Steps:
  1. Review all visualizations
  2. Complete manual annotation (if not done)
  3. Import figures into dissertation
""")

# List generated files
files = glob.glob('dissertation_results/*')
print(f"\nGenerated {len(files)} files:")
for f in sorted(files)[:10]:  # Show first 10
    print(f"  {f}")
if len(files) > 10:
    print(f"  ... and {len(files) - 10} more")

print("\n All done! Check dissertation_results/ folder.")