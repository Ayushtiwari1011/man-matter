# Man Matters — Mosaic Wellness Part 2

Independent, consumer-facing assignment prototype by Ayush Tiwari.

Live app: https://part-2-mosaic-wellness-ayush-tiwari.leverage-growth-daily.chatgpt.site

## Run the website

Unzip the project and open a terminal in its folder. Choose one option:

```sh
# Optional Java launcher — requires Java 17 or later
java StaticServer.java
# Visit http://127.0.0.1:8080
```

```sh
# Alternative — requires Python 3
python3 -m http.server 8080 --directory dist
# Visit http://localhost:8080
```

An editor's Live Server extension can also serve `dist/index.html`.
Use a local HTTP server rather than double-clicking the HTML file, so both pages share browser storage consistently.
No npm installation, framework, database, credentials or build step is required to run the app.

## Source files

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Storefront document and script/style loading |
| `dist/store.css` | Storefront styles and typography |
| `dist/catalog.js` | Fictional product catalog, assessment questions and 15 UX fixes |
| `dist/store.js` | Product pages, search, assessment, cart, offers, reviews and orders |
| `dist/journey.css` | Branded landing page, tour, checkout and guided care styles |
| `dist/journey.js` | Fifth-click invitation, spotlight tour, OTP checkout and care handoff |
| `dist/care.html` | MY CARE document |
| `dist/care.css` | Dashboard, calendar, progress, dialogs and WhatsApp phone styles |
| `dist/care.js` | Care state, calendar, reminders, progress, consultation and preferences |
| `dist/care-journey.js` | Personalised continuous Day 1 → Day 15 → Day 30 conversation |
| `dist/assets/` | Reference branding and product imagery |
| `StaticServer.java` | Optional Java server for local viewing; not application business logic |
| `tests/journey.test.cjs` | Isolated state-transition regression checks, runnable with Node |

Java and JavaScript are different languages. The interactive browser code is JavaScript (`.js`). The included Java (`.java`) file is an optional local server; it does not send WhatsApp messages or replace the browser code.

## Try the requested journey

1. Explore the storefront. The fifth click on an interactive store element opens the MY CARE invitation. `Try MY CARE` opens it immediately. `Restart tour` resets the invitation counter.
2. Choose the direct journey, or take the 11-step spotlight tour covering all 15 fixes. Both finish with one Hair Gummies pack in the cart.
3. Select BUY NOW. Use a fictional first name and the supplied demo number `9999999999`.
4. Enter OTP **123456**. Any other six-digit code is rejected. Enter a fictional address and six-digit PINCODE.
5. BUY NOW simulates payment, confirmation and delivery. A failed-payment option keeps the cart intact.
6. Set up MY CARE: start date, reminder time in IST, goal and optional WhatsApp consent.
7. Start the process, open the phone notification and reply Yes, Taking right now, Remind me in 15 minutes or No. Replies update the website. Taking right now requires a separate confirmation before being marked completed.
8. After a completed or skipped Day 1 response, the conversation advances to Day 15. Share a message, optional photo, consultation request or visit the website. After that response, it advances to Day 30.
9. Complete Day 30 and scroll the full conversation. The Day 1 / 15 / 30 buttons also let a reviewer explore milestones directly.
10. Open Calendar, Progress, Care team, Settings and My orders to inspect the resulting state. Reloading preserves the care history in that browser.

Intermediate replies are labelled **Illustrative demo history**. A 15-day milestone is not labelled a 15-day completed streak when the user skipped days. Progress messages and photos do not automatically confirm consumption.

## Website fixes retained

The Website fixes page maps the original audit identifiers to clickable demonstrations: assessment navigation and saved answers; medicine review gate; current copyright year; filters and sorting; consolidated pack options; fresh search results; beard-oil relevance; empty-cart recovery; relevant recommendations; quantity limits; explicit coupon eligibility; optional photo step; complete assessment choices; consistent Stage 1 messaging; and reviews limited to matching delivered purchases. The tour groups related fixes into 11 stops.

Batch-report lookup, missing-item support and health-concern reporting are also available as supporting flows. Customer review allegations are not presented as verified medical facts.

## Prototype boundaries

- This is an independent assignment, not the official Man Matters website or a live medical service.
- OTP, payment, delivery, WhatsApp, appointments and verification are local simulations. No messages, payments or appointments are sent to real services.
- The spotlight tour is implemented locally in a Pendo-style interaction; no Pendo SDK is integrated.
- No LLM API is connected. Reply interpretation uses deterministic demo rules, with original text retained.
- Contact and address fields use session storage. Care records, the fictional first name, sample photos and orders use local storage. Use fictional details only. There is no cross-device or multi-user backend.
- Browser-side purchase/review checks demonstrate the UX. A production service would enforce identity, order ownership and review eligibility on its server.
- The routine and 60-day calendar are illustrative. Product directions would need verified label/clinician data in production. The prototype does not diagnose conditions or promise results.
- WhatsApp integration would require a provider, customer opt-in, approved messaging flows, secure server webhooks and storage. Four choices are represented here for the demo; production interactive-message formatting must be adapted to the chosen provider's supported controls.
- Reference logo and imagery remain the property of their respective owners and are included for this assignment. Primary product imagery is local. MiSans Latin font files are requested from the brand's public CDN; system sans-serif fallbacks are defined.

## Assignment explanation

I built a Man Matters-inspired shopping and care prototype that addresses confusing purchase information and disconnected follow-up. A tour makes the website fixes easy to inspect. After a simulated gummies purchase, the customer sets a reminder time and replies in a WhatsApp-style chat. Those replies immediately update MY CARE, with Day 15 and Day 30 progress check-ins, optional photos and consultation booking. The prototype keeps assessment messaging consistent and restricts product reviews to matching delivered demo orders. All customer details and transactions are fictional.

This explanation reflects the prototype and supplied UX observations; it does not claim customer interviews or measured business outcomes that were not provided.

## Validation

```sh
node tests/journey.test.cjs
java StaticServer.java --check
```

Browser checks cover the fifth-click popup, the spotlight tour, OTP validation, checkout, delivery, saved name/time, four reminder options, 15-minute follow-up, skipped-day sync, Day 15 photo sync, Day 30 consultation and retained 30-day chat after reload. Unit checks cover accurate intake state and milestone transitions. WhatsApp production connectivity is intentionally not tested because it is not integrated.
