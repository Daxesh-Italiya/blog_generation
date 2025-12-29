
# Critical Metrics to Monitor

You can't improve what you don't measure. That's especially true for server infrastructure where hundreds of metrics compete for your attention.

But here's the reality: Not all metrics matter equally. Some directly impact user experience and business outcomes. Others? They're just noise.

According to [Gartner's infrastructure monitoring research](https://www.gartner.com/en/documents/3986706), organizations that focus on 5-7 critical metrics instead of trying to monitor everything see 40% faster mean time to resolution (MTTR) compared to teams drowning in data.

Let's break down which metrics actually deserve your attention and why they matter.

## CPU Utilization

CPU utilization tells you how hard your processors are working. Think of it like monitoring your car's engine RPM—you need some load to move forward, but redlining constantly means trouble.

**Why it matters:**

High CPU usage directly impacts response times. When your processors max out, requests queue up waiting for processing power. That translates to slow page loads, API timeouts, and frustrated users.

**What to monitor:**

- **Overall CPU percentage**: The total processing power being used
- **Per-core utilization**: Modern servers have multiple cores that should distribute load evenly
- **CPU load average**: A smoothed metric showing trends over 1, 5, and 15-minute periods
- **Wait time**: How long processes spend waiting for CPU availability

**Healthy baselines:**

For most production servers, you're looking at 60-70% average utilization during normal operations. That gives you headroom for traffic spikes while still using resources efficiently.

Here's the catch: CPU usage patterns matter more than absolute numbers. A server consistently running at 85% might be fine. But sudden jumps from 30% to 95% signal something changed—maybe a runaway process, inefficient code deployment, or traffic surge.

[New Relic's performance benchmark study](https://newrelic.com/resources/ebooks/state-of-observability) found that applications maintaining CPU utilization below 75% experienced 60% fewer timeout errors compared to those regularly exceeding 80%.

**What to watch for:**

- **Sustained high usage** (>80% for extended periods): Indicates capacity issues
- **High system CPU vs. user CPU**: Suggests OS overhead or I/O bottlenecks
- **Uneven core distribution**: Points to single-threaded bottlenecks
- **Frequent context switching**: Shows too many competing processes

Set alerts for:
- CPU usage exceeding 80% for more than 5 minutes
- CPU load average exceeding the number of cores
- Sudden spikes of 30% or more within 60 seconds

## Memory Usage and RAM Monitoring

Memory is where active data lives. Your server loads applications, databases, and session data into RAM for quick access. Running out of memory forces the system to use disk-based swap space, which is roughly 1000x slower.

**Why it matters:**

Memory exhaustion causes cascading failures. First, performance degrades. Then applications start crashing. Eventually, the entire server becomes unresponsive requiring a hard reboot.

Unlike CPU, which you can often relieve by optimizing code, memory issues usually require adding more RAM or fixing memory leaks.

**What to monitor:**

- **Total memory usage**: How much RAM is currently allocated
- **Available memory**: How much RAM remains free
- **Swap usage**: Whether the system is using disk-based virtual memory
- **Memory per process**: Which applications consume the most RAM
- **Cache and buffer usage**: How the OS uses memory for performance optimization

**Healthy baselines:**

You want to see 20-30% free memory under normal load. Linux systems use available RAM for caching, which is actually good—that memory gets released when applications need it.

What's not good? Seeing swap usage climb. That's your server desperately trying to compensate for insufficient RAM by using much slower disk space.

**Understanding memory behavior:**

Memory usage typically grows gradually as:
- Application caches fill up
- Database query results get cached
- User sessions accumulate
- Background processes launch

That's normal. What's abnormal is seeing memory climb steadily without plateauing. That indicates a memory leak—code that allocates memory but never releases it.

According to [Datadog's infrastructure monitoring report](https://www.datadoghq.com/state-of-infrastructure-monitoring/), memory leaks account for roughly 23% of all production incidents in containerized environments.

**What to watch for:**

- **Sustained growth** in memory usage without corresponding traffic increases
- **Swap usage** above 10% of total memory
- **High page fault rates**: Indicates insufficient physical memory
- **OOM (Out of Memory) kills**: The OS terminating processes to free memory
- **Memory usage spikes** after deployments (potential new leak introduced)

Set alerts for:
- Memory usage exceeding 85%
- Any swap usage above 20%
- Memory growing more than 10% per hour without traffic correlation
- Individual processes consuming >25% of total RAM

## Disk Space and Storage Monitoring

Disk space issues sneak up on you. Everything works fine until suddenly you're at 98% capacity and applications start failing because they can't write logs, cache data, or save user uploads.

**Why it matters:**

Full disks don't just slow things down—they break things. Databases can't commit transactions. Web servers can't write session files. Log rotation fails, creating a cascading problem.

The tricky part? Disk usage often accelerates. You go from 70% to 95% faster than you went from 30% to 70% because log files grow exponentially during incidents and temporary files accumulate.

**What to monitor:**

- **Disk usage percentage** per partition or volume
- **Available disk space** in absolute numbers (GB remaining)
- **Disk I/O performance**: Read/write speeds and IOPS (input/output operations per second)
- **Inode usage** (on Linux): The metadata structures that track files
- **Growth rate**: How quickly disk usage is increasing

**Healthy baselines:**

Keep production disks below 75% capacity. That gives you buffer for log spikes, temporary files, and unexpected data growth.

But here's what many teams miss: Monitor growth rate, not just current usage. A disk at 60% that's growing 5% per week needs attention sooner than a disk at 70% that's been stable for months.

**What to monitor by disk type:**

Different storage serves different purposes:

- **System partition** (OS files): Should remain relatively stable; growth here indicates system issues
- **Application partition**: Growth correlates with deployments and configuration
- **Data partition** (databases): Growth should match business metrics like user signups
- **Log partition**: Can spike dramatically during incidents; needs aggressive rotation policies
- **Temp partition**: Should clean itself regularly; accumulation indicates cleanup failures

[Splunk's operational intelligence research](https://www.splunk.com/en_us/form/state-of-observability.html) shows that disk-space-related incidents account for roughly 15% of all unplanned downtime, despite being entirely preventable with proper monitoring.

**What to watch for:**

- **Sudden spikes** in disk usage (10%+ in minutes)
- **Inode exhaustion**: You can run out of inodes before running out of space
- **I/O wait time** increasing: Suggests disk performance bottlenecks
- **Specific directory growth**: Pinpoint which applications or logs are consuming space
- **Failed cleanup jobs**: Automatic log rotation or temp file cleanup not working

Set alerts for:
- Disk usage exceeding 75%
- Available space dropping below 10GB
- Disk usage growing >5% in 24 hours
- Inode usage exceeding 80%
- I/O wait time consistently above 20%

**Pro tip:** Don't just monitor overall disk usage. Track specific directories like `/var/log`, `/tmp`, and your application data directories. That context helps you respond faster when issues arise.

## Server Uptime and Availability

Uptime is the most fundamental metric: Is your server actually running and accessible?

This seems simple, but modern infrastructure complicates it. A server might be "up" from a ping perspective while the application running on it is completely unresponsive.

**Why it matters:**

Availability directly impacts revenue and user trust. [Gremlin's State of Chaos Engineering report](https://www.gremlin.com/state-of-chaos-engineering/) found that 76% of organizations experienced downtime incidents in the past year, with the average incident costing between $100,000 and $1 million per hour depending on industry.

That's not just lost transactions. It's damaged reputation, customer churn, and competitive disadvantage.

**What to monitor:**

- **Server reachability**: Can you connect to the server at all?
- **Service availability**: Are critical services (web server, database, etc.) responding?
- **Response time**: How quickly do services acknowledge requests?
- **Historical uptime percentage**: Track against SLA commitments
- **Planned vs. unplanned downtime**: Distinguish maintenance windows from outages

**Healthy baselines:**

Most modern SLAs target "three nines" (99.9%) or better:

- **99.9% uptime** = 8.76 hours of downtime per year (43.8 minutes per month)
- **99.95% uptime** = 4.38 hours per year (21.9 minutes per month)
- **99.99% uptime** = 52.6 minutes per year (4.4 minutes per month)
- **99.999% uptime** = 5.26 minutes per year (26 seconds per month)

Each additional "nine" becomes exponentially harder and more expensive to achieve. You need redundancy, automated failover, and sophisticated monitoring to hit 99.99% or above.

**Understanding the metrics:**

**Uptime** measures how long your server has been running since the last reboot. A server showing 180 days of uptime might seem great, but it could also indicate you're not applying security patches that require reboots.

**Availability** is different. It measures whether your server is accessible and functional. A server can be up but unavailable if network issues, firewall misconfigurations, or crashed services prevent access.

**Mean Time Between Failures (MTBF)** tells you how reliable your infrastructure is. Higher MTBF means fewer interruptions.

**Mean Time to Repair (MTTR)** measures how quickly you restore service after failures. Lower MTTR means faster recovery.

According to [Atlassian's incident management research](https://www.atlassian.com/incident-management/kpis/common-metrics), reducing MTTR by 50% often delivers more business value than improving MTBF by the same percentage, because failures will always happen—what matters is recovering quickly.

**What to watch for:**

- **Service-level failures** while server remains reachable (application crashes)
- **Frequent reboots** or crashes (indicates stability issues)
- **Degraded performance** before complete failures (early warning signs)
- **Network path failures** (server is up but unreachable)
- **Scheduled maintenance overruns** (planned downtime extending beyond maintenance windows)

**Monitoring approaches:**

Different monitoring provides different perspectives:

- **ICMP ping**: Confirms basic network reachability
- **TCP port checks**: Verifies specific services are listening (port 80 for HTTP, 443 for HTTPS, etc.)
- **HTTP health checks**: Confirms web applications respond correctly
- **Synthetic transactions**: Simulates real user workflows to verify end-to-end functionality
- **Heartbeat checks**: Applications periodically report "I'm alive" to monitoring systems

Set alerts for:
- Any unplanned downtime (immediate critical alert)
- Response time exceeding 3x baseline
- Services failing to respond within timeout periods
- Uptime percentage dropping below SLA threshold
- Repeated restart patterns (3+ in 24 hours)

**Pro tip:** Monitor from multiple geographic locations. Your server might be accessible from your office network but unreachable for users in other regions due to routing or CDN issues.

## Application Performance Metrics

Server metrics tell you about the infrastructure. Application metrics tell you about user experience. You need both.

A server can show perfect CPU, memory, and disk numbers while the application runs terribly due to inefficient code, database bottlenecks, or external API delays.

**Why it matters:**

Users don't care about your server metrics. They care whether their page loads quickly and their transactions complete successfully.

[Google's research on page speed](https://developers.google.com/web/fundamentals/performance/why-performance-matters) demonstrates that as page load time increases from 1 second to 3 seconds, bounce rate increases by 32%. From 1 to 5 seconds? Bounce rate jumps 90%.

That directly impacts conversion rates, customer satisfaction, and revenue.

**What to monitor:**

- **Response time**: How long requests take from initiation to completion
- **Throughput**: How many requests your application processes per second
- **Error rates**: Percentage of requests failing or returning errors
- **Database query performance**: Time spent on database operations
- **External API latency**: Delays from third-party services
- **Concurrent users**: How many users are actively using the application

**Healthy baselines:**

Response times vary dramatically by application type, but general guidelines:

- **Web pages**: Under 2 seconds for initial load, under 1 second for subsequent interactions
- **API endpoints**: Under 200ms for most requests, under 500ms for complex operations
- **Database queries**: Under 100ms for simple queries, under 500ms for reports
- **Search operations**: Under 300ms for basic searches

Error rates should stay below 0.1% during normal operations. Anything consistently above 1% indicates serious problems.

**Understanding application metrics:**

**Latency** is the time users wait for responses. It consists of:
- Network time (data transmission)
- Processing time (your code execution)
- Database time (query execution)
- External dependencies (API calls, file systems)

**Apdex (Application Performance Index)** provides a simplified score combining response times and error rates into a single 0-1 metric. Above 0.94 is excellent; below 0.5 indicates serious issues.

[New Relic's application monitoring data](https://newrelic.com/resources/ebooks/state-of-observability) shows that organizations monitoring application-level metrics alongside infrastructure metrics detect and resolve issues 3x faster than those focusing on infrastructure alone.

**What to watch for:**

- **Response time degradation** without corresponding infrastructure changes
- **Error rate spikes** during deployments (indicates new bugs)
- **Database query slowdowns** (suggests missing indexes or inefficient queries)
- **Throughput drops** despite available server capacity (application bottlenecks)
- **Memory leaks** visible through growing response times over hours/days
- **Failed external API calls** impacting user experience

**Correlation is key:**

The real power comes from correlating application metrics with infrastructure metrics:

- Rising CPU usage + increasing response times = computational bottleneck
- High memory usage + slow database queries = insufficient query caching
- Normal infrastructure + slow responses = application code inefficiency
- Spike in throughput + high CPU + stable response times = good horizontal scaling

Set alerts for:
- Response times exceeding 2x baseline for 5 minutes
- Error rates above 1%
- Apdex score dropping below 0.7
- Throughput dropping 30% without corresponding traffic decrease
- Database query time increasing 50% from baseline

**Pro tip:** Track response times by percentile, not just averages. The 95th percentile (P95) shows what your slowest 5% of users experience. P99 catches even rarer slowdowns that still impact real users. An average response time of 200ms might hide a P95 of 5 seconds.

---

The metrics covered here form the foundation of effective server monitoring. But collecting metrics is just step one. You need the right thresholds, alert configurations, and response procedures to turn data into action.

That's where monitoring best practices come in—which we'll explore in the next section.
