# TinyOps PRD — AI Client Memory & Operations Platform

**Version:** 0.1
**Product name:** TinyOps
**Primary initial user:** Small relationship-based entrepreneur managing 50–2,000 clients/customers manually
**Initial internal customer:** Your wife, an online sexual therapist/course creator managing 100+ participants
**Long-term category:** AI-assisted CRM, client data timeline, and task automation platform for tiny businesses
**Core thesis:** Tiny businesses do not need another empty CRM. They need a trusted system that connects to scattered data sources, builds a useful client timeline automatically, and helps them take safe, personalized actions.

---

## 1. Executive Summary

TinyOps is an AI-powered client memory and operations platform for solo entrepreneurs and very small teams.

The product connects to scattered data sources such as email inboxes, Google Forms, Google Sheets, course platforms, payment systems, calendars, and existing CRMs. It aggregates all client-related interactions by email address into a unified timeline. On top of that timeline, TinyOps provides AI-generated summaries, client progress insights, feedback extraction, follow-up recommendations, and safe action workflows such as sending monthly check-in emails.

The first MVP will be built around your wife’s real workflow:

> Given a list of clients, TinyOps should be able to look up past email interactions, summarize each client’s history, generate safe personalized monthly emails, and let her review before sending.

But the long-term vision is broader:

> TinyOps becomes the lightweight AI operating system for client-based businesses: one place to understand each client, see their history, and perform recurring or one-off operational tasks.

The product should not start as a fully horizontal “general AI data platform.” That is too abstract, too hard to position, and too easy to overbuild. The better direction is:

> **An AI client memory and operations platform for small relationship-based businesses.**

Internally, it can be designed as a general data platform. Externally, it should be sold as a very practical outcome-driven product: “See everything about a client in one timeline, then take action.”

---

## 2. Product Vision

### 2.1 Long-Term Vision

TinyOps helps tiny businesses answer three questions:

1. **What do I know about this client?**
   Show all interactions, purchases, forms, messages, course progress, feedback, bookings, and notes in one timeline.

2. **What does it mean?**
   Use AI to summarize the client’s history, identify original goals/problems, track progress, detect feedback, and suggest next actions.

3. **What should I do next?**
   Help the entrepreneur execute tasks such as sending check-ins, reminders, reactivation emails, upsell invitations, progress reports, or support follow-ups.

### 2.2 Product Promise

> TinyOps turns scattered client data into a private, useful memory system — then helps small businesses act on it safely.

### 2.3 Brand Positioning

TinyOps should feel:

- Lightweight, not enterprise.
- Warm, not robotic.
- Safe, not creepy.
- Practical, not “AI magic.”
- Personal, not spammy.
- Built for busy operators, not technical workflow builders.

### 2.4 Product Category

TinyOps sits between several categories:

| Category               | What TinyOps borrows                           | What TinyOps avoids                           |
| ---------------------- | ---------------------------------------------- | --------------------------------------------- |
| CRM                    | Client profiles, timelines, follow-up tracking | Manual data entry and bloated sales pipelines |
| Automation tools       | Recurring tasks and integrations               | Complex workflow builders                     |
| AI assistant           | Summaries, drafts, recommendations             | Uncontrolled autonomous actions               |
| Customer data platform | Unified data model                             | Enterprise complexity                         |
| Email marketing        | Segmented messaging                            | Mass generic campaigns                        |

The product should eventually become an **AI CRM/data platform**, but the initial market-facing wedge should be narrower: **AI client memory and ops for solopreneurs.**

---

## 3. Problem Statement

Small entrepreneurs often manage customer relationships across fragmented tools:

- Email inboxes.
- Google Forms.
- Google Sheets.
- Payment platforms.
- Course platforms.
- Calendars.
- Chat apps.
- Manual notes.
- Old CRMs.
- CSV files.
- Survey responses.
- Support messages.

They frequently need to perform tasks like:

- “What do I know about this person?”
- “Has this client ever contacted me before?”
- “What was their original issue?”
- “Did they complete the training?”
- “Did they give feedback?”
- “Who needs a follow-up?”
- “Who should receive a monthly email?”
- “Can I send this group a personalized message?”
- “Who has not progressed?”
- “Which clients are at risk of dropping off?”

Today, these tasks require manual searching, copying, reading, spreadsheet work, and repetitive writing.

For a sensitive relationship-based business, such as sexual therapy or personal coaching, this problem is even more painful because personalization must be careful. The business owner wants clients to feel remembered, but not exposed, watched, or reduced to private details.

---

## 4. Target Customers

### 4.1 Initial Target Customer

The first customer is your wife.

Profile:

- Online sexual therapist/course creator.
- Manages 100+ participants.
- Has client data scattered across email, forms, and possibly course-related tools.
- Sends recurring and one-off emails.
- Needs context-aware communication.
- Needs privacy-sensitive handling.
- Does not want to maintain a CRM manually.
- Wants quick lookup by client email.

### 4.2 Broader Ideal Customer Profile

TinyOps is for small businesses where relationships matter and client history is useful.

Examples:

- Online therapists and relationship educators.
- Coaches.
- Course creators.
- Cohort-based educators.
- Consultants.
- Tutors.
- Wellness professionals.
- Community managers.
- Small agencies.
- Boutique service providers.
- Personal trainers.
- Nutritionists.
- Fertility educators.
- Career mentors.

### 4.3 Early Market Recommendation

Start with:

> **Coaches, course creators, and sensitive-service educators who sell programs to small cohorts or communities.**

This is narrower than “all small entrepreneurs,” but broad enough to find repeated use cases.

---

## 5. Core User Personas

### 5.1 Solo Expert / Founder

**Example:** Your wife.

Needs:

- See everything about a client quickly.
- Send warm, personal, safe messages.
- Avoid forgetting people.
- Avoid manually searching old emails.
- Avoid CRM admin.
- Trust the AI not to expose private details.

Pain points:

- Data is scattered.
- Repetitive tasks pile up.
- Manual personalization takes too long.
- Existing CRMs feel too sales-oriented.
- Automation tools are too technical.

### 5.2 Assistant / Operations Helper

A part-time VA, assistant, or team member helping the founder.

Needs:

- Prepare drafts.
- Review client context.
- Flag risky/sensitive cases.
- Execute approved tasks.
- Avoid seeing unnecessary sensitive details.

Pain points:

- Needs enough context to help, but should not see everything.
- Needs clear audit trail.
- Needs owner approval for sensitive actions.

### 5.3 Technical Implementer / Setup Partner

This may initially be you.

Needs:

- Connect data sources.
- Configure mappings.
- Build custom recipes.
- Debug ingestion.
- Ensure safe defaults.
- Personalize system for each client.

Pain points:

- Every client has different messy systems.
- Integrations are inconsistent.
- Need repeatable configuration patterns.

---

## 6. Product Principles

### 6.1 Timeline First

Every client should have a timeline.

The timeline is the foundation of the product. If TinyOps does nothing else, it should answer:

> “What happened with this person, in what order, and where did the data come from?”

### 6.2 AI Must Be Grounded

Every AI-generated summary, insight, or recommendation should be traceable to source interactions.

Bad:

> “The client seems anxious and dissatisfied.”

Good:

> “Based on the form submitted on March 3 and the email on March 8, the client appears to be looking for more structured exercises.”

AI outputs should include source references internally, even if not always shown prominently.

### 6.3 Personalization Should Be Safe by Default

TinyOps should prefer light, relationship-aware personalization.

Good:

> “I hope the course materials have been useful so far.”

Risky:

> “I remember you mentioned a painful relationship issue last month.”

The product should have a “personalization firewall” that blocks overly intimate, embarrassing, or sensitive details from being used in outbound messages.

### 6.4 Human Approval Before External Action

For the MVP and for sensitive businesses, AI should prepare actions, not execute them blindly.

Default:

- AI drafts.
- Human reviews.
- Human approves.
- System sends.
- System logs.

### 6.5 Useful Before Perfect

TinyOps should not require a perfectly clean CRM.

It should work with imperfect data:

- Missing names.
- Duplicate emails.
- Old forms.
- Partial CSVs.
- Messy inbox threads.
- Inconsistent tags.
- Multiple email addresses per person.

### 6.6 Designed for Tiny Businesses

No enterprise complexity unless absolutely necessary.

Avoid:

- Overly complex permissions in v1.
- Large workflow builders.
- Complicated pipeline setup.
- Heavy dashboards.
- Long onboarding.

Prefer:

- Search by email.
- Simple client profile.
- Clear timeline.
- Clear AI summary.
- Practical task templates.

---

## 7. Core Product Concept

TinyOps has three core layers.

## Layer 1: Data Collection

Connect to data sources and ingest client-related events.

Initial sources:

- IMAP mailbox.
- CSV upload.
- Google Forms responses via Google Sheets or CSV export.
- Manual notes.

Future sources:

- Gmail.
- Outlook.
- Google Calendar.
- Calendly.
- Stripe.
- PayPal.
- Teachable.
- Kajabi.
- Thinkific.
- Typeform.
- Airtable.
- Notion.
- HubSpot.
- Mailchimp.
- WhatsApp or Telegram exports.
- Slack or Discord communities.

## Layer 2: Client Memory

Aggregate events by client identity, primarily email address.

For each client:

- Unified profile.
- Interaction timeline.
- AI summary.
- Original problem or goal.
- Training/course progress.
- Feedback history.
- Sentiment or satisfaction signals.
- Open questions.
- Suggested next action.
- Safe personalization snippets.
- Risk/sensitivity flags.

## Layer 3: Operations

Use the client memory to perform tasks.

Examples:

- Send monthly check-ins.
- Generate client summaries.
- Find people who need follow-up.
- Send reminders.
- Ask for feedback.
- Identify inactive participants.
- Prepare a weekly client attention report.
- Create reactivation campaigns.
- Draft personal replies.
- Generate progress reports.
- Invite clients to next course.

---

# 8. MVP Scope

## 8.1 MVP Name

**TinyOps MVP: Client Timeline + Monthly Check-In**

The MVP should combine two things:

1. A client lookup dashboard.
2. A monthly email workflow.

This is important because the dashboard proves the long-term vision, while the email workflow solves an immediate recurring pain.

---

## 8.2 MVP Objective

Help your wife manage participants by allowing her to:

1. Type an email address and see all known interactions with that client.
2. View an AI-generated client summary.
3. Upload a CSV of participants.
4. Generate monthly check-in emails using past interactions.
5. Review and approve drafts before sending.
6. Schedule the task to repeat monthly.

---

## 8.3 MVP User Story

As an online therapist/course creator, I want to type a client’s email address into TinyOps and immediately see their history, summary, original problem, progress, and feedback, so I do not need to manually search my inbox and forms.

As the same user, I want to upload a list of clients and ask TinyOps to draft monthly check-in emails using safe personalization, so I can keep in touch with 100+ people without manually writing every message.

---

## 8.4 MVP Data Sources

### Required for MVP

#### 1. IMAP Mailbox

Purpose:

- Fetch email threads between the owner and clients.
- Identify previous conversations.
- Extract dates, subjects, senders, recipients, and message content.
- Build client timelines.

MVP requirements:

- Connect mailbox using IMAP credentials or app password.
- Read-only ingestion for historical emails.
- Ability to search by client email.
- Ability to fetch thread/message history.
- Store metadata and normalized text.
- Avoid sending from mailbox until user explicitly approves a campaign.

#### 2. CSV Upload

Purpose:

- Import participant lists.
- Provide names, emails, course names, cohort names, tags, and statuses.
- Drive batch tasks such as monthly check-ins.

MVP requirements:

- Upload CSV.
- Detect columns.
- Allow manual column mapping.
- Validate email addresses.
- Show invalid or duplicate rows.
- Merge rows into existing client profiles by email.

#### 3. Google Forms Responses

For the MVP, the simplest path is to support this as **Google Sheets import** or **CSV export from Google Forms**.

Purpose:

- Bring in intake form responses.
- Capture original problem, goals, feedback, expectations, and survey data.

MVP requirements:

- Option A: upload exported CSV from Google Forms.
- Option B: connect a Google Sheet read-only.
- Map form fields to event fields.
- Store each form submission as a timeline event.
- Use form data in AI summaries.
- Do not automatically use highly sensitive form content in outbound emails.

### Not Required for MVP

- Full CRM integrations.
- Course platform integrations.
- Payment system integrations.
- Calendar integrations.
- Real-time sync.
- Multi-user permissions.
- Complex automation builder.
- Mobile app.

---

# 9. MVP Functional Requirements

## 9.1 Authentication

### Requirement

The owner can create an account and log in.

### Acceptance Criteria

- User can sign up with email/password or magic link.
- User can log in and log out.
- Data is tenant-isolated.
- One account maps to one workspace in MVP.

---

## 9.2 Workspace Setup

### Requirement

The owner can configure basic business settings.

### Fields

- Business name.
- Owner name.
- Sender email.
- Default tone.
- Business type.
- Sensitive-business mode on/off.
- Default personalization level.
- Default signature.
- Physical mailing address if needed for commercial emails.
- Default opt-out footer if sending marketing-style emails.

### Acceptance Criteria

- Settings are saved.
- Settings are used in generated drafts.
- Sensitive-business mode changes AI behavior.

---

## 9.3 Data Source Connection: IMAP

### Requirement

The owner can connect a custom IMAP mailbox.

### User Flow

1. User opens “Data Sources.”
2. User selects “Mailbox / IMAP.”
3. User enters host, port, username, password or app password, TLS settings.
4. TinyOps tests the connection.
5. User chooses ingestion window:
   - Last 30 days.
   - Last 90 days.
   - Last 12 months.
   - All available.

6. TinyOps starts ingestion.
7. User sees sync status.

### Acceptance Criteria

- Connection test succeeds or shows clear error.
- Emails are ingested without sending anything.
- Ingestion can be paused.
- Ingestion errors are visible.
- Duplicate messages are not repeatedly imported.
- Each imported email becomes one or more timeline events.
- Threads are grouped when possible.

---

## 9.4 Data Source: CSV Upload

### Requirement

The owner can upload a CSV of clients or form responses.

### User Flow

1. User uploads CSV.
2. TinyOps previews first rows.
3. TinyOps suggests column mappings.
4. User confirms:
   - Email column.
   - Name column.
   - Date column, if available.
   - Event type.
   - Optional fields.

5. TinyOps imports data.
6. Imported rows are matched to client profiles.

### Acceptance Criteria

- CSV import works for UTF-8 files.
- Invalid emails are flagged.
- Duplicate rows are detected.
- Existing clients are updated.
- Unknown clients are created.
- Import results show:
  - rows imported;
  - rows skipped;
  - errors;
  - duplicates;
  - created clients;
  - updated clients.

---

## 9.5 Data Source: Google Forms / Google Sheets

### Requirement

The owner can import Google Forms responses, either by CSV export or Google Sheets connection.

### MVP Recommendation

Start with CSV export from Google Forms responses. Add direct Google Sheets connection after the core value is proven.

### Acceptance Criteria

- User can import exported Google Forms responses.
- Each submission creates a timeline event.
- Form submission date is used as event date.
- Form questions and answers are preserved.
- AI can summarize form responses.
- Sensitive answers are marked as sensitive where appropriate.
- Outbound email generation does not directly quote sensitive answers by default.

---

## 9.6 Client Identity Resolution

### Requirement

TinyOps aggregates data by email address.

### MVP Identity Rules

Primary matching key:

- Lowercased, normalized email address.

Secondary matching:

- Name only as display metadata, not as an automatic merge key.
- Multiple emails per client can be manually linked later, but not required in MVP.

### Acceptance Criteria

- `Anna@example.com` and `anna@example.com` map to the same client.
- One client can have multiple events from multiple data sources.
- Duplicate contacts are flagged.
- User can manually merge duplicate client profiles in a later version.

---

## 9.7 Client Search

### Requirement

The owner can type an email address and find a client profile.

### User Flow

1. User opens search bar.
2. User types email address.
3. TinyOps returns matching client.
4. User opens client profile.
5. User sees timeline, summary, and related insights.

### Acceptance Criteria

- Search by exact email works.
- Partial email search works.
- Search results show name, email, last interaction date, and source count.
- If no profile exists, TinyOps shows “No data found” and allows manual creation or import.

---

## 9.8 Client Profile Page

### Requirement

Each client has a profile page containing structured information and a timeline.

### MVP Profile Sections

#### Header

- Name.
- Email.
- Tags.
- Last interaction date.
- Data sources connected.
- Risk/sensitivity indicator.
- Consent/contact status.

#### AI Summary

- Short client summary.
- Original problem or goal.
- Current progress.
- Important context.
- Feedback.
- Suggested next action.
- Safe personalization note.

#### Timeline

- Emails.
- Form submissions.
- CSV/imported events.
- Manual notes.
- Sent emails from TinyOps.

#### Actions

- Draft email.
- Add note.
- Mark do-not-contact.
- Refresh AI summary.
- View source data.

### Acceptance Criteria

- Timeline is sorted by event date.
- Events show source, date, title, and summary.
- User can expand event to see details.
- AI summary can be regenerated.
- AI summary references underlying events internally.
- Sensitive events are visually marked.
- User can manually edit client notes.

---

## 9.9 Timeline Events

### Requirement

All imported client data is represented as timeline events.

### Event Types

MVP event types:

- Email received.
- Email sent.
- Form submission.
- CSV import row.
- Manual note.
- TinyOps-generated email.
- System event.

Future event types:

- Purchase.
- Course enrollment.
- Course progress.
- Appointment booked.
- Appointment attended.
- Community message.
- Support ticket.
- Payment failed.
- Refund.
- Subscription canceled.
- Feedback submitted.

### Event Fields

Each event should include:

```text
event_id
workspace_id
client_id
source_id
source_type
event_type
event_date
created_at
title
summary
raw_content_pointer
raw_content_text_optional
participants
metadata
sensitivity_level
ai_extracted_fields
```

### Acceptance Criteria

- Events are displayed chronologically.
- Event source is always visible.
- Imported events are immutable unless deleted or reprocessed.
- AI summaries are stored separately from raw source data.
- User can delete events.

---

## 9.10 AI Client Summary

### Requirement

TinyOps generates a concise, useful summary for each client.

### MVP Summary Fields

```text
short_summary
original_problem_or_goal
current_progress
important_context
feedback_or_sentiment
open_questions
recommended_next_action
safe_personalization_snippet
sensitive_topics_to_avoid
confidence_score
last_generated_at
```

### Example

```markdown
Client: anna@example.com

Short summary:
Anna joined the March intimacy communication course and has mainly interacted about accessing recordings and completing exercises.

Original problem or goal:
She wanted structured guidance and practical exercises to improve communication in her relationship.

Current progress:
She appears to be engaging with course materials but has not submitted recent feedback.

Feedback:
Positive about the first module; asked for clearer instructions on replay access.

Recommended next action:
Send a light monthly check-in asking whether she has been able to continue with the exercises.

Safe personalization:
"Hope the replay materials have been helpful."

Avoid:
Do not mention intimate relationship details from intake forms.
```

### Acceptance Criteria

- Summary is generated from timeline events.
- Summary avoids overclaiming when data is insufficient.
- Summary includes confidence level.
- Sensitive-business mode prevents explicit sensitive details from appearing in default outbound copy.
- User can edit or pin summary fields.

---

## 9.11 Sensitivity Detection

### Requirement

TinyOps detects whether a timeline event contains sensitive personal content.

### Sensitivity Levels

| Level | Meaning          | Example Handling                       |
| ----- | ---------------- | -------------------------------------- |
| 0     | Not sensitive    | Can be summarized normally             |
| 1     | Mildly personal  | Can be used carefully                  |
| 2     | Sensitive        | Summarize cautiously                   |
| 3     | Highly sensitive | Do not use in outbound personalization |
| 4     | Restricted       | Hide by default; owner-only            |

### MVP Sensitive Categories

Especially relevant for your wife’s business:

- Sexual relationship details.
- Health or therapy-like disclosures.
- Trauma or emotional crisis.
- Relationship conflict.
- Identity, orientation, or intimate preferences.
- Payment hardship.
- Complaints.
- Highly personal form answers.

### Acceptance Criteria

- Sensitive events are flagged.
- High-sensitivity details are excluded from generated outreach.
- The system can still use sensitive context to avoid inappropriate messaging.
- Example: if a client disclosed a serious issue, TinyOps should avoid cheerful generic upsell language.
- User can override sensitivity classification manually.

---

## 9.12 Monthly Check-In Campaign

### Requirement

The owner can upload/select a list of clients and generate monthly check-in emails.

### User Flow

1. User opens “Tasks.”
2. User selects “Monthly Check-In.”
3. User chooses input list:
   - uploaded CSV;
   - saved segment;
   - all active clients.

4. User configures:
   - email goal;
   - tone;
   - personalization level;
   - sensitive-business mode;
   - send from address;
   - approval required;
   - schedule.

5. TinyOps analyzes each client.
6. TinyOps generates a draft per client.
7. User reviews drafts in a table.
8. User edits or approves drafts.
9. TinyOps sends approved emails.
10. Sent emails are logged to client timelines.
11. Task can be scheduled monthly.

### Acceptance Criteria

- Clients with no prior history receive generic email.
- Clients with safe prior history receive light personalization.
- Clients with sensitive history receive generic or highly cautious email.
- Unsubscribed/do-not-contact clients are skipped.
- User can approve individually or bulk approve low-risk drafts.
- User can edit drafts before sending.
- No email is sent without approval in MVP.
- Sent messages appear on client timelines.

---

## 9.13 Email Draft Review Grid

### Requirement

User can review many generated emails efficiently.

### Table Columns

- Client name.
- Email address.
- Data found.
- Last interaction date.
- AI summary.
- Personalization snippet.
- Risk level.
- Draft preview.
- Status.
- Action.

### Actions

- Approve.
- Edit.
- Regenerate.
- Use generic.
- Skip.
- Mark do-not-contact.
- Open full client profile.

### Acceptance Criteria

- User can filter by risk level.
- User can bulk approve low-risk emails.
- High-risk emails require individual review.
- User can see why TinyOps personalized or did not personalize.
- Draft history is saved.

---

## 9.14 Sending Emails

### Requirement

TinyOps sends approved emails from the owner’s mailbox or configured sender.

### MVP Sending Options

Option A:

- SMTP via the same mailbox provider.

Option B:

- Generate drafts and let owner send manually.

Recommended MVP path:

- Start with “draft and approve.”
- Add SMTP sending after review flow works.

### Acceptance Criteria

- Only approved emails are sent.
- Failed sends are logged.
- Sent emails are recorded as timeline events.
- Sender identity is clear.
- Default footer/signature is included.
- Opt-out text can be included for marketing-style messages.
- Send limits are configurable.

---

## 9.15 Recurring Tasks

### Requirement

The monthly check-in task can be repeated.

### MVP Approach

For safety, the scheduled task should prepare drafts, not auto-send.

Monthly flow:

1. Schedule triggers.
2. TinyOps refreshes client data.
3. TinyOps creates new drafts.
4. Owner receives notification.
5. Owner reviews and approves.
6. TinyOps sends approved emails.

### Acceptance Criteria

- User can set monthly recurrence.
- User can pause recurrence.
- Recurring task generates a review queue.
- Recurring task does not auto-send by default.
- Each run has a log.

---

# 10. Long-Term Product Requirements

## 10.1 Unified Client Timeline

Long-term, the timeline becomes the main product surface.

### Capabilities

- Search by email, name, phone, or tag.
- Filter timeline by source.
- Filter by event type.
- Filter by date.
- Show attachments or source links.
- Show AI summaries per event.
- Highlight important milestones.
- Show unresolved issues.
- Show progress over time.
- Show all outbound TinyOps actions.

### Future Enhancements

- Merge duplicate client identities.
- Link multiple email addresses to one client.
- Show household/couple/family relationships where appropriate.
- Add custom timeline event types.
- Add source-specific visual markers.
- Allow timeline export.

---

## 10.2 AI Client Memory Card

The memory card is the high-level view of the client.

### Long-Term Fields

```text
client_name
known_emails
known_phone_numbers
relationship_stage
first_seen_at
last_seen_at
last_contacted_at
source_coverage
summary
original_goal
current_goal
progress_state
engagement_level
satisfaction_level
important_preferences
course_history
purchase_history
feedback_history
open_questions
risks_or_concerns
suggested_next_action
safe_personalization
topics_to_avoid
do_not_contact_status
consent_status
```

### Memory Card Rules

- Must be grounded in source data.
- Must show freshness.
- Must distinguish facts from AI inference.
- Must not permanently store unverified guesses as facts.
- Must allow user edits.
- Must support “pinning” important information.
- Must support “forget this” or deletion.

---

## 10.3 Data Source Connector Platform

### Connector Types

#### Communication Sources

- IMAP.
- Gmail.
- Outlook.
- WhatsApp export.
- Telegram export.
- Slack.
- Discord.
- Support inboxes.

#### Form and Survey Sources

- Google Forms.
- Google Sheets.
- Typeform.
- Airtable.
- Tally.
- Jotform.

#### Business Sources

- Stripe.
- PayPal.
- Shopify.
- Gumroad.
- WooCommerce.

#### Course Sources

- Teachable.
- Kajabi.
- Thinkific.
- Podia.
- Circle.
- Mighty Networks.
- LearnWorlds.

#### Scheduling Sources

- Google Calendar.
- Calendly.
- Acuity.
- Zoom.

#### CRM and Marketing Sources

- HubSpot.
- Mailchimp.
- ConvertKit.
- ActiveCampaign.
- Customer.io.

### Connector Requirements

Each connector should support:

- Authentication.
- Initial import.
- Incremental sync.
- Error handling.
- Field mapping.
- Source event normalization.
- Sync status.
- Data deletion.
- Reprocessing.
- Rate limit handling.

---

## 10.4 Operations Recipes

TinyOps should not force users to build workflows from scratch. Instead, it should offer recipes.

### Recipe Examples

#### Client Care

- Monthly check-in.
- “Who needs attention?”
- Follow up with unanswered clients.
- Thank clients who gave positive feedback.
- Reach out to inactive participants.
- Send missed-session follow-up.

#### Course Operations

- Onboard new participants.
- Remind people to complete module 1.
- Follow up after course completion.
- Ask for testimonials.
- Invite successful students to advanced course.
- Generate progress summaries.

#### Revenue

- Re-engage past customers.
- Identify likely upsell candidates.
- Send renewal reminders.
- Follow up after abandoned purchase.
- Invite former clients to new workshop.

#### Admin

- Clean a CSV.
- Match a spreadsheet to existing clients.
- Find duplicate clients.
- Export segment.
- Summarize all feedback this month.
- Generate weekly operator report.

#### Sensitive Practice

- Prepare safe check-ins.
- Identify clients needing manual response.
- Block risky personalization.
- Create non-invasive follow-up drafts.
- Flag messages that should not be automated.

---

## 10.5 Natural-Language Task Interface

Long-term, the user should be able to type:

```text
Find everyone from the March course who has not submitted feedback,
check whether they emailed me before,
and draft a warm reminder that does not mention private details.
```

TinyOps should convert this into a structured, reviewable task.

### Requirements

The system should:

1. Understand the task.
2. Identify required data sources.
3. Ask for missing inputs only when necessary.
4. Generate an execution plan.
5. Show the plan before action.
6. Run read-only analysis.
7. Generate proposed actions.
8. Require approval for external actions.
9. Execute approved actions.
10. Log results.

### Important Constraint

TinyOps should not be a fully autonomous agent at first.

It should be:

> AI-planned, system-constrained, human-approved.

---

## 10.6 Dashboard and Reporting

### Dashboard Goals

Help the owner see the state of their client base.

### Possible Dashboard Widgets

- Total clients.
- Clients contacted this month.
- Clients needing follow-up.
- Inactive clients.
- Recent feedback.
- Unanswered emails.
- Course progress summary.
- Upcoming scheduled tasks.
- High-risk or sensitive items requiring manual review.
- Revenue opportunities.
- Recent imports/sync status.

### Weekly Digest

TinyOps can send the owner a weekly summary:

```markdown
This week:

- 12 clients interacted with you.
- 5 clients asked questions.
- 3 clients gave positive feedback.
- 8 course participants appear inactive.
- 4 people are good candidates for a check-in.
- 2 messages should be reviewed manually due to sensitive context.
```

---

## 10.7 AI Features

### 10.7.1 Summarization

Summarize:

- Client history.
- Email threads.
- Form submissions.
- Course feedback.
- Recent interactions.
- Unresolved questions.

### 10.7.2 Extraction

Extract:

- Original goal/problem.
- Current concern.
- Course/module mentioned.
- Feedback.
- Satisfaction.
- Objections.
- Requested resources.
- Next action.
- Preferred communication style.
- Risk/sensitivity level.

### 10.7.3 Classification

Classify:

- Message type.
- Client stage.
- Engagement level.
- Sentiment.
- Urgency.
- Personalization safety.
- Follow-up need.
- Marketing eligibility.
- Support issue status.

### 10.7.4 Drafting

Draft:

- Check-in emails.
- Reminder emails.
- Feedback requests.
- Personal replies.
- Course announcements.
- Follow-up sequences.
- Re-engagement messages.
- Summaries for the business owner.

### 10.7.5 Recommendation

Recommend:

- Who needs attention.
- Who should receive a generic message.
- Who should receive a personalized message.
- Who should not be contacted.
- Which clients may be ready for another product.
- Which clients have unresolved issues.

---

# 11. UX Requirements

## 11.1 Main Navigation

MVP navigation:

```text
Home
Clients
Tasks
Data Sources
Settings
```

Future navigation:

```text
Home
Clients
Segments
Tasks
Recipes
Insights
Data Sources
Settings
```

---

## 11.2 Home Screen

### MVP Home Screen

Show:

- Search bar: “Search client by email.”
- Recent clients.
- Data source sync status.
- Pending draft approvals.
- Last monthly check-in status.
- Quick action: “Upload client list.”
- Quick action: “Create monthly check-in.”

---

## 11.3 Client Search Experience

The search bar should be central.

Placeholder:

```text
Type a client email address...
```

Result card:

```markdown
Anna Smith
anna@example.com

Last interaction: 12 days ago
Sources: Email, Google Form, CSV
Status: Active
```

Empty state:

```markdown
No client found for this email.

You can:

- Create a manual profile
- Upload a CSV
- Connect another data source
```

---

## 11.4 Client Profile UX

The client page should answer the user’s questions quickly.

Recommended layout:

```text
------------------------------------------------
Client Header
------------------------------------------------
Name | Email | Tags | Status | Last interaction

------------------------------------------------
AI Memory Card
------------------------------------------------
Summary
Original goal
Progress
Feedback
Suggested next action
Safe personalization
Sensitive topics to avoid

------------------------------------------------
Timeline
------------------------------------------------
[Date] [Source] [Event type] [Summary]
[Date] [Source] [Event type] [Summary]
[Date] [Source] [Event type] [Summary]

------------------------------------------------
Actions
------------------------------------------------
Draft email | Add note | Mark do-not-contact | Refresh summary
```

---

## 11.5 Task Creation UX

The task creation screen should feel like a guided conversation, not a workflow builder.

Example:

```text
What do you want to do?

[ Send a monthly check-in ]
[ Ask for feedback ]
[ Follow up with inactive clients ]
[ Draft personal replies ]
[ Upload a list and decide what to do ]
```

For advanced users:

```text
Or describe a task:
"Send a warm check-in to everyone from my March course who has not replied recently."
```

---

## 11.6 Review Before Send UX

For every outbound task, TinyOps should show a review queue.

Each row:

```markdown
Client: Anna Smith
Context: Prior email about course recordings
Risk: Low
Personalization: "Hope the replay library has been helpful."
Draft: [Preview]

Actions:
Approve | Edit | Regenerate | Generic | Skip
```

High-risk row:

```markdown
Client: Maria
Context: Sensitive form response detected
Risk: High
Recommendation: Use generic email or review manually
Actions:
Generic | Edit manually | Skip
```

---

# 12. Data Model

## 12.1 Workspace

```text
workspace_id
business_name
owner_user_id
business_type
sensitive_mode_enabled
created_at
updated_at
```

## 12.2 User

```text
user_id
workspace_id
email
name
role
created_at
last_login_at
```

## 12.3 Client

```text
client_id
workspace_id
primary_email
name
status
tags
created_at
updated_at
first_seen_at
last_seen_at
last_contacted_at
do_not_contact
unsubscribe_status
consent_status
sensitivity_level
```

## 12.4 Client Identity

```text
identity_id
client_id
identity_type
identity_value
verified
created_at
```

Examples:

- email.
- phone.
- external CRM ID.
- Stripe customer ID.
- course platform user ID.

MVP only needs email.

## 12.5 Data Source

```text
source_id
workspace_id
source_type
display_name
connection_status
last_sync_at
sync_cursor
config
created_at
updated_at
```

## 12.6 Raw Source Record

```text
raw_record_id
workspace_id
source_id
external_id
record_type
raw_payload
content_hash
ingested_at
processed_at
processing_status
```

## 12.7 Timeline Event

```text
event_id
workspace_id
client_id
source_id
raw_record_id
event_type
event_date
title
summary
body_text
metadata
sensitivity_level
created_at
updated_at
```

## 12.8 AI Memory Card

```text
memory_card_id
client_id
summary
original_goal
current_progress
feedback_summary
open_questions
recommended_next_action
safe_personalization
topics_to_avoid
confidence_score
source_event_ids
generated_at
edited_by_user
```

## 12.9 Task

```text
task_id
workspace_id
task_type
name
status
input_segment
instructions
schedule
created_by
created_at
updated_at
```

## 12.10 Task Run

```text
task_run_id
task_id
workspace_id
status
started_at
completed_at
summary
error_log
```

## 12.11 Draft Message

```text
draft_id
task_run_id
client_id
recipient_email
subject
body
personalization_used
risk_level
status
approved_by
approved_at
sent_at
send_error
```

---

# 13. AI Safety and Quality Requirements

## 13.1 Grounding

AI outputs should be based only on available client data and user-provided instructions.

Requirements:

- Do not invent client facts.
- Use uncertainty language when data is incomplete.
- Store which events informed each summary.
- Allow user to view source context.
- Separate factual fields from inferred fields.

Example:

Bad:

```text
Anna is improving her relationship.
```

Better:

```text
Anna appears engaged with the course based on two recent emails about completing exercises. There is not enough data to assess personal progress.
```

---

## 13.2 Sensitive Personalization Guardrails

Outbound personalization should follow this ladder:

| Level | Description         | Example                                                    | Default Use      |
| ----- | ------------------- | ---------------------------------------------------------- | ---------------- |
| 0     | Generic             | “Hope you’re doing well.”                                  | Always allowed   |
| 1     | Business context    | “Since you joined the March course…”                       | Allowed          |
| 2     | Interaction context | “Hope the replay access worked smoothly.”                  | Usually allowed  |
| 3     | Sensitive context   | “Following up on what you shared about your relationship…” | Avoid by default |
| 4     | Intimate detail     | Specific sexual, medical, or emotional details             | Block            |

MVP default:

- Use levels 0–2.
- Avoid levels 3–4.
- Require manual review for level 3.
- Block level 4 from AI-generated outbound copy.

---

## 13.3 Human Approval

External actions include:

- Sending email.
- Updating external CRM.
- Exporting sensitive data.
- Creating tasks for another person.
- Sending bulk messages.

MVP policy:

- All outbound emails require human approval.
- Bulk approval is allowed only for low-risk drafts.
- High-risk drafts require individual review.

---

## 13.4 Audit Trail

TinyOps should record:

- Data imported.
- AI summaries generated.
- Drafts generated.
- Drafts edited.
- Emails approved.
- Emails sent.
- Emails skipped.
- Sensitivity overrides.
- Deleted records.

This matters especially for trust.

---

# 14. Privacy, Security, and Trust Requirements

TinyOps will handle sensitive client data. Privacy must be a core product feature, not a later add-on.

## 14.1 Privacy Principles

- Collect only necessary data.
- Make data sources visible.
- Allow data deletion.
- Avoid using sensitive details in outbound messages.
- Do not train public models on customer data.
- Prefer summaries and metadata where possible.
- Give the owner control over what is stored.
- Make sync status transparent.
- Make AI reasoning source-grounded.

## 14.2 Security Requirements

MVP:

- Encrypted credentials.
- Encrypted database storage where practical.
- HTTPS only.
- Workspace-level tenant isolation.
- Secure secret management.
- Ability to disconnect data source.
- Ability to delete imported data.
- Access logs for sensitive actions.

Future:

- Role-based access control.
- Field-level permissions.
- Owner-only sensitive events.
- Data retention policies.
- Export tools.
- SSO for larger clients.
- Self-hosted or private deployment option.
- Dedicated sensitive-data processing mode.

## 14.3 Compliance Note

TinyOps should be designed with legal/privacy review before being sold broadly in sensitive verticals such as therapy, sexual wellness, health, fertility, or coaching. Requirements will vary by jurisdiction and customer type.

The product should not claim to be compliant with any specific regulation until reviewed and implemented accordingly.

---

# 15. Non-Goals

## MVP Non-Goals

The MVP should not include:

- Full CRM replacement.
- Native mobile app.
- Large app marketplace.
- Complex workflow builder.
- Direct WhatsApp integration.
- Full payment platform sync.
- Full course platform sync.
- Multi-user roles.
- Automatic AI sending without approval.
- Advanced analytics.
- AI chatbot for clients.
- Real-time two-way sync with every data source.

## Long-Term Non-Goals

TinyOps should avoid becoming:

- A generic Zapier clone.
- A heavy enterprise CRM.
- A spam personalization engine.
- A medical record system.
- A replacement for professional judgment.
- A fully autonomous agent that acts without clear user approval.

---

# 16. Success Metrics

## 16.1 MVP Success Metrics

For your wife’s MVP:

- Time to find full client context drops from minutes to seconds.
- At least 90% of clients in a CSV are matched or clearly marked unmatched.
- Monthly check-in preparation time drops significantly.
- Generated emails require minimal edits for low-risk clients.
- No sensitive/private details are accidentally included in outbound emails.
- User trusts the dashboard enough to use it weekly.
- User trusts the campaign workflow enough to use it monthly.

## 16.2 Product Metrics

### Activation

- Data source connected.
- First CSV uploaded.
- First client profile viewed.
- First AI summary generated.
- First task completed.

### Engagement

- Client searches per week.
- Client profiles viewed.
- Tasks created.
- Drafts generated.
- Drafts approved.
- Recurring tasks active.

### Quality

- Draft edit rate.
- Draft approval rate.
- Regeneration rate.
- Summary correction rate.
- Sensitivity false positive/negative reports.
- Search success rate.

### Retention

- Weekly active users.
- Monthly recurring task usage.
- Number of connected data sources.
- Number of clients with updated memory cards.
- Repeat campaign usage.

### Business

- Free-to-paid conversion.
- Setup package conversion.
- Monthly churn.
- Revenue per workspace.
- Support burden per workspace.

---

# 17. Roadmap

## Phase 0 — Wife-Specific MVP

Goal:

Build a working tool for one real business.

Scope:

- Account login.
- IMAP connection.
- CSV upload.
- Google Forms CSV import.
- Client search by email.
- Client timeline.
- AI client summary.
- Monthly check-in draft generation.
- Review before send.
- Optional SMTP sending.
- Task run log.

Primary success:

Your wife can use TinyOps instead of manually searching email and writing monthly check-ins.

---

## Phase 1 — Private Beta for Similar Businesses

Goal:

Validate repeated use cases across 5–10 similar entrepreneurs.

Add:

- Better onboarding.
- Saved segments.
- Manual notes.
- Google Sheets connector.
- Draft review improvements.
- More task recipes:
  - feedback request;
  - inactive client follow-up;
  - course completion email;
  - reactivation email.

- Better data import tools.
- Better error handling.

Primary success:

Users outside your wife’s business complete useful tasks without custom code.

---

## Phase 2 — Client Memory Platform

Goal:

Make TinyOps valuable even without email campaigns.

Add:

- Richer client profiles.
- Better search.
- Timeline filters.
- Multiple source support.
- Editable AI memory cards.
- Duplicate detection.
- Merge clients.
- Weekly client digest.
- “Needs attention” dashboard.
- More robust sensitivity controls.

Primary success:

Users open TinyOps to understand clients, not only to send emails.

---

## Phase 3 — Recipe-Based Operations

Goal:

Turn repeated tasks into reusable recipes.

Add:

- Recipe library.
- Natural-language task creation.
- Recurring task schedules.
- Task templates by business type.
- Owner approval workflows.
- Performance reports.
- Safer bulk operations.
- More outbound channels.

Primary success:

Users run multiple recurring client operations from TinyOps.

---

## Phase 4 — Verticalized SaaS

Goal:

Package TinyOps for specific markets.

Possible verticals:

- Course creators.
- Coaches.
- Relationship educators.
- Wellness professionals.
- Consultants.
- Tutors.

Add:

- Vertical-specific onboarding.
- Vertical-specific data fields.
- Vertical-specific recipes.
- Vertical-specific safety defaults.
- Done-for-you setup packages.
- Template marketplace.

Primary success:

TinyOps has repeatable sales messaging and onboarding for a defined customer segment.

---

## Phase 5 — AI Client Ops Platform

Goal:

TinyOps becomes an extensible operating layer for small businesses.

Add:

- App marketplace/connectors.
- Advanced permissions.
- API.
- Custom fields.
- Custom event types.
- Advanced automations.
- Partner/consultant setup portal.
- White-label options.
- Private deployment for sensitive businesses.

Primary success:

TinyOps can be personalized for each client while still relying on a common platform.

---

# 18. MVP Detailed User Flows

## 18.1 First-Time Setup Flow

```text
User creates account
→ Enters business name and sender identity
→ Enables sensitive-business mode
→ Connects IMAP mailbox
→ Uploads first CSV or Google Forms export
→ TinyOps imports data
→ TinyOps shows import summary
→ User searches for a known client email
→ User sees timeline and AI summary
```

Success state:

```text
"I can finally see everything about this client in one place."
```

---

## 18.2 Client Lookup Flow

```text
User opens TinyOps
→ Types email address
→ Opens client profile
→ Sees AI memory card
→ Reviews timeline
→ Opens source event if needed
→ Drafts a personal note or adds manual note
```

Success state:

```text
"I know who this person is, what they needed, and what happened before."
```

---

## 18.3 Monthly Check-In Flow

```text
User opens Tasks
→ Selects Monthly Check-In
→ Selects uploaded participant CSV
→ Chooses tone and goal
→ TinyOps matches participants to existing profiles
→ TinyOps summarizes prior context
→ TinyOps drafts one email per client
→ User reviews draft table
→ User approves low-risk drafts
→ User edits or skips high-risk drafts
→ TinyOps sends approved messages
→ Sent messages are added to timelines
→ User schedules next monthly run
```

Success state:

```text
"I sent thoughtful monthly emails to 100+ clients without manually reading every thread."
```

---

# 19. Example AI Prompt Behavior

## 19.1 Client Summary Instruction

System behavior:

```text
You are summarizing client history for the business owner.
Use only provided source events.
Separate facts from inferences.
Do not diagnose the client.
Do not include unnecessary intimate details.
Identify original goal, progress, feedback, and recommended next action.
If data is insufficient, say so.
```

---

## 19.2 Email Draft Instruction

System behavior:

```text
Draft a warm monthly check-in email from the business owner to the client.
Use light personalization only.
Do not mention intimate, sexual, medical, traumatic, or embarrassing details.
If prior context is sensitive, use generic supportive wording.
If no prior context exists, use the generic template.
Keep the email concise and natural.
```

---

## 19.3 Safe Personalization Examples

Allowed:

```text
Hope the course materials have been useful so far.
```

Allowed:

```text
I hope you were able to access the replay library smoothly.
```

Usually allowed:

```text
I remember you joined the March cohort, so I wanted to check in and see how things are going.
```

Avoid:

```text
I remember you shared that you were struggling with intimacy after conflict.
```

Block:

```text
Any explicit reference to sexual history, trauma, medical details, or private relationship disclosures.
```

---

# 20. Competitive Direction and Strategic Correction

Your instinct is mostly right:

> TinyOps can become a general AI-based CRM/data platform personalized for each client.

But the wording matters.

A “general AI data platform” is hard to sell to small entrepreneurs because it sounds abstract. They do not wake up wanting a data platform. They wake up wanting to complete annoying tasks:

- “Find everything about this client.”
- “Send follow-ups.”
- “Ask for feedback.”
- “Check who is inactive.”
- “Prepare monthly emails.”
- “Tell me who needs attention.”

So the better strategy is:

## Internally

Build TinyOps as a flexible data platform:

```text
Connectors → Event ingestion → Identity resolution → Timeline → AI memory → Task recipes
```

## Externally

Sell TinyOps as a practical client-ops assistant:

```text
See every client’s history in one place.
Get AI summaries.
Send safe personalized follow-ups.
Never lose track of people again.
```

This gives you the best of both worlds:

- Flexible enough to personalize for each client.
- Concrete enough for customers to understand.
- Narrow enough to build an MVP.
- Broad enough to become a platform.

---

# 21. Key Product Risks

## 21.1 Risk: Too Horizontal Too Early

Trying to support every data source and every task will slow development.

Mitigation:

- Start with IMAP, CSV, and Google Forms export.
- Build around one specific user.
- Add connectors only after repeated demand.

---

## 21.2 Risk: AI Personalization Feels Creepy

Clients may feel uncomfortable if private context appears in emails.

Mitigation:

- Safe personalization levels.
- Sensitive-business mode.
- Human review.
- Generic fallback.
- Do-not-use topics.
- No explicit intimate details in outbound messages.

---

## 21.3 Risk: Bad Data Matching

Email address matching may miss clients who use multiple emails.

Mitigation:

- MVP uses email as primary key.
- Later add identity merge.
- Show unmatched records clearly.
- Allow manual linking.

---

## 21.4 Risk: Privacy and Trust

The product handles sensitive personal data.

Mitigation:

- Minimize stored data.
- Encrypt credentials.
- Avoid unnecessary raw data exposure.
- Provide deletion/export.
- Do not train models on customer data.
- Add audit logs.
- Get legal/privacy review before selling broadly in sensitive markets.

---

## 21.5 Risk: Users Want Outcomes, Not Software

Some entrepreneurs may not want to configure anything.

Mitigation:

- Offer done-for-you setup.
- Provide templates.
- Build vertical recipes.
- Keep setup simple.
- Use onboarding calls early to learn patterns.

---

# 22. Recommended MVP Build Order

## Step 1: Data Foundation

Build:

- Workspace.
- User account.
- Client table.
- Timeline event table.
- Data source table.
- CSV importer.
- IMAP importer.

Goal:

Data can be imported and grouped by email.

---

## Step 2: Client Timeline

Build:

- Search by email.
- Client profile page.
- Timeline view.
- Event details.
- Basic manual notes.

Goal:

Your wife can type an email and see all related interactions.

---

## Step 3: AI Memory Card

Build:

- Email/form summarization.
- Original problem extraction.
- Feedback extraction.
- Progress summary.
- Safe personalization snippet.
- Sensitivity flag.

Goal:

The timeline becomes useful without reading every event manually.

---

## Step 4: Monthly Check-In Drafts

Build:

- Upload/select list.
- Match clients.
- Generate draft per client.
- Generic fallback.
- Risk classification.
- Review grid.

Goal:

Your wife can prepare monthly emails quickly.

---

## Step 5: Sending and Logging

Build:

- Approval workflow.
- SMTP send or draft export.
- Send log.
- Add sent email to timeline.
- Schedule monthly recurrence.

Goal:

TinyOps completes the whole task safely.

---

# 23. MVP Acceptance Test

The MVP should pass this test:

```markdown
Given:

- A connected mailbox with historical client emails
- A CSV of 100 participants
- A Google Forms export with intake/feedback responses

When:

- The owner searches for a participant by email

Then:

- TinyOps shows a unified timeline of emails, forms, imports, and sent messages
- TinyOps shows an AI summary with original goal, progress, feedback, and next action

When:

- The owner creates a monthly check-in task for the CSV

Then:

- TinyOps matches participants to client profiles
- TinyOps generates safe email drafts
- TinyOps uses generic emails where no history exists
- TinyOps avoids sensitive personalization
- TinyOps requires approval before sending
- TinyOps sends/logs approved emails
- TinyOps schedules the next monthly draft run
```

---

# 24. Final Product Definition

TinyOps is not just an email tool.

TinyOps is not just a CRM.

TinyOps is not just an automation builder.

TinyOps is:

> **A private AI memory and operations layer for tiny businesses that manage clients across scattered tools.**

The first lovable use case is:

> “Type an email address and see everything about that client.”

The first revenue-generating workflow is:

> “Upload a client list and send safe, personalized monthly check-ins.”

The long-term platform is:

> “Connect all client data, understand every relationship, and execute recurring client operations with human approval.”
