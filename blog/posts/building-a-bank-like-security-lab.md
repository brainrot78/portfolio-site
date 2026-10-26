For my engineering project (proposed by Gérance Informatique) I built and secured a bank-like infrastructure from the internet edge to the endpoint. Here's the short version of how it fits together. The [full case study](/projects/banking-security-platform) has more detail.

## Outside in

1. **Edge.** Cloudflare for DNS and DDoS protection.
2. **Perimeter.** pfSense, with admin access only through a hardened WireGuard VPN.
3. **DMZ.** An Nginx reverse proxy behind BunkerWeb and the Naxsi WAF (learning mode, then blocking), and a **T-Pot honeypot** to attract attackers.
4. **IDS/IPS.** Suricata and Snort between zones.
5. **Segmentation.** OPNsense separating the DMZ, server, user and SOC zones.
6. **Endpoints.** Wazuh agents for EDR, with ML malware detection and UEBA.
7. **SOC.** MISP and OpenCTI for intelligence, n8n for SOAR, and TheHive and DFIR-IRIS for cases.

## Playbooks

I automated the most common alerts first: **SSH brute force**, **malware detection** and **Active Directory privilege escalation**. Each one enriches, scores and opens a case with the context already attached. An LLM also turns Wazuh findings into readable audit reports.

## Did it work?

With 15+ custom YARA and Wazuh rules plus the ML models, the platform detected **92% of malicious logs** in testing, on an infrastructure handling 10,000+ transactions a day. Scheduled Nmap-based pentests kept checking that every layer still did its job.

## Biggest lesson

The tools are the easy part. Getting a firewall, a WAF, an EDR and a SOAR to describe the same incident with the same fields is where the real engineering happens.
