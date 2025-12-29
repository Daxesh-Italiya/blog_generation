
# Common GCP Monitoring Scenarios & Solutions

You've got your monitoring basics down. Alerts are firing, dashboards are live, and your team isn't scrambling anymore. Great.

But here's where theory meets reality: **Your production environment doesn't care about perfect configs**. It cares about whether you can catch a VM running out of memory before users notice, or spot a database query eating 90% of your CPU.

Let's dive into the **real-world scenarios** DevOps teams face daily—and exactly how to solve them with GCP Monitoring.

---

## Monitoring VM and Compute Resources

### The Problem: Silent VM Failures

Picture this: Your Compute Engine VM is running at 95% CPU. No alerts fire. Your application slows to a crawl. Users start complaining. By the time you check the Console, **it's been down for 20 minutes**.

Why? Because **default GCP monitoring doesn't track everything**.

Out of the box, Cloud Monitoring gives you:
- **CPU utilization**
- **Disk I/O**
- **Network traffic**

**What it DOESN'T give you**:
- **Memory usage** (seriously—this shocked me the first time)
- **Disk space** (you'll only know when it's 100% full)
- **Process-level metrics** (which app is hogging CPU?)

([Source: GCP Documentation](https://cloud.google.com/monitoring/api/metrics_gcp)).

### The Solution: Install the Ops Agent

The **Ops Agent** is GCP's unified monitoring and logging agent. Think of it as the missing link between your VM's actual state and Cloud Monitoring's dashboards.

**Installation** (takes 2 minutes):

```bash
# For Debian/Ubuntu
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install

# For CentOS/RHEL
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install --version=latest
```

**What you get instantly**:
- **Memory metrics** (free/used/cached)
- **Disk space tracking** (% used per partition)
- **Process monitoring** (top CPU/memory consumers)
- **Application logs** (auto-collected from common apps)

([Source: GCP Ops Agent Documentation](https://cloud.google.com/stackdriver/docs/solutions/agents/ops-agent)).

### Real-World Example: E-Commerce Crash

A retail client ran their checkout API on 5 Compute Engine VMs. **No Ops Agent installed** (they relied on default metrics).

**What happened**:
- Black Friday traffic spiked
- One VM's memory hit 98% (undetected)
- Node.js process crashed
- Load balancer kept routing traffic to the dead VM
- **1,200 failed checkout attempts** before they noticed

**After installing Ops Agent**:
```yaml
# Alert policy they created
conditions:
  - displayName: "Memory usage critical"
    conditionThreshold:
      filter: 'metric.type="agent.googleapis.com/memory/percent_used" AND resource.type="gce_instance"'
      comparison: COMPARISON_GT
      thresholdValue: 90
      duration: 120s
```

**Result**: They now get **Slack alerts** when any VM crosses 90% memory for 2+ minutes. **Zero checkout failures** during the next sale event.

---

### Monitoring Disk Space (Before It's Too Late)

**The sneaky killer**: Running out of disk space.

You're logging application errors to `/var/log`. Each log file grows. Nobody notices until your VM refuses to write new data—and suddenly your database can't commit transactions.

**Alert config** (catches this early):

```yaml
# Ops Agent metric
conditions:
  - displayName: "Disk space critical"
    conditionThreshold:
      filter: 'metric.type="agent.googleapis.com/disk/percent_used" AND metric.label.device=~".*" AND metric.label.state="used"'
      comparison: COMPARISON_GT
      thresholdValue: 85
      duration: 300s

notificationChannels:
  - projects/YOUR_PROJECT/notificationChannels/YOUR_CHANNEL_ID
```

**Pro tip**: Set the threshold at **85%**, not 95%. Why? Because log rotation and cleanup take time. At 95%, you're already in panic mode.

---

### Process-Level Monitoring (Find the Memory Hog)

Ever had a "which process is eating all my RAM?" moment?

With Ops Agent, you can create a **custom dashboard** showing:
- Top 5 processes by CPU
- Top 5 processes by memory
- Historical trends (did Java suddenly start leaking memory yesterday?)

**Example MQL query** (in Metrics Explorer):

```sql
fetch gce_instance
| metric 'agent.googleapis.com/processes/cpu/time'
| group_by 1m, [value_cpu_time_mean: mean(value.cpu_time)]
| every 1m
| top 5
```

This shows which processes consumed the most CPU in the last hour. Saved my team once when a rogue cron job was hammering the CPU every 15 minutes.

([Source: GCP MQL Reference](https://cloud.google.com/monitoring/mql)).

---

## Database Monitoring

### Cloud SQL: The Metrics That Actually Matter

**The rookie mistake**: Monitoring only "CPU utilization" and calling it a day.

**Why that's dangerous**: A database can have:
- 30% CPU utilization (looks healthy)
- **200 active connections** (way above recommended max)
- **Query latency spiking to 5 seconds**

Users see a broken app. You see "everything looks fine."

### Key Cloud SQL Metrics to Track

Here's what veteran DBAs monitor:

| Metric | What It Tells You | Alert Threshold |
|--------|-------------------|-----------------|
| **Active Connections** | How many clients are connected | >80% of max connections |
| **Replication Lag** | How far behind replica is (for HA setups) | >10 seconds |
| **Read/Write Latency** | Query performance | >100ms for 5 minutes |
| **Storage Utilization** | Disk space left | >85% |
| **InnoDB Buffer Pool Hit Ratio** (MySQL) | Cache efficiency | <95% |

([Source: GCP Cloud SQL Metrics](https://cloud.google.com/sql/docs/mysql/monitoring)).

### Real-World Fix: Connection Pool Exhaustion

A SaaS startup's API started returning `500` errors randomly. **Cloud Monitoring showed**:
- CPU: 40% (fine)
- Memory: 60% (fine)
- Active Connections: **300 out of 300** (PROBLEM)

**Root cause**: Their Node.js app wasn't closing database connections properly. Each API call opened a new connection and forgot to close it.

**Solution**:
1. **Immediate fix**: Increased max connections from 300 to 500 (bought them time)
2. **Proper fix**: Implemented connection pooling in Node.js:

```javascript
// Before (bad)
const connection = mysql.createConnection({...});

// After (good)
const pool = mysql.createPool({
  connectionLimit: 10, // Reuse connections
  host: 'YOUR_CLOUD_SQL_IP',
  ...
});
```

3. **Alert created**:

```yaml
conditions:
  - displayName: "Connection pool near limit"
    conditionThreshold:
      filter: 'metric.type="cloudsql.googleapis.com/database/mysql/connections" AND resource.type="cloudsql_database"'
      comparison: COMPARISON_GT
      thresholdValue: 240  # 80% of 300
      duration: 60s
```

**Result**: They now get **15 minutes of warning** before hitting max connections. Zero outages in 6 months.

---

### Query Performance Monitoring

**The problem**: Your database is slow, but you don't know *which* query is the culprit.

**The solution**: **Query Insights** (built into Cloud SQL).

**How to enable** (for MySQL/PostgreSQL):

1. Go to Cloud SQL instance → **Edit**
2. Enable **Query Insights** under "Flags"
3. Set these flags:
   - `cloudsql.enable_query_insights=ON`
   - `query_insights_query_string_length=4096` (captures full queries)

**What you get**:
- **Top queries by execution time** (the slow ones)
- **Query count** (is one query running 10,000 times/minute?)
- **Execution plans** (why is this query doing a full table scan?)

([Source: Query Insights Documentation](https://cloud.google.com/sql/docs/postgres/using-query-insights)).

**Example dashboard query** (find slowest queries):

```sql
fetch cloudsql_database
| metric 'cloudsql.googleapis.com/database/insights/perquery/execution_time'
| group_by 1h, [value_execution_time_mean: mean(value.execution_time)]
| top 10
```

One client discovered a `SELECT *` query on a 5GB table running **every 30 seconds**. Adding an index reduced execution time from **8 seconds to 200ms**.

---

### Replication Lag (For High Availability Setups)

If you're running Cloud SQL with **read replicas** (for load balancing or disaster recovery), **replication lag** is critical.

**What it means**: How far behind the replica is from the primary database.

**Why it matters**: If lag is 30 seconds and your primary crashes, you **lose 30 seconds of data** when you promote the replica.

**Alert config**:

```yaml
conditions:
  - displayName: "Replication lag too high"
    conditionThreshold:
      filter: 'metric.type="cloudsql.googleapis.com/database/replication/replica_lag" AND resource.type="cloudsql_database"'
      comparison: COMPARISON_GT
      thresholdValue: 10  # 10 seconds
      duration: 120s
```

**Pro tip**: If lag consistently exceeds 5 seconds, your replica is **undersized**. Scale up the machine type or reduce write load.

---

## Network and Load Balancer Monitoring

### The Silent Killer: Load Balancer Backend Health

**Scenario**: Your Cloud Load Balancer is running. Users report intermittent errors. **You check the dashboard—everything looks green**.

**What's actually happening**: One of your 5 backend instances is failing health checks. The load balancer **removed it from rotation**, but nobody got alerted.

**The fix**: Monitor **backend health** explicitly.

**Key metrics**:

| Metric | What It Tracks | Alert Threshold |
|--------|----------------|-----------------|
| **Healthy Instance Count** | Number of passing health checks | <80% of total instances |
| **Request Count per Backend** | Traffic distribution | Uneven distribution (one instance getting 5x traffic) |
| **5xx Error Rate** | Backend failures | >1% of requests |
| **Latency (95th percentile)** | Slow responses | >500ms |

([Source: GCP Load Balancer Metrics](https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring)).

### Real-World Example: The Ghost 502

A fintech company's API returned random `502 Bad Gateway` errors. **Load balancer metrics showed**:
- Total requests: **Normal**
- Healthy backends: **4 out of 5** (one instance failing)
- Error rate: **0.8%** (below their 1% alert threshold)

**Why alerts didn't fire**: The unhealthy instance was **intermittently passing** health checks (flaky network). Load balancer would route traffic → instance would timeout → health check would fail → repeat.

**Solution**:
1. **Tightened health check settings**:

```bash
gcloud compute health-checks update http my-health-check \
  --check-interval=5s \
  --timeout=3s \
  --unhealthy-threshold=2 \
  --healthy-threshold=2
```

**Translation**:
- Check every **5 seconds** (was 10)
- Mark unhealthy after **2 consecutive failures** (was 3)
- Timeout requests after **3 seconds** (was 5)

2. **Created alert for backend health**:

```yaml
conditions:
  - displayName: "Unhealthy backend detected"
    conditionThreshold:
      filter: 'metric.type="loadbalancing.googleapis.com/https/backend_request_count" AND metric.label.response_code_class="500"'
      comparison: COMPARISON_GT
      thresholdValue: 10  # >10 errors per minute
      duration: 60s
```

**Result**: They now get **instant Slack alerts** when any backend starts throwing 5xx errors. Flaky instance was replaced—**zero 502s in production since**.

---

### Monitoring SSL Certificate Expiry

**The embarrassing outage**: Your SSL certificate expires. **Your entire site goes down**. Users see browser warnings. Your boss is... not happy.

**How to prevent this** (with Cloud Monitoring):

1. **Check certificate expiry dates**:

```bash
gcloud compute ssl-certificates list
```

2. **Set up proactive alerts** (60 days before expiry):

```yaml
# Custom metric (requires scripting)
# Or use third-party tools like Cert Spotter
```

**Pro tip**: Use **Google-managed SSL certificates** (auto-renews):

```bash
gcloud compute ssl-certificates create my-cert \
  --domains=example.com,www.example.com \
  --global
```

GCP auto-renews these **90 days before expiry**. One less thing to monitor manually.

([Source: GCP SSL Certificate Documentation](https://cloud.google.com/load-balancing/docs/ssl-certificates)).

---

### Detecting DDoS Attacks Early

**The scenario**: Your site traffic spikes 10x overnight. Is it a viral marketing campaign or a DDoS attack?

**Key indicators** (in Cloud Monitoring):

1. **Abnormal request rate**:

```sql
fetch https_lb_rule
| metric 'loadbalancing.googleapis.com/https/request_count'
| group_by 1m, [value_request_count_mean: mean(value.request_count)]
| condition val() > 10000  # Adjust based on your baseline
```

2. **Geographic distribution** (sudden traffic from one country):

Check **Cloud Armor logs** (if enabled):

```bash
gcloud logging read "resource.type=http_load_balancer" --limit 100
```

**Alert config** (for abnormal traffic):

```yaml
conditions:
  - displayName: "Potential DDoS attack"
    conditionThreshold:
      filter: 'metric.type="loadbalancing.googleapis.com/https/request_count"'
      comparison: COMPARISON_GT
      thresholdValue: 5000  # 5x your normal peak
      duration: 60s
```

**Real case**: An e-learning platform saw **50,000 requests/minute** (normal = 2,000). Cloud Armor detected:
- 90% traffic from **one IP block** in Eastern Europe
- All requests hitting the same login endpoint

**Response**: Enabled rate limiting in Cloud Armor:

```bash
gcloud compute security-policies rules create 1000 \
  --security-policy=my-policy \
  --expression="origin.region_code == 'RU'" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60
```

**Result**: Blocked the attack in **3 minutes**. Site stayed online.

([Source: Cloud Armor Rate Limiting](https://cloud.google.com/armor/docs/rate-limiting-overview)).

---

### Network Latency Between Regions

Running multi-region deployments? **Network latency** between regions can kill user experience.

**Example setup**:
- Frontend in `us-central1`
- Database in `asia-southeast1`

**Problem**: Every API call takes **200ms+ just for network round-trip**.

**How to monitor**:

```sql
fetch gce_instance
| metric 'compute.googleapis.com/instance/network/received_bytes_count'
| group_by 1m, [value_received_bytes_count_mean: mean(value.received_bytes_count)]
| filter (resource.zone == 'us-central1-a' || resource.zone == 'asia-southeast1-a')
```

**
