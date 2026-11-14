# T005 — D1 (iOS Safari 17+) and D2 (Android Chrome, mid-range): NOT RUN

**Decision:** Murphy, 2026-11-14: "skip for both phones". There is no cable or adapter to connect either phone to the Mac.
**Alternatives offered and declined:** Android wireless debugging (`adb pair` over Wi-Fi, no cable); Safari network Web Inspector for the iPhone; Murphy's own USB-C cable; a cloud real-device service.
**Evidence:** none: no screenshots, no console logs, no device model or OS version.
**Consequence:** RFC §4.2: a cell without its evidence is unproven. AC4 requires iOS Safari 17+ and Android Chrome on a mid-range device, so **AC4 = NOT MET**, escalated to Murphy (RFC §11 R7). Desktop cells D3, D4, D5 passed M1–M7.
**To close later:** run `site-checks.mjs --part devices --cell D2` after `adb forward` (cable or wireless pairing), and the D4 procedure through the Mac's Web Inspector for the iPhone.
