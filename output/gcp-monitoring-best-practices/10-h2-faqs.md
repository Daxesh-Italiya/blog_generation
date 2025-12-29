
# FAQs

## What's the difference between GCP Monitoring and Cloud Logging?

**Simple answer**: Monitoring tracks **numbers** (like CPU usage, request counts, error rates), while Logging captures **events** (what happened, when, and why). You use Monitoring to say "error rate is 5%"—you use Logging to see *which* errors and *where* they came from. Both work together: Monitoring shows you *something's wrong*, Logging tells you *what broke*. Most production setups need both, but you can create log-based metrics in Monitoring to avoid paying for both separately if you're on a tight budget.

## How much data can I monitor for free?

GCP gives you **150 MB/month of metrics data** and **50 GB/month of logs** completely free. That sounds like a lot, but here's the reality: A single VM with basic monitoring uses about 1-2 MB/day. If you're running 10 VMs with custom metrics, you'll hit the limit in 2 weeks. The **[official GCP pricing page](https://cloud.google.com/stackdriver/pricing)** breaks it down—most teams spend $50-200/month once they're monitoring production workloads properly. The trick? Don't log debug-level events to production, and use sampling for high-frequency metrics.

## Can I monitor on-premise servers with GCP Monitoring?

**Yes**, but you need the **Ops Agent** (formerly Stackdriver agent) installed. It works on **any VM running Linux or Windows**—AWS, Azure, your own data center, doesn't matter. Install the agent, point it to your GCP project, and metrics/logs flow into Cloud Monitoring like they're native GCP resources. The catch? You're **still billed** for the data ingestion. We've set this up for hybrid cloud teams who want one monitoring dashboard for everything—works great, but plan your costs. Check **[Google's hybrid monitoring guide](https://cloud.google.com/monitoring/agent/ops-agent)** for installation steps.

## What's the best way to reduce monitoring costs?

**Stop logging everything**. Seriously, that's 80% of cost optimization. Here's what actually works: Set **log retention to 30 days** instead of the default (you rarely need year-old debug logs). Use **log exclusion filters** to drop health checks and routine background tasks. Switch from individual metrics to **distribution metrics** for high-cardinality data (timestamps, user IDs). And the big one—**delete metrics you're not using**. We've seen companies cut monitoring bills by 60% just by auditing what they're actually tracking. The **[GCP cost optimization guide](https://cloud.google.com/monitoring/cost-optimization)** has specific filters you can copy-paste.

## How do I monitor Kubernetes clusters on GKE?

GKE has **built-in Monitoring integration**—it's literally a checkbox when you create the cluster. Enable "Cloud Monitoring" and you automatically get pod-level metrics, container logs, and cluster health dashboards. No agent installation needed. You'll see CPU/memory per pod, network traffic, and error rates right in Cloud Monitoring. For custom application metrics, use the **[OpenTelemetry](https://opentelemetry.io/)** libraries (they're standardized and work everywhere, not just GCP). We covered this in the **Advanced Monitoring Techniques** section—the key is structuring your labels correctly so you can filter by namespace, deployment, or pod.

## Can I get alerts in Slack instead of email?

**Absolutely**. Cloud Monitoring integrates with Slack, PagerDuty, webhooks, and pretty much anything with an API. Set up a **notification channel** pointing to your Slack webhook URL, then add it to your alerting policy. You can even customize the message format with Markdown. Pro tip: Create **separate Slack channels** for different severity levels (#alerts-critical, #alerts-warning)—your team will actually *read* critical alerts if they're not buried under 50 warnings about disk space. The **[notification channels documentation](https://cloud.google.com/monitoring/support/notification-options)** walks through every integration option.

## What metrics should I monitor for Cloud Run?

Focus on **three core metrics**: Request count, request latency (P95/P99), and container instance count. Cloud Run auto-scales, so if instance count keeps climbing, you've got a performance issue—either your containers are too slow or you're getting more traffic than expected. Add **billable time** as a fourth metric if costs matter (you pay per 100ms of compute). For errors, track **5xx responses** and **cold start latency**. We've written a detailed breakdown in the **Common Monitoring Scenarios** section. The key? Don't monitor *everything*—Cloud Run abstracts infrastructure, so focus on **what your users experience**.

## How long does GCP keep my metrics data?

**6 weeks** by default for most metrics—then it's gone. Cloud Logging lets you **export to BigQuery** or Cloud Storage for long-term retention (years if you want). This is critical for compliance or trend analysis. If you need to prove "our error rate was X in Q1 2023" for an audit, you *need* to export logs before the 6-week window closes. Set up a **log sink** to BigQuery—it costs about $5/TB/month to store, which is cheap compared to re-ingesting data. Check the **[retention policies documentation](https://cloud.google.com/monitoring/quotas)** for exact timelines per metric type.

## Can I monitor API latency from different geographic locations?

**Yes—use Uptime Checks**. You can ping your API from **6+ Google Cloud regions** simultaneously (US, Europe, Asia, etc.) and track latency from each. This shows if your users in Tokyo are getting 2-second load times while New York sees 200ms. Set it up in Cloud Monitoring > Uptime Checks, point it at your API endpoint, and choose "All regions" for the checker locations. You'll get a dashboard showing **latency per region**—critical for global applications. We covered the full setup in the **Step-by-Step Guide** section. The free tier gives you 1 million checks/month, which is 1 check every 3 seconds.

## What's the easiest way to visualize custom metrics?

**Cloud Monitoring dashboards**—they're drag-and-drop simple. Add a chart, pick your metric (custom or built-in), choose a visualization type (line chart, heatmap, table), done. For more complex visualizations, export metrics to **Grafana** using the **[Cloud Monitoring Grafana plugin](https://grafana.com/grafana/plugins/stackdriver/)**. Grafana gives you more control over styling and supports combining GCP metrics with other data sources (AWS, Prometheus, etc.). Most teams start with native dashboards and only move to Grafana if they need cross-platform views. The built-in charts are honestly good enough for 90% of use cases.

---

**Still have questions?** Monitoring setups are unique to every team—what works for a 5-person startup breaks at 50 people. **[Schedule a free consultation](https://www.onboardify.ai/contact)** and we'll walk through your exact architecture. Or **[check out our GCP monitoring services](https://www.onboardify.ai/services)** to see how we've solved these problems for companies running everything from microservices to monoliths.
