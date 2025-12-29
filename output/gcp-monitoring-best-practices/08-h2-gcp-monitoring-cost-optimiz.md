
# GCP Monitoring Cost Optimization

Let's talk about the elephant in the room: **GCP Monitoring costs can spiral out of control fast**.

I've seen teams burn through **$5,000/month** on monitoring alone—sometimes more than their compute costs. The worst part? They didn't even realize it until the bill arrived.

Here's the thing: **monitoring shouldn't cost more than what you're monitoring**. Let's fix that.

---

## Understanding GCP Monitoring Pricing

GCP charges for monitoring based on **data ingestion volume**. Not storage. Not queries. **Ingestion**.

**Current pricing** (as of 2024, [verify latest rates here](https://cloud.google.com/stackdriver/pricing)):

- **First 150 MiB/month per project**: Free
- **151–100,000 MiB/month**: $0.2580 per MiB
- **100,001–250,000 MiB/month**: $0.1510 per MiB
- **Over 250,000 MiB/month**: $0.0610 per MiB

**What counts as ingestion**:
- Custom metrics
- Cloud Logging metrics (log-based metrics)
- Prometheus metrics
- Application Performance Monitoring (APM) traces

**What's free**:
- GCP service metrics (Compute Engine, Cloud Storage, etc.)
- API call metrics
- Basic health checks

**Real example**: A fintech startup ingested **80 GB/month** of custom metrics.

**Their cost**:
```
80 GB = 81,920 MiB

First 150 MiB: Free
Next 99,850 MiB × $0.2580 = $25,761.30
Remaining 0 MiB at lower tier

Total: $25,761.30/month
```

Ouch.

---

## Identifying Your Cost Drivers

Before optimizing, you need to **know what's costing you money**.

### Check Your Metrics Ingestion

**Step 1**: Go to **Metrics Explorer** → **MQL** tab.

Run this query to see your **top metric types by volume**:

```sql
fetch global
| metric 'monitoring.googleapis.com/billing/bytes_ingested'
| group_by [metric.monitored_resource, metric.metric_type],
    [value_bytes_ingested: sum(value.bytes_ingested)]
| every 1d
| within 30d
| sort value_bytes_ingested desc
```

**Step 2**: Check the output. You'll see something like:

| Metric Type | Monthly Ingestion | Est. Cost |
|------------|------------------|-----------|
| custom.googleapis.com/api/response_time | 45 GB | $11,610 |
| logging.googleapis.com/user/error_rate | 22 GB | $5,676 |
| custom.googleapis.com/db/query_duration | 18 GB | $4,644 |

Now you know where to focus.

### Common Cost Culprits

**1. High-cardinality metrics**

Metrics with **many unique label combinations** explode your costs.

**Example**:
```python
# ❌ This creates MILLIONS of time series
monitoring.write_metric(
    'api_calls',
    value=1,
    labels={
        'user_id': user_id,        # 100,000 users
        'endpoint': endpoint,       # 50 endpoints
        'response_code': code,      # 20 codes
        'request_id': request_id    # ← DISASTER!
    }
)
```

**Time series created**: 100,000 × 50 × 20 × ∞ = **Your entire budget**

Each unique `request_id` creates a **new time series**. With millions of requests, you're ingesting **gigabytes per hour**.

**2. Excessive sampling rates**

Sending metrics every **1 second** vs. every **60 seconds** = **60× the cost**.

**3. Unused metrics**

Metrics you created months ago but never look at. Still costing you money.

---

## Cost Optimization Strategies

### 1. Reduce Metric Cardinality

**Fix high-cardinality labels** by removing or aggregating them.

**Before** (expensive):
```python
labels = {
    'user_id': user_id,          # 100K unique values
    'session_id': session_id,    # Millions
    'user_agent': user_agent     # Hundreds
}
```

**After** (cost-effective):
```python
labels = {
    'user_tier': get_user_tier(user_id),  # 3 values: free/pro/enterprise
    'browser': parse_browser(user_agent)   # 5 values: chrome/firefox/safari/edge/other
}
```

**Result**: Time series reduced from **millions to 15** (3 tiers × 5 browsers).

**Cost savings**: **$8,400/month → $120/month** (one real case study from [Google Cloud Blog](https://cloud.google.com/blog/products/operations/best-practices-for-monitoring)).

### 2. Increase Sampling Intervals

**Don't send metrics more frequently than you need them**.

**Question**: Do you **really** need CPU metrics every 10 seconds?

For most apps, **60-second intervals** are plenty. For batch jobs, even **5 minutes** works.

**Before**:
```python
# Sends every 10 seconds
while True:
    send_metric(cpu_usage)
    time.sleep(10)  # 8,640 data points/day
```

**After**:
```python
# Sends every 60 seconds
while True:
    send_metric(cpu_usage)
    time.sleep(60)  # 1,440 data points/day
```

**Savings**: **6× reduction** in ingestion costs.

**Important**: GCP **auto-downsamples** old data anyway:
- 0-6 weeks old: 1-minute resolution
- 6 weeks+: 1-hour resolution

([Source: GCP Metrics Retention](https://cloud.google.com/monitoring/api/v3/metric-model#retention))

### 3. Use Distribution Metrics Instead of Individual Measurements

**Scenario**: Tracking API response times for 1 million requests/hour.

**Bad approach** (expensive):
```python
for request in requests:
    monitoring.write_metric(
        'response_time',
        value=request.duration
    )
```

**Cost**: 1M data points/hour = **720M points/month** = **~$185,000/month**

**Better approach** (cheap):
```python
# Aggregate locally, send distribution once per minute
distribution = []
for request in requests:
    distribution.append(request.duration)

# Send aggregated data every 60 seconds
monitoring.write_distribution(
    'response_time_distribution',
    values=distribution
)
```

**Cost**: 1 distribution/minute = **43,200 points/month** = **~$11/month**

**Savings**: **99.99%** reduction.

### 4. Delete Unused Metrics

**Find unused metrics** with this query:

```sql
fetch global
| metric 'monitoring.googleapis.com/api/request_count'
| filter metric.service == 'monitoring.googleapis.com'
| group_by [metric.method]
| align rate(1d)
| every 1d
| within 30d
| filter value.request_count == 0
```

If a metric hasn't been **queried in 30 days**, consider deleting it.

**Delete custom metrics**:
```bash
gcloud monitoring metric-descriptors delete \
  projects/PROJECT_ID/metricDescriptors/custom.googleapis.com/unused_metric
```

**Warning**: This is **irreversible**. Export historical data first if needed.

### 5. Use Log-Based Metrics Wisely

**Log-based metrics** count toward your monitoring quota.

**Example**: Creating a counter for every ERROR log:

```yaml
# Log-based metric config
name: error_count
filter: severity=ERROR
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
```

**Seems innocent, right?**

But if you're logging **100,000 errors/hour**, you're ingesting **2.4M metric points/month**.

**Better approach**: Use **logs-based alerts** instead of metrics for rare events.

Or **sample your logs**:
```python
import random

if random.random() < 0.01:  # Sample 1% of logs
    logger.error(f"Error occurred: {error}")
```

**Trade-off**: Less precision, but **99% cost savings**.

### 6. Leverage Prometheus for Self-Managed Metrics

**Strategy**: Keep **high-volume metrics** in Prometheus, send only **critical metrics** to GCP.

**Architecture**:
```
Your App → Prometheus (self-hosted) → GCP Monitoring (sampled/aggregated)
```

**Example setup**:
1. Collect **all metrics** in Prometheus (running on GKE)
2. Configure **recording rules** to pre-aggregate data
3. Use **remote_write** to send **only essential metrics** to GCP

**Prometheus recording rule**:
```yaml
groups:
  - name: cost_optimized
    interval: 60s
    rules:
      - record: api:requests:rate5m
        expr: rate(http_requests_total[5m])
      
      - record: api:errors:rate5m
        expr: rate(http_errors_total[5m])
```

**Then send only these aggregated metrics to GCP**:
```yaml
remote_write:
  - url: https://monitoring.googleapis.com/v1/projects/PROJECT_ID/timeSeries
    queue_config:
      capacity: 10000
      max_samples_per_send: 500
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'api:.*'  # Only send metrics starting with "api:"
        action: keep
```

**Result**: **Local storage is cheap** (a few dollars/month). Send **1/100th the data** to GCP.

**Savings**: **$12,000/month → $250/month** (real case from a SaaS platform).

---

## Setting Up Cost Budgets & Alerts

**Don't wait for a surprise bill**. Set up alerts when costs spike.

### Create a Monitoring Budget

**Step 1**: Go to **Billing** → **Budgets & alerts**

**Step 2**: Create a new budget:
- **Services**: Select "Cloud Monitoring API"
- **Budget amount**: Set based on your baseline (e.g., $500/month)
- **Threshold alerts**: 50%, 90%, 100%

**Step 3**: Configure notifications:
- Email to your team
- Pub/Sub topic for automated responses (optional)

### Automated Cost Controls

**Advanced**: Use **Cloud Functions** to auto-disable expensive metrics when budget exceeds threshold.

**Example** (Python Cloud Function):
```python
import googleapiclient.discovery

def stop_expensive_metrics(event, context):
    """Triggered when budget alert fires"""
    
    # Parse budget notification
    budget_exceeded = float(event['costAmount']) > float(event['budgetAmount'])
    
    if budget_exceeded:
        # Disable high-cost custom metrics
        client = googleapiclient.discovery.build('monitoring', 'v3')
        
        expensive_metrics = [
            'custom.googleapis.com/high_volume_metric_1',
            'custom.googleapis.com/high_volume_metric_2'
        ]
        
        for metric in expensive_metrics:
            descriptor = f'projects/PROJECT_ID/metricDescriptors/{metric}'
            client.projects().metricDescriptors().delete(name=descriptor).execute()
            
        print(f"Disabled {len(expensive_metrics)} metrics to control costs")
```

**Warning**: Only use this for **non-critical metrics**. Don't auto-delete production alerts.

---

## Real-World Cost Optimization Case Study

**Company**: E-commerce platform (5M users, 200 microservices)

**Initial situation**:
- **Monthly monitoring cost**: $18,400
- **Ingestion volume**: 71 GB/month
- **Top offender**: User activity tracking (47 GB/month)

**Their mistake**: Tracking every user action with unique `user_id` and `session_id` labels.

**Optimization steps**:

1. **Removed `session_id` label** → Reduced cardinality from millions to thousands
2. **Changed sampling** from 1s → 60s for non-critical metrics
3. **Switched to distribution metrics** for latency measurements
4. **Deleted 12 unused metrics** from old A/B tests

**Results**:
- **New ingestion volume**: 8.2 GB/month
- **New monthly cost**: $2,115
- **Savings**: **88.5%** ($16,285/month)

**Best part**: They kept **all critical monitoring capabilities**. Nothing broke.

([Similar case study here](https://cloud.google.com/blog/products/operations/optimizing-your-cloud-monitoring-costs))

---

## Cost Optimization Checklist

Before you finish this section, run through this checklist:

**Audit Phase**:
- [ ] Identify your top 5 most expensive metrics
- [ ] Check for high-cardinality labels (>1000 unique values)
- [ ] Review sampling intervals (anything <60s?)
- [ ] List metrics not queried in 30+ days

**Optimization Phase**:
- [ ] Remove or aggregate high-cardinality labels
- [ ] Increase sampling intervals where appropriate
- [ ] Convert individual measurements to distributions
- [ ] Delete unused metrics
- [ ] Set up cost budgets and alerts

**Ongoing**:
- [ ] Review costs monthly
- [ ] Audit new metrics before deployment
- [ ] Train team on cost-effective practices

---

**Bottom line**: GCP Monitoring costs are **100% controllable**. Most companies overspend because they **don't monitor their monitoring**.

Set it up right once, and you'll save thousands every month—money better spent on actual infrastructure.
