
# Server Monitoring for Security

Security isn't something you add after the fact. It's something you monitor continuously. Because here's the uncomfortable truth: most security breaches aren't discovered for weeks or even months after they happen.

According to [IBM's 2023 Cost of a Data Breach Report](https://www.ibm.com/reports/data-breach), it takes an average of 277 days to identify and contain a breach. That's over nine months where attackers have free access to your systems.

Server monitoring won't prevent every attack, but it gives you the visibility to detect suspicious activity before it becomes a disaster.

---

## Monitor Authentication and Access Patterns

Your authentication system is the front door to your infrastructure. Monitor it like you would monitor actual doors in a physical building.

**Track failed login attempts** across all systems:

```
# Alert on multiple failed attempts
failed_logins_rate > 5 within 5 minutes from same IP

# Alert on distributed attacks
failed_logins > 100 within 10 minutes from different IPs

# Alert on successful login after failures
failed_logins > 3 followed by successful_login within 15 minutes
```

That last one is critical. Attackers rarely get credentials right on the first try. A pattern of failures followed by success often indicates a successful brute force attack.

**Monitor privileged account usage:**

Every time someone uses `sudo`, accesses the database as `root`, or modifies production configurations, log it. Most companies don't get hacked through sophisticated zero-day exploits—they get hacked because someone's admin credentials were compromised.

**Track unusual access patterns:**

- Logins from new geographic locations
- Access outside normal business hours
- Multiple simultaneous sessions from different locations
- Access to resources a user doesn't normally touch

**Real example:** A developer at a SaaS company logged into their admin panel at 3am from an IP address in a country they'd never visited. Their monitoring system caught it within minutes. Turns out their credentials had been stolen through a phishing attack. The company locked the account before any damage was done.

Without monitoring? They would've discovered it weeks later when customer data showed up for sale on the dark web.

---

## Detect Anomalous Network Traffic

Your network traffic patterns are remarkably consistent. Most applications talk to the same external services, handle similar request volumes, and follow predictable patterns.

**When those patterns change, something's wrong.**

**Monitor outbound connections** (because data exfiltration happens through outbound traffic):

```
# Alert on connections to unusual ports
outbound_connections to ports not in [80, 443, 22, 3306, 5432, 6379]

# Alert on unusual data transfer volumes
outbound_bandwidth > baseline * 3

# Alert on connections to suspicious IPs
outbound_connections to IPs in threat_intelligence_feed
```

Most companies focus heavily on inbound security (firewalls, WAFs, etc.) but ignore outbound traffic. That's where the actual damage happens—when attackers exfiltrate your data.

**Watch for reconnaissance activity:**

Attackers don't just break in and grab data. They explore first. Port scans, directory brute forcing, and API endpoint enumeration all leave fingerprints.

Monitor for:
- Sequential port access attempts
- High request volumes to non-existent URLs (404s)
- Automated scanning tools (check User-Agent headers)
- Unusual API endpoint discovery patterns

**Track DNS queries:**

DNS is often overlooked in security monitoring, but it's incredibly revealing. Malware and command-and-control (C2) systems communicate through DNS.

Alert on:
- Queries to newly registered domains (often used for C2)
- Unusually long domain names (sometimes used for data exfiltration)
- High query volumes to specific domains
- Queries to known malicious domains

Integrate threat intelligence feeds like [AbuseIPDB](https://www.abuseipdb.com/) or [AlienVault OTX](https://otx.alienvault.com/) to automatically flag connections to known malicious IPs and domains.

---

## Monitor File System Integrity

Your application code and system files shouldn't change unexpectedly. When they do, it's often because an attacker has gained access and modified them.

**Implement file integrity monitoring (FIM):**

Tools like [AIDE](https://aide.github.io/) or [Tripwire](https://www.tripwire.com/) create cryptographic hashes of critical files and alert when they change.

**Monitor these locations closely:**

- Application code directories (`/var/www`, `/app`, etc.)
- System binaries (`/bin`, `/sbin`, `/usr/bin`)
- Configuration files (`/etc`)
- Cron job definitions (`/etc/cron.*`)
- SSH configuration (`/etc/ssh/`)
- User home directories (especially `.ssh/authorized_keys`)

**Real-world attack pattern:** Attackers gain access, add their SSH key to `authorized_keys`, and create a cron job to re-add it if removed. Without FIM, this backdoor can persist indefinitely.

```bash
# Example FIM alert
File modified: /etc/cron.d/backup
Hash changed: a3f2b9... -> c7d4e1...
Modified by: www-data (UID: 33)
Modification time: 2024-01-15 03:47:22
Process: /usr/bin/vi
```

That alert tells you *exactly* what changed and who changed it. Investigate immediately.

---

## Track Application-Level Security Events

System-level security is important, but most attacks happen at the application layer. SQL injection, XSS, authentication bypasses—these don't show up in system logs.

**Monitor these application security events:**

**SQL injection attempts:**

```
# Log suspicious SQL patterns in input
Input contains: UNION SELECT, DROP TABLE, '; --, OR 1=1

# Monitor database error patterns
Database errors containing: syntax error, unclosed quotation
```

**Authentication anomalies:**

- Password reset requests (especially high volumes)
- Session token manipulation attempts
- JWT signature verification failures
- OAuth token abuse

**Authorization failures:**

Every time a user tries to access something they shouldn't, log it. One failed authorization check is normal. Ten in rapid succession suggests someone is probing for vulnerabilities.

```javascript
// Log authorization failures with context
logger.warn("Authorization failed", {
  user_id: user.id,
  requested_resource: "/admin/users",
  user_role: "customer",
  required_role: "admin",
  endpoint: req.path,
  method: req.method,
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
})
```

**Rate limiting violations:**

If someone is hitting your API 1000 times per second, they're either a bot or a very angry person with a script. Either way, you want to know.

According to research from [Akamai](https://www.akamai.com/resources/state-of-the-internet/soti-security-ddos-threat-landscape), 83% of organizations experience more than 100 API attacks per month. Most of these start with reconnaissance—testing rate limits, probing endpoints, looking for weaknesses.

---

## Set Up Security-Focused Alerting

Security alerts are different from performance alerts. With performance, you might wait a few minutes to see if the system recovers. With security, every second matters.

**Implement tiered alerting:**

**Critical (immediate notification):**
- Successful login to privileged accounts from new locations
- File modifications in system directories
- Outbound connections to known malicious IPs
- Database dumps or exports by non-admin users

**High (5-minute delay, then alert):**
- Multiple failed login attempts
- Unusual outbound bandwidth spikes
- Configuration file changes
- Multiple authorization failures

**Medium (aggregate and alert hourly):**
- Rate limiting violations
- 404 patterns suggesting scanning
- Unusual API usage patterns

**Don't cry wolf.** If you alert on everything, your team will start ignoring alerts. Focus on high-confidence indicators of actual security issues.

**Use multiple notification channels for critical alerts:**

```
Critical security alert:
- PagerDuty page
- Slack channel mention (@security-team)
- SMS to on-call engineer
- Email to security@company.com
- Webhook to SIEM system
```

Redundancy ensures critical alerts don't get missed because someone silenced Slack notifications.

---

## Integrate with Security Information and Event Management (SIEM)

Your monitoring system should feed into a centralized SIEM platform. Tools like [Splunk](https://www.splunk.com/), [Elastic Security](https://www.elastic.co/security), or [Sumo Logic](https://www.sumologic.com/) aggregate logs from all sources and apply correlation rules.

**Why SIEM matters:**

Individual events often look innocent. It's the *pattern* across multiple systems that reveals attacks.

Example attack pattern:
1. Failed SSH login on web server (low priority)
2. Successful SSH login 10 minutes later (medium priority)
3. Database query to users table (normal operation)
4. Large file created in /tmp (medium priority)
5. Outbound connection to unknown IP (high priority)

Each event alone doesn't scream "attack." Together? Clear evidence of a breach in progress.

**Feed these logs into your SIEM:**

- Authentication logs from all systems
- Application security events
- Network flow data
- File integrity monitoring alerts
- Database access logs
- Cloud provider audit logs (AWS CloudTrail, GCP Cloud Audit Logs, Azure Monitor)

Configure correlation rules to detect multi-stage attacks that span multiple systems.

---

## Monitor Third-Party Dependencies and Vulnerabilities

According to [Snyk's 2023 State of Open Source Security Report](https://snyk.io/reports/open-source-security/), 95% of vulnerabilities in applications come from transitive dependencies—libraries your dependencies depend on.

**Implement continuous vulnerability scanning:**

Tools like [Snyk](https://snyk.io/), [Dependabot](https://github.com/dependabot), or [WhiteSource](https://www.whitesourcesoftware.com/) automatically scan your dependencies for known vulnerabilities.

```yaml
# Example vulnerability alert
Package: log4j-core
Version: 2.14.1
Vulnerability: CVE-2021-44228 (Log4Shell)
Severity: CRITICAL (10.0 CVSS)
Exploitable: Remote Code Execution
Fix available: Upgrade to 2.17.1
Production exposure: Yes (api-server, worker-01, worker-02)
```

That last line—production exposure—is critical. Knowing you have a vulnerability is one thing. Knowing *which production systems* are exposed tells you how urgent the fix is.

**Monitor for:**
- New CVEs affecting your dependencies
- License compliance issues (GPL in commercial software, etc.)
- Outdated packages (older than 6 months)
- Packages with known security issues

Set up automated alerts with severity thresholds. Critical vulnerabilities should page someone. Medium-severity issues can wait for the next business day.

---

## Implement Security Monitoring for Containers and Kubernetes

Containers add complexity to security monitoring because environments are ephemeral and scale dynamically.

**Monitor container-specific security events:**

**Image vulnerabilities:**
Scan images before deployment and continuously monitor running containers.

```bash
# Scan container image
trivy image myapp:latest

# Alert on vulnerabilities
CRITICAL: 3 vulnerabilities found
HIGH: 12 vulnerabilities found
```

**Runtime behavior:**
- Processes spawned inside containers (especially shells)
- File system modifications (containers should be immutable)
- Network connections from containers
- Privilege escalation attempts

**Kubernetes security monitoring:**

Tools like [Falco](https://falco.org/) provide runtime threat detection for Kubernetes:

```yaml
# Alert on shell spawned in container
rule: shell_in_container
condition: spawned_process and container and shell_procs
priority: WARNING

# Alert on sensitive file access
rule: read_sensitive_file
condition: open_read and sensitive_files
priority: ERROR
```

Monitor Kubernetes API server access logs. Every `kubectl` command, admission controller decision, and RBAC evaluation gets logged. Unusual patterns here often indicate compromised credentials.

---

## Track Compliance and Audit Requirements

If you're subject to compliance requirements (PCI-DSS, HIPAA, SOC 2, GDPR), your monitoring system is part of your compliance evidence.

**Key compliance monitoring requirements:**

**Access logging:**
- Who accessed what data and when
- Administrative actions and configuration changes
- Data exports and downloads

**Data retention:**
- Most compliance frameworks require 90 days to 7 years of log retention
- Logs must be tamper-proof (write-once storage)
- Regular backups with integrity verification

**Audit trails:**
- Every privileged action must be logged
- Failed access attempts must be recorded
- System modifications must be traceable to individuals

Tools like [Logz.io](https://logz.io/) or AWS CloudTrail provide compliant log management with long-term retention and tamper-proof storage.

**Pro tip:** Don't wait for an audit to test your logging. Quarterly, try to answer questions like "Who accessed customer X's data in the last 30 days?" or "What configuration changes were made to the payment system in December?" If you can't answer these quickly, your logging isn't audit-ready.

---

## Create a Security Monitoring Runbook

When a security alert fires at 2am, your on-call engineer shouldn't have to figure out what to do. They should follow a runbook.

**Essential runbook sections:**

**Alert triage checklist:**
```
1. Confirm alert is real (not false positive)
2. Assess severity and scope
3. Check if attack is ongoing
4. Identify affected systems/users
5. Determine if escalation is needed
```

**Common attack response procedures:**

*Suspected brute force attack:*
- Block attacking IP addresses
- Force password reset for targeted accounts
- Enable MFA if not already active
- Review successful logins in same timeframe

*Suspected data exfiltration:*
- Immediately cut network access from compromised system
- Preserve logs and disk images
- Identify what data was accessed
- Notify legal/compliance teams

**Escalation paths:**

Define *exactly* when to wake people up:

- Security incidents: Immediate escalation to security team
- Potential data breach: Escalate to CISO and legal within 30 minutes
- Ongoing active attack: Escalate to incident commander immediately

Include contact information, communication channels, and decision trees.

**That's the difference between containing a breach in 30 minutes versus 30 days.**
