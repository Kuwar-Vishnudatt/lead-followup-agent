# Short note

**What I built**

A single-screen lead follow-up dashboard for a packaging-equipment sales
team. It seeds 20 sample leads (names, company, phone, source, product
interest) and 15 WhatsApp-style chat threads, then runs an agent over each
lead to assign a Hot/Warm/Cold tag with a one-line reason, a next
follow-up date, and a ready-to-send draft message. The dashboard sorts
overdue and due-today leads to the top, flags overdue ones in red, and lets
a rep open any lead to read the chat, edit the draft, mark it sent, or log
a new WhatsApp message — any of which re-runs the agent on that lead
instantly. Reps can also add a brand-new lead from the dashboard.

**How the agent decides Hot / Warm / Cold**

It's a deterministic, explainable scoring engine rather than an LLM call —
on purpose. A live demo screen that a reviewer opens once, with no retry
budget, shouldn't depend on an external API staying up or a prompt
producing a parseable answer every time. The engine starts every lead at a
baseline score of 50 and adjusts it: buying-intent phrases in the buyer's
*most recent* message push it up (asking for a quote, confirming an order,
saying "go ahead"), objection/decline phrases push it down hard ("not
interested," "too expensive," "went with another supplier"), stalling
phrases ("checking with my team") pull it down slightly, and how many days
have passed since the last message — and whether the buyer ever replied to
the rep's last outreach — adjusts it further. The score maps to a tag
(≥70 Hot, 40–69 Warm, <40 Cold), and the reason shown is whichever single
factor moved the score the most, stated in plain language. Only the most
recent buyer message drives intent, deliberately — a reversal like
"actually, not interested anymore" should outweigh whatever was said
before it, not get averaged against it. The next follow-up date is parsed
from any explicit date mentioned in the recent chat ("call you Monday"),
falling back to a cadence by tag (Hot = next day, Warm = 3 days, Cold = 7
days). Draft messages are templated per tag and per matched signal (price
objection vs. ready-to-order vs. gone-quiet all get different openers).

**AI tools used**

Built end-to-end with Claude Code (Claude Sonnet 5) — architecture,
scoring logic, UI, sample data, and verification all done in one agentic
coding session, including live-testing the app in a real browser to catch
and fix a scoring bug (a negated phrase like "not interested" was also
matching the positive keyword "interested") before shipping.

**What I'd build next**

Swap the WhatsApp-message logging for a real WhatsApp Business API webhook
so chats land automatically instead of being typed in by the rep; move
state from localStorage to a shared database so multiple reps see the same
board; and A/B an LLM-drafted message (with the rule-based one as a
guaranteed fallback) to see if it beats the templates on reply rate.
