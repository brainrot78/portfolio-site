Every week there's a new demo of an "AI SOC analyst" that reads an alert and decides whether it's malicious. It's impressive, and I still wouldn't let it make the final call.

## Where AI genuinely helps

In the automation I build, LLMs are good at three things:

- **Extraction.** Pulling IOCs, TTPs and CVEs out of messy, unstructured threat reports.
- **Context.** Explaining what a technique means and how it relates to other activity.
- **Summaries.** Turning a dozen enrichment results into a paragraph an analyst can read in ten seconds.

## Where it doesn't belong

The **verdict** (malicious, suspicious or benign) has to be reproducible. Ask the same question twice and you should get the same answer, with a reason you can audit. So my playbooks score indicators with explicit, weighted rules over enrichment results, and the LLM only writes the explanation afterwards.

## Guarding against hallucinations

When an LLM extracts entities from a report, I add a deterministic check after it:

1. **Regex first** for the obvious indicators (IPs, hashes, domains, CVE IDs).
2. **LLM second** for context and TTP mapping.
3. **Verification last:** every extracted entity must be grounded in a quote from the source, and it gets a confidence score. Anything ungrounded is dropped.

That last step is what lets a pipeline like this feed real detection without poisoning it.

> AI should make analysts faster. It shouldn't make them trust something they can't check.
