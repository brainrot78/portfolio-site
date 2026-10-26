"Shift left" gets said a lot. For this project I wanted to actually build it: a Jenkins pipeline for a Spring Boot app where security checks run on every push, alongside the unit tests.

## The stages

| Stage | Tool | What it catches |
| --- | --- | --- |
| Secret detection | Gitleaks | API keys, tokens and passwords in code and git history |
| SAST | SonarQube | Vulnerable code patterns, security hotspots, quality gate |
| SCA | OWASP Dependency-Check | Known CVEs in Maven dependencies |
| Container scan | Trivy | Vulnerable OS packages and libraries in the image |
| DAST | Nikto | Misconfigurations in the running app |
| Reporting | DefectDojo | Deduplication, triage, tracking until fixed |

## Order matters

Fast, cheap checks go first and fail fast. If a secret is committed, there's no point building an image. The slower scans run only on builds that got through the earlier ones.

## DefectDojo is the real hero

Five scanners produce a lot of overlapping noise. Without a central place to **deduplicate and track findings**, developers stop reading reports quickly. Importing every scan into DefectDojo turned five separate reports into one backlog with owners and status.

## What I'd add next

- A full DAST crawler for deeper application testing
- Policy as code for the quality gates
- Signing images before they are pushed to a registry
