## 2. The 15-second protocol (AC1) — frozen at G1

At Gate 1 this section is copied **verbatim** to `.specify/features/m1-validation/protocol.md`. Its SHA-256 is recorded in §11 (the G1 record). From then on, a Stage 3 guard fails if `protocol.md` changes. **No participant sees the site before G1.**

### 2.1 Setup (Murphy, before each session)

1. **Device:** Murphy's own phone, the same phone for all five sessions (§10 Q5). Reduce Motion **off**, Data Saver / Low Data Mode **off**, the OS theme as it is (recorded on the sheet).
2. **URL:** the test URL fixed at G1 (§10 Q1), opened in a **fresh private tab** (no stored theme, no cache).
3. Wait until the hero animation is running (the model is moving). Scroll to the very top. Do not touch the page after that.
4. Have a stopwatch ready and the sheet (§2.5) open on a separate device or on paper.
5. Choose a quiet place. The participant has not seen the site before (§2.6).

### 2.2 Script (read aloud, word for word)

**Instruction, English:**

> "I'm going to show you a website on this phone for 15 seconds. Look at it however you like. When the time is up, I'll take the phone back and ask you three short questions."

**Instruction, Bahasa Indonesia** (only if the participant prefers it):

> "Saya akan menunjukkan sebuah situs web di ponsel ini selama 15 detik. Silakan lihat sesukamu. Setelah waktunya habis, saya akan mengambil ponselnya kembali dan mengajukan tiga pertanyaan singkat."

Then hand over the phone and start the stopwatch the moment it is in their hand, screen facing them. At **15 s**, say "Time's up" ("Waktunya habis") and take the phone back.

**Allowed during the 15 s:** silence. If the participant asks anything ("Can I scroll?", "Whose site is this?"), the only answer is: **"Do whatever you like."** ("Terserah kamu.") No pointing, no hints, no reactions.

**The three questions**, asked immediately after, in this order, each read exactly once:

| # | English (verbatim, from AC1) | Bahasa Indonesia |
|---|---|---|
| (a) | "What does this person do?" | "Apa pekerjaan orang ini?" |
| (b) | "Name one project you saw." | "Sebutkan satu proyek yang kamu lihat." |
| (c) | "How would you contact them?" | "Bagaimana cara kamu menghubungi orang ini?" |

**Allowed after a question:** repeat it word for word once, if asked. Nothing else: no rephrasing, no "think about the top part", no follow-ups, no confirming or correcting an answer. "I don't know" is a final answer. The phone is not handed back.

### 2.3 Recording answers verbatim

- Murphy writes each answer **word for word** as spoken, in the language spoken, including hesitations that carry content ("uh, something with apps? Android maybe"). Do not tidy, translate or summarise.
- Optional audio recording, only with the participant's consent. It is used for transcription only and is never committed or sent to the agent. The transcript is what counts.
- Murphy also writes neutral observations of what the participant did during the 15 s: scrolled (yes/no, roughly how far), tapped anything (what), and anything they said aloud.
- Murphy sends the raw sheets to the agent as typed text (or a photo of the paper). The agent copies them **unchanged** into `evidence/P<n>-sheet.md`. Fixing typos is not allowed. Unreadable handwriting is marked `[illegible]`, and Murphy is asked about it.

### 2.4 Scoring rules (binary, no partial credit)

The orchestrator scores each answer against the rules below. Each score quotes the rule that decided it (e.g. "a-C1"). Murphy reviews the scores. A score changes only if the written rule supports the change; new rules are never added after results exist. **Ambiguous → INCORRECT** (conservative), with the reason noted.

**(a) What does this person do?**
- **a-C1 CORRECT:** the answer says the person builds, develops or engineers software **and** names Android or mobile apps. Examples: "Android developer", "he makes mobile apps", "Android engineer, performance stuff", "programmer, Android".
- **a-I1 INCORRECT:** a generic software role without Android or mobile ("software engineer", "developer", "IT").
- **a-I2 INCORRECT:** a different job ("web designer", "3D artist", "architect", "engineer who designs machines").
- **a-I3 INCORRECT:** "I don't know", or no answer.

**(b) Name one project you saw.**
- **b-C1 CORRECT:** the answer names the project. It contains "Scarlet", "Inspector" or "WebSocket", in any case and with minor misspellings ("Scarlett", "web socket", "inspektor").
- **b-C2 CORRECT:** it describes that project unambiguously without its name ("a tool that records WebSocket traffic", "an inspector for network frames on Android").
- **b-I1 INCORRECT:** it names a component, layer, technology or section only ("Room", "Compose", "Frames in", "Projects").
- **b-I2 INCORRECT:** it describes the animation in general ("some 3D model", "a blueprint thing").
- **b-I3 INCORRECT:** "I don't know", or no answer.

**(c) How would you contact them?**
- **c-C1 CORRECT:** the answer names a channel the site offers: email (or the address), LinkedIn or GitHub.
- **c-C2 CORRECT:** it names the site's own contact path ("the Contact link at the top", "there's a contact section").
- **c-I1 INCORRECT:** a channel the site does not offer (phone, WhatsApp, Instagram, a contact form).
- **c-I2 INCORRECT:** a generic guess with no basis on the site ("Google him", "find him somewhere online").
- **c-I3 INCORRECT:** "I don't know", or no answer.

### 2.5 Pass line and sheet

**Pass line (verbatim from AC1):** **≥ 4 of 5 correct on all three.** Computed as: count CORRECT for (a), for (b) and for (c) separately over P1–P5. AC1 is MET only if all three counts are ≥ 4. Any count ≤ 3 → **AC1 NOT MET**. This is a failed MVP gate, recorded as such.

**Sheet** (`evidence/P<n>-sheet.md`, one per participant; template at G1 as `protocol-sheet-template.md`):

```
Participant: P<n>            Group: recruiter/hiring-adjacent | developer | non-technical
Date / local time: ____      Session valid: yes | no (reason: ____)
Device: model ____  OS ____  Browser ____ (version ____)
Theme seen: light | dark     Hero state seen: live animation | poster
Test URL: ____               Deploy commit (short SHA): ____
Language used: EN | ID
Exposure time (stopwatch): ____ s   (valid range 14–16 s)
Has seen the site before: no (must be no)   Knows Murphy personally: yes | no
Observed during 15 s: scrolled ____  tapped ____  said aloud "____"
(a) What does this person do?    Verbatim: "____"
(b) Name one project you saw.    Verbatim: "____"
(c) How would you contact them?  Verbatim: "____"
--- scored by orchestrator ---
(a) CORRECT | INCORRECT  rule: ____  note: ____
(b) CORRECT | INCORRECT  rule: ____  note: ____
(c) CORRECT | INCORRECT  rule: ____  note: ____
Murphy review: agree | flag (rule-based reason: ____)
```

### 2.6 Participants and validity

- **Mix (brief):** 2 recruiters / hiring-adjacent, 2 developers, 1 non-technical. **Default:** Murphy recruits; the slice supplies the script, the sheet and the scoring. Labels are P1–P5 in session order. The name ↔ label mapping stays with Murphy (vault or paper) and is never sent to the agent or committed. No names, ages, employers or contact details on any sheet.
- **Eligibility:** has never seen the site (any version) and did not help build it. Knowing Murphy is allowed but recorded (§10 Q8).
- **Invalid session (procedural reasons only, decided before answers are scored):** exposure outside 14–16 s; the page was not live at the top when handed over; Murphy gave guidance beyond §2.2; the participant had seen the site before; an interruption during the 15 s. An invalid session is **kept on file** with its reason and replaced by a new participant from the same group. A session is never invalidated because of its answers.
- **Each participant takes the test once.** Nobody is re-tested. AC1 is not re-run after results exist. If a later defect fix changes `/`, AC1 still stands as measured, with its deploy SHA recorded.
