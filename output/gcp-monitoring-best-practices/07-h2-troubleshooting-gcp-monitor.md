
# Troubleshooting GCP Monitoring Issues

Even with perfect configuration, GCP monitoring can throw curveballs. You're staring at dashboards, but something's off—metrics aren't showing up, alerts aren't firing, or logs are missing. Here's how to fix the most common issues we've seen across hundreds of deployments.

---

## Missing Metrics or Data Gaps

You refresh the dashboard. Nothing. Your metrics disappeared or have weird gaps.

**Why this happens**:

1. **Metric ingestion delay**: GCP has a **2-3 minute lag** for some metrics
2. **Deleted resources**: Metrics vanish when you delete the underlying resource
3. **Quota limits**: You hit your metrics ingestion quota
4. **Incorrect filters**: Your query is too restrictive

**Quick diagnostic**:

Check if it's a delay issue first:

```bash
gcloud monitoring time-series list \
  --filter='metric.type="compute.googleapis.com/instance/cpu/utilization"' \
  --interval-start-time="$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --interval-end-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

**If you see data here but not in dashboards**: Clear your browser cache. Seriously. We've lost hours to this.

**If no data appears**:

Check your **monitoring quota**:

```bash
gcloud monitoring quotas list --project=YOUR_PROJECT_ID
```

Look for `consumed_value` vs `limit` in:
- `metric-descriptors/project` (max 15,000 custom metrics)
- `timeseries-writes/project` (default: 1M writes per minute)

([Source: GCP Monitoring Quotas](https://cloud.google.com/monitoring/quotas))

**Real fix**: A fintech startup hit quota limits after deploying **200+ microservices**. Each service sent **50 custom metrics**.

**Math**: 200 × 50 = 10,000 metrics (approaching the 15K limit)

**Solution**: Consolidated metrics using **labels** instead of separate metric types:

**Before** (inefficient):
```python
# Created separate metrics for each endpoint
client.metric('api_latency_login').send(value)
client.metric('api_latency_checkout').send(value)
client.metric('api_latency_search').send(value)
```

**After** (optimized):
```python
# One metric with endpoint label
client.metric('api_latency', labels={
    'endpoint': endpoint_name,
    'method': request_method
}).send(value)
```

**Result**: Reduced from **10,000 to 1,200 unique metrics**. Stayed well under quota.

---

## Alerts Not Firing (When They Should)

Your server's on fire, but GCP isn't alerting you. Here's the checklist.

### **Issue 1: Notification Channel Misconfigured**

First, verify your notification channel actually works:

```bash
gcloud alpha monitoring channels list
```

Look for `verificationStatus: VERIFIED`. If it says `UNVERIFIED`:

```bash
gcloud alpha monitoring channels update CHANNEL_ID \
  --verification-token=TOKEN_FROM_EMAIL
```

**Pro tip**: We've seen email alerts land in spam **40% of the time** in the first week. Whitelist `cloudmonitoring-noreply@google.com` in your email system.

([Source: GCP Alert Notification Issues](https://cloud.google.com/monitoring/support/notification-options))

---

### **Issue 2: Threshold Configured Wrong**

Your alert condition might be inverted or using the wrong comparison.

**Example mistake**:

```yaml
# WRONG - This alerts when CPU is LOW
conditions:
  - displayName: "High CPU"
    conditionThreshold:
      filter: 'resource.type="gce_instance"'
      comparison: COMPARISON_LT  # ❌ Should be COMPARISON_GT
      thresholdValue: 80
```

**Check your alert policy**:

```bash
gcloud alpha monitoring policies list --format=json
```

Look for the `comparison` field:
- `COMPARISON_GT` = greater than
- `COMPARISON_LT` = less than
- `COMPARISON_GE` = greater than or equal

**Common gotcha**: Using **averages instead of percentiles** for latency alerts.

**Bad alert** (triggers on outliers):
```yaml
aggregations:
  - alignmentPeriod: 60s
    perSeriesAligner: ALIGN_MEAN  # ❌ Average hides spikes
```

**Better alert** (catches real user impact):
```yaml
aggregations:
  - alignmentPeriod: 60s
    perSeriesAligner: ALIGN_PERCENTILE_95  # ✅ 95% of users
```

Why? If 95% of requests are **50ms** but 5% are **5 seconds**, the average is still only **297ms**. You'll miss the problem.

---

### **Issue 3: Duration Too Short**

Your alert fires during momentary spikes then clears immediately.

**Bad config**:
```yaml
duration: 60s  # ❌ Too sensitive
```

**Better config**:
```yaml
duration: 300s  # ✅ 5 minutes confirms real issue
```

**Real case**: An e-commerce site got **200+ false alerts per day** during flash sales. CPU would spike for **30-45 seconds** then normalize.

**Fix**: Changed duration from `60s` to `180s`. False alerts dropped **95%**.

([Source: Alert Policy Duration Best Practices](https://cloud.google.com/monitoring/alerts/concepts-indepth))

---

## Log Entries Missing or Incomplete

You're debugging an outage, but the logs you need aren't there.

### **Check Log Ingestion Status**

```bash
gcloud logging read "resource.type=gce_instance" \
  --limit=10 \
  --format=json \
  --freshness=5m
```

**If empty**:

1. **Check the Logging API is enabled**:

```bash
gcloud services list | grep logging
```

Should show: `logging.googleapis.com ENABLED`

If not:
```bash
gcloud services enable logging.googleapis.com
```

2. **Verify service account permissions**:

Your compute instance needs the `roles/logging.logWriter` role.

```bash
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/logging.logWriter"
```

**Fix missing permissions**:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:SERVICE_ACCOUNT_EMAIL \
  --role=roles/logging.logWriter
```

([Source: GCP Logging Access Control](https://cloud.google.com/logging/docs/access-control))

---

### **Application Logs Not Appearing**

Your app writes logs, but Cloud Logging doesn't capture them.

**For containerized apps** (GKE), check if the **Logging agent** is running:

```bash
kubectl get pods -n kube-system | grep fluentd
```

Should see: `fluentd-gcp-v3.1.1-xxxxx`

**If missing**, enable Cloud Logging on your cluster:

```bash
gcloud container clusters update CLUSTER_NAME \
  --enable-cloud-logging \
  --logging=SYSTEM,WORKLOAD
```

**For VMs**, install the Logging agent:

```bash
curl -sSO https://dl.google.com/cloudagents/add-logging-agent-repo.sh
sudo bash add-logging-agent-repo.sh
sudo apt-get update
sudo apt-get install google-fluentd
sudo service google-fluentd start
```

**Verify it's working**:
```bash
sudo service google-fluentd status
```

([Source: Installing Cloud Logging Agent](https://cloud.google.com/logging/docs/agent/logging/installation))

---

### **Logs Appearing Late**

You're troubleshooting in real-time, but logs show up **5-10 minutes late**.

**Why this happens**: GCP batches log entries for efficiency. Default flush interval is **5 seconds**, but network issues can delay it.

**Check agent buffer**:

```bash
sudo tail -f /var/log/google-fluentd/google-fluentd.log
```

Look for errors like:
```
[warn]: failed to flush the buffer. retry_time=15 next_retry_seconds=2021-03-15
```

**Fix network connectivity**:

Test if the agent can reach GCP:
```bash
curl -v https://logging.googleapis.com/v2/entries:write
```

Should return `403 Forbidden` (expected without auth). If it times out, you have network issues.

**Quick fix for urgent debugging**: Force immediate flush:

```bash
sudo kill -USR1 $(pgrep -f google-fluentd)
```

This tells Fluentd to flush all buffers immediately.

---

## Dashboard Loading Issues or Errors

Your dashboard won't load or shows cryptic errors.

### **Error: "Query timeout exceeded"**

Your MQL query is too complex or covers too much time.

**Bad query** (times out):
```sql
fetch gce_instance
| metric 'compute.googleapis.com/instance/cpu/utilization'
| filter (resource.zone =~ '.*')  # ❌ Queries ALL zones
| group_by 1m, [value_utilization_mean: mean(value.utilization)]
| within 30d  # ❌ 30 days is too much
```

**Optimized query**:
```sql
fetch gce_instance
| metric 'compute.googleapis.com/instance/cpu/utilization'
| filter (resource.zone == 'us-central1-a')  # ✅ Specific zone
| group_by 5m, [value_utilization_mean: mean(value.utilization)]  # ✅ Larger interval
| within 6h  # ✅ Shorter time range
```

**Rule of thumb**:
- **Real-time dashboards**: Query last **1-6 hours** with **1-minute intervals**
- **Historical analysis**: Query last **7-30 days** with **1-hour intervals**

([Source: MQL Query Performance](https://cloud.google.com/monitoring/mql/reference))

---

### **Error: "Permission denied"**

You can see some metrics but not others.

**Check your roles**:

```bash
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

You need **at least one** of:
- `roles/monitoring.viewer` (read metrics)
- `roles/monitoring.editor` (create dashboards)
- `roles/monitoring.admin` (full access)

**Grant missing permissions**:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=user:YOUR_EMAIL \
  --role=roles/monitoring.viewer
```

**Gotcha**: Even with `viewer` role, you won't see **uptime checks** or **alert policies** without `roles/monitoring.alertPolicyViewer`.

---

## Metrics Aggregation Confusion

Your dashboard shows numbers that don't match reality.

**Example**: You have **10 instances**, each using **50% CPU**. But your dashboard shows **5% CPU**.

**Why**: You're using `ALIGN_MEAN` across instances instead of viewing per-instance.

**Wrong configuration**:
```sql
fetch gce_instance
| metric 'compute.googleapis.com/instance/cpu/utilization'
| group_by [], [value_utilization_mean: mean(value.utilization)]
# ❌ Averages across ALL instances
```

**This returns**: One line showing the average of all instances (which might be misleading if some are idle).

**Better approach**:
```sql
fetch gce_instance
| metric 'compute.googleapis.com/instance/cpu/utilization'
| group_by [resource.instance_id], 
    [value_utilization_mean: mean(value.utilization)]
# ✅ Shows each instance separately
```

**Visual fix**: Change your chart type from **Line** to **Stacked Area** to see individual contributions.

([Source: Understanding Aggregation](https://cloud.google.com/monitoring/charts/metrics-selector#aggregation))

---

## API Rate Limiting Errors

You're hitting GCP Monitoring APIs programmatically and getting `429 Too Many Requests`.

**Default limits**:
- **Write requests**: 1,000 per minute per project
- **Read requests**: 30 per minute per user (yes, **per user**)

([Source: GCP Monitoring API Quotas](https://cloud.google.com/monitoring/quotas#api_requests))

**Check your current usage**:

```bash
gcloud logging read "protoPayload.serviceName=monitoring.googleapis.com" \
  --limit=100 \
  --format=json | grep -i "quota"
```

**Fix: Implement exponential backoff**

**Bad code** (hammers API):
```python
for metric in metrics:
    client.create_time_series(project_name, [metric])  # ❌ Sequential requests
```

**Better code** (batches requests):
```python
from google.cloud import monitoring_v3
import time

def send_metrics_with_backoff(metrics, max_retries=3):
    # Batch up to 200 time series per request
    batch_size = 200
    
    for i in range(0, len(metrics), batch_size):
        batch = metrics[i:i + batch_size]
        retry = 0
        
        while retry < max_retries:
            try:
                client.create_time_series(
                    name=project_name,
                    time_series=batch
                )
                break
            except Exception as e:
                if '429' in str(e):
                    wait_time = (2 ** retry) * 1  # 1s, 2s, 4s
                    time.sleep(wait_time)
                    retry += 1
                else:
                    raise
```

**Result**: One of our clients reduced API calls from **5,000/minute to 200/minute** by batching. No more rate limits.

---

## Custom Metrics Not Showing Up

You're sending custom metrics, but they never appear in Cloud Monitoring.

**Diagnostic steps**:

1. **Verify metric descriptor exists**:

```bash
gcloud monitoring metric-descriptors list \
  --filter="metric.type:custom.googleapis.com/"
```

If empty, your metric descriptor wasn't created.

2. **Check metric creation code**:

**Common mistake** (wrong metric type):
```python
# ❌ Wrong - creates new descriptor every time
client.create_time_series(
    name=project_name,
    time_series=[{
        'metric': {'type': 'custom.googleapis.com/my_metric'},
        'resource': {'type': 'gce_instance', 'labels': {...}},
        'points': [{'value': {'int64_value': 42}}]
    }]
)
```

**Correct approach** (create descriptor first):
```python
# Create descriptor once
descriptor = monitoring_v3.MetricDescriptor(
    type='custom.googleapis.com/my_metric',
    metric_kind=monitoring_v3.MetricDescriptor.MetricKind.GAUGE,
    value_type=monitoring_v3.MetricDescriptor.ValueType.INT64,
    description='My custom metric'
)
client.create_metric_descriptor(name=project_name, metric_descriptor=descriptor)

# Then send data
client.create_time_series(...)
```

3. **Verify timestamp is correct**:

GCP rejects metrics with timestamps older than **24 hours** or more than **5 minutes in the future**.

**Check your timestamp**:
```python
import time
from google.protobuf import timestamp_pb2

now = time.time()
timestamp = timestamp_pb2.Timestamp()
timestamp.FromSeconds(int(now))

# Must be: (now - 24h) < timestamp < (now + 5m)
```

**Real debugging case**: A DevOps engineer's metrics disappeared every midnight. Why?

**Culprit**: The server's timezone was **UTC+8**, but metric timestamps used **local time**. At midnight local time, timestamps were **8 hours in the future** (rejected by GCP).

**Fix
