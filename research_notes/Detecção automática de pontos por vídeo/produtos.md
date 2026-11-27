# Commercial products that auto-detect scoring events and attribute them to players (court sports, as of Nov 2026)

Research date: 2026-11-26. Most sources are vendor pages or competitor comparison blogs. I found almost no independent accuracy audits. Vendor pages that compare against rivals are flagged as such.

## 1. Which products auto-detect points/baskets/goals AND attribute them to individual players? What is truly AI vs human-tagged?

### Takeaway
Only a few products claim fully automatic scoring detection plus per-player attribution from ordinary video. In basketball these are SportsVisio, League Lens and Highlight Factory. In volleyball they are Hudl Balltime AI, SmashVision and VolleyStation. All of them attribute players by reading **jersey numbers** (or by assigning players to a roster), and all of them say errors occur and offer correction or human review. The big brands are a mix. Hudl Assist is still mostly human analysts (AI only for volleyball). Veo, Pixellot and Trace automate camera work, highlights and goal or event detection, and some read shirt numbers for per-player reels, but the official box score still usually comes from a human scorer.

### Cited Findings

**Hudl Assist / Balltime AI (volleyball) / Hudl Focus / Hudl IQ**
- Hudl Assist uses "a combination of professional human analysts and, in some sports, advanced AI". For most sports (football, basketball, soccer, lacrosse, hockey, baseball, softball, wrestling), trained analysts tag plays manually. AI is used currently in volleyball only. — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- Hudl says the AI (Balltime) version uses computer vision to track players and ball contacts, but "may occasionally miss minor details due to players blocking the view". Users can correct the data themselves or request an expert analyst to refine it. — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- For Assist, video must be recorded from the endline. It was available only for club volleyball teams, with a waitlist. Recording can be done with Hudl Focus or a connected capture device. — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- When submitting to Assist, users enter jersey colors, which athletes played and the final score. The system then builds a playlist per roster player. — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- Hudl's volleyball page lists AI breakdowns by level: club gets match and practice breakdowns; college gets practice breakdowns (matches via Volleymetrics or Assist); high school breakdowns are "coming in 2026". — [Hudl volleyball Assist page, via search summary](https://www.hudl.com/products/assist/volleyball)
- Balltime product page: "Just upload your video and let our AI do the rest". It accepts "game film from a tournament, an iPhone clip or a practice session", says "No special setup required", and claims its AI tags each touch and player. It gives no method for player identification and no accuracy figure. It is sold as individual subscriptions with a free trial, and the standalone iOS app is free with in-app purchases. — [Hudl Balltime page](https://www.hudl.com/products/balltime); [App Store](https://apps.apple.com/us/app/balltime-ai/id6450258692)
- Hudl IQ is described as "Advanced American football analytics for collegiate programs". It is not relevant to court sports. — [Hudl Assist FAQ (navigation)](https://www.hudl.com/products/assist/faq)
- Hudl basketball (human Assist): if the analyst cannot break down a game because of poor quality, Hudl returns it, and "Turnaround time will no longer be guaranteed". — [Hudl Support: basketball recording workflow](https://support.hudl.com/s/article/basketball-required-recording-workflow-hudl-v3?language=en_US&topic=Record_and_Upload_Video)
- A competitor (Highlight Factory) describes Hudl Assist basketball as human analysts charting the game "typically overnight". — [Highlight Factory comparison, Aug 2026 (competitor)](https://highlightfactory.app/blog/basketball-tracking-apps-compared)

**SportsVisio (basketball; volleyball listed in site navigation)**
- SportsVisio sells automatic AI box scores from uploaded phone video. Its functionality "revolves around the ability... to detect jersey numbers in videos and attribute various sports actions to the players wearing them" (Sportico, 2023, $3M seed round). — [Sportico 2023](https://www.sportico.com/business/tech/2023/sportsvisio-ai-sports-filming-fundraising-1234734494/)
- Vendor technical guide (2026):
  - Any modern phone works; tripod, full-court view with both rims, 1080p or higher, good light, jersey contrast and continuous recording are recommended.
  - The pipeline detects, tracks, segments events and then validates them against basketball rules.
  - Identity recovery uses "jersey numbers, team color, height, and motion patterns".
  - Delivery is within 24 hours, mostly overnight.
  - There is no human review step in the pipeline; manual oversight is "still useful" for edge cases and disputes. — [SportsVisio technical guide](https://www.sportsvisio.com/stories/how-ai-basketball-analysis-works)
- A rec league (Peg City, Canada) uses the SportsVisio-powered app as the official record of player stats. It tells players to review their profiles "especially if jerseys were changed or shared", which is a practical sign of misattribution. — [Peg City Basketball stats page, via search summary](https://pegcityball.ca/content/statistics)

**League Lens (basketball)**
- League Lens claims it reads jersey numbers from any phone video, even in motion, and "attributes every play to the correct player". This is a vendor claim with no figures found. — [League Lens](https://www.leaguelens.io/)

**Highlight Factory (basketball)**
- Automatic, on-device AI on iPhone (iOS only); free to start. The player-attribution method is not stated. This is the vendor's own comparison. — [Highlight Factory, Aug 2026](https://highlightfactory.app/blog/basketball-tracking-apps-compared)

**SmashVision and VolleyStation (volleyball)**
- SmashVision (vendor blog, Aug 2026):
  - AI detects actions and rotation positions, and reports show player numbers.
  - Input is a phone or camera behind the court plus internet.
  - It admits "Automated detection is not perfect", so the output is editable.
  - Live actions appear within seconds; uploads take about 2–3 hours.
  - Prices: Free tier at €20 per upload or €40 per live game; Pro at €3,000 per season (150 credits). — [SmashVision blog, 31 Aug 2026](https://smashvision.ai/blog/best-volleyball-stats-apps)
- VolleyStation AI claims it "recognises all 12 players on both sides of the net" from phone video. This is company-only; no figures or price were found (as quoted by SmashVision, a competitor). — [SmashVision blog](https://smashvision.ai/blog/best-volleyball-stats-apps)

**Veo (soccer-centric; basketball page exists; futsal not documented)**
- Veo's AI detects goals, shots, corners and free kicks after upload. Events can be filtered by type, team or player. — [Veo Match Report article](https://www.veo.com/en-us/article/football-match-analysis-software)
- Player Spotlight / Player Moments use AI to read shirt numbers and build per-player reels. Veo support says numbers 1–50 work best, 51–75 slightly worse, and 76–99 worst. Player Moments are tied to Analytics 2; for Analytics-only users they apply only to recordings from 18 Aug 2026 onward. — [Veo Support: Player Moments (page returned 403 to fetch; content per search summary)](https://support.veo.com/hc/en-us/articles/27698176364817-Overview-of-Veo-Player-Moments-How-to-track-and-follow-players-in-your-Veo-recordings)
- Trace (a competitor) says that with Veo, coaches link players to jersey numbers and tag and save highlights manually. This conflicts with Veo's own "AI reads shirt numbers" claim; it probably reflects which tier is bought. — [Trace vs Veo, updated 18 Nov 2026 (competitor)](https://traceup.com/compare/trace-vs-veo)

**Trace (soccer, basketball, football; volleyball "coming soon")**
- Trace claims highlights are "Automatic for every player. No tagging", with goal alerts during games. The identification method is not disclosed and human review is not mentioned. It needs the proprietary TraceCam on a 16 ft tripod. — [Trace vs Veo](https://traceup.com/compare/trace-vs-veo)

**Pixellot (Air NXT, Show/Prime; SportsEngine Play; HoopsTV)**
- Air NXT is a portable camera with 2x 4K wide-angle lenses, under 2 kg, a 6-hour battery, and placement at the halfway line. It auto-produces, auto-highlights and streams without an operator. Its page does not mention scoring detection or explain player identification. — [Pixellot Air NXT](https://pixellot.tv/products/pixellot-air/)
- Pixellot marketing:
  - "automated tagging means you don't need a squad of volunteers to tag the game... (including a live scoreboard!)".
  - "every player gets a highlight reel including shots, assists, rebounds".
  - The same material also says coaches can manually tag every shot, assist, steal and turnover, with free VidSwap shot charts. This is a mixed AI/manual model. — [Pixellot "coach smarter not harder"](https://you.pixellot.tv/coach-smarter-not-harder/)
- A Pixellot executive (about 2 years ago) said optical recognition lets the system track players by their numbers. — [Videoguys](https://videoguys.com/blogs/news-and-sales/pixellot-s-ai-powered-sports-production)
- HoopsTV (Basketball Australia, a Pixellot deployment) identifies players by jersey number, colour and team data linked to their Basketball Australia ID, and does not use facial recognition. — [HoopsTV](https://www.pixellot.tv/basketballaustralia/)
- The Israeli Basketball Association deal (2020) took its stats from FIBA LiveStats, a human-operated scoring app, so Pixellot did not produce the official box score. — [SVG 2020](https://www.sportsvideo.org/2020/09/14/pixellot-signs-deal-with-israeli-basketball-association-for-automated-production/)
- The SportsEngine Play + Pixellot partnership automates condensed games and player-specific highlight reels, "extract[ing] data directly from the video feed rather than relying on manual roster entry". — [YSBR](https://youthsportsbusinessreport.com/sportsengine-play-and-pixellot-expand-ai-partnership-to-automate-youth-sports-highlight-reels/)
- Air NXT is listed in FIBA's approved Automated Video Solutions. This is a software/venue approval, not an accuracy certification. — [FIBA approved software](https://about.fiba.basketball/en/services/equipment-and-venue/106-approved-basketball-software/118-automated-video-solutions-avs)
- Pixellot claims its AI was trained on more than 5M games. This is an unverified vendor claim. — [Pixellot, via search summary](https://www.pixellot.tv/?p=33318)

**Spiideo, Reely, WSC Sports**
- Spiideo launched "AI Highlights" inside Spiideo Play (automated production) in May 2026. AutoFollow does player-specific tracking. No scoring or jersey attribution detail was found. — [SVG, May 2026](https://www.sportsvideo.org/2026/05/07/spiideo-launches-ai-highlights-for-automated-highlight-and-clip-creation/)
- Reely's models reportedly use audio excitement, sentiment, trajectory mapping, player tracking and goal post detection across many sports. It targets broadcasters and leagues. — [Front Office Sports, 2026](https://frontofficesports.com/reely-instant-highlights-ai/)
- WSC Sports serves professional leagues (NBA, NHL) and broadcasters. It clips from broadcast feeds plus official data feeds; it does not target amateurs. — [CB Insights / Dealroom (via search)](https://www.cbinsights.com/company/reely/alternatives-competitors)

**ShotTracker (sensor-based, not video)**
- Sensors in the rafters, a sensor ball and shoe sensors on each player. Helix claims 2–4 cm accuracy. Installation costs about $45,000, and it is used at 60+ NCAA schools (FOS, 2026). Player attribution comes from wearables, not video. — [ShotTracker Helix](https://shottracker.com/helix/); [Front Office Sports](https://frontofficesports.com/?p=46641)

**HomeCourt (basketball, single phone, solo/small-group training)**
- At its 2018 launch the company claimed shot tracking was "99 percent accurate" (unverified). It needs only one iOS device. It works best with clearly drawn court lines and a standard 10 ft hoop. It is meant for training, not 5v5 game attribution. — [VentureBeat 2018](https://venturebeat.com/ai/homecourt-helps-basketball-players-improve-their-game-with-ai); [HomeCourt recording conditions](https://www.homecourt.ai/in-app/gettingstarted)

**XbotGo (AI phone gimbal)**
- Its basketball "AI Analysis" has Precision and Speed modes and places green markers at detected moments, which users adjust before export. It is a highlight detector; no jersey or scorer attribution was found. — [XbotGo AI editing how-to](https://xbotgo.com/blogs/how-tos/how-to-use-ai-editing-in-the-xbotgo-app)
- An independent review (Goosed.ie) says it keeps the action mostly in frame, is impressive in bright daylight and weaker in low light. It does not address scoring accuracy. — [Goosed.ie review](https://goosed.ie/uncategorized-en/xbotgo-ai-sports-gimbal-review-a-veo-alternative-for-the-rest-of-us)

**Brazilian products**
- Qlance: replay system for arenas (society, futsal, volleyball, basketball and 20+ sports). A player taps a button and the system "identifica o momento certo", then cuts and edits the clip. Qlance supplies the cameras. The site does not say "AI", does not claim to identify the scorer, and lists no price. — [Qlance](https://qlance.com.br/)
- Foco No Lance: automatic replay with cameras installed at the court. It claims to identify the best moments automatically (society, futevôlei). — [Foco No Lance](https://foconolance.com.br/)
- Replay Sports and Vibeplay: recording is triggered by a physical button at the court side. — [Replay Sports](https://www.replaysports.com.br/en); [Vibeplay](https://play.google.com/store/apps/details?id=com.vibeplay.videos&hl=pt)
- z2play: users pick arena, day and time to watch, download or share their game video. — [z2play](https://www.z2play.com.br/)
- Gravae (Bahia, Neymar-backed): smart cameras with computer vision in courts and arenas, more than 800 clients, projected R$9.5M revenue in 2026. Focus is footvolley and court sports clips; no scorer attribution was reported. — [Exame](https://exame.com/negocios/com-neymar-e-ia-startup-baiana-vai-faturar-r-95-milhoes-filmando-quadras-esportivas/)
- Filma Eu (MG): AI recording and analysis for beach tennis, planned to expand to football and basketball (news about 14 months old). — [WebtvParacatu](https://webtvparacatu.com.br/startup-brasileira-lanca-tecnologia-com-inteligencia-artificial-para-analise-esportiva-em-tempo-real/)
- "Futebol Society" app (App Store BR): manual logging of individual stats (goals, assists); video is "Em breve". — [App Store](https://apps.apple.com/br/app/futebol-society/id6743960382)

### Inferences
- The Brazilian arena-replay market is mature: Qlance, Foco No Lance, Gravae, Replay Sports, Vibeplay, z2play. It solves capturing clips, mostly by button press or "best moment" detection, but **none was found to attribute a goal or point to a named player**. That is the user's system's core value, so it is not directly displaced.
- Every product that attributes players uses jersey numbers (or roster plus team colour). This fits badly with "babas" and pickup games without numbered shirts. None of the reviewed products advertises face or appearance re-identification for unnumbered players; HoopsTV explicitly excludes facial recognition.
- Everyone builds in correction: Hudl's "expert analyst to refine", SmashVision's editable output, XbotGo's adjustable markers, SportsVisio's "manual review for disputes". This suggests video AI is positioned today as a **first draft or check**, not a replacement for the scorekeeper.
- Handball and futsal are poorly served. They appear in Pixellot's and Qlance's sport lists, but no specific scoring or attribution feature was found for them.

### Gaps
- Genius Sports (Second Spectrum), Hawk-Eye, Synergy/Keemotion, PlaySight, Once Sport, Track160, SoloShot: not verified in this session. My background knowledge is that these are pro or semi-pro systems or multi-camera installations, and Keemotion/Synergy combine automated capture with human-logged stats, but I did not confirm this with 2026 sources.
- Mycujoo successors in Brazil, Hypevideo, Sportsee: no results found.
- Balltime's player-identification method (jersey OCR vs user assignment) is not disclosed on Hudl pages.
- Veo's support page was blocked (403); the shirt-number accuracy bands come from a search summary of that page.

## 2. Do any work from a single phone/GoPro (not proprietary cameras)? Which work in amateur conditions?

### Takeaway
Yes. SportsVisio, League Lens, Highlight Factory, Balltime AI, SmashVision and VolleyStation accept ordinary phone video uploads, and HomeCourt works from one phone for training. Veo, Trace, Pixellot, Spiideo, ShotTracker and the Brazilian arena systems need proprietary or installed hardware. XbotGo is a phone on a motorised gimbal. All the phone-based tools ask for a fixed, elevated full-court view, good light and visible numbers.

### Cited Findings
- SportsVisio: "any modern smartphone or tablet". Recommends a tripod, a full-court view including both rims and the key, 1080p or higher, good gym lighting, clear jersey contrast and continuous recording from before tipoff. — [SportsVisio guide](https://www.sportsvisio.com/stories/how-ai-basketball-analysis-works)
- SportsVisio's accuracy claims hold "when jersey numbers are visible and recording is continuous". — [SportsVisio Basketball AI](https://www.sportsvisio.com/stories/basketball-ai)
- Balltime: phone clips accepted with "No special setup required". However, the Assist version requires recording from the endline. — [Hudl Balltime](https://www.hudl.com/products/balltime); [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- SmashVision: a phone or camera placed behind the court, plus internet. — [SmashVision](https://smashvision.ai/blog/best-volleyball-stats-apps)
- League Lens claims "any phone video". — [League Lens](https://www.leaguelens.io/)
- HomeCourt: single iOS device; works best with clear court lines and a 10 ft hoop. — [HomeCourt](https://www.homecourt.ai/in-app/gettingstarted)
- Proprietary hardware:
  - Veo Cam 3 costs $1,299, with a tripod from $299. — [Trace vs Veo (competitor)](https://traceup.com/compare/trace-vs-veo)
  - TraceCam is included in the subscription. — [Trace vs Veo](https://traceup.com/compare/trace-vs-veo)
  - Pixellot Air NXT is a dual-4K camera. — [Pixellot](https://pixellot.tv/products/pixellot-air/)
  - ShotTracker requires a venue sensor installation. — [ShotTracker](https://shottracker.com/helix/)
- Brazilian arena systems install their own cameras; for Qlance, "equipment, maintenance and support" are provided by Qlance. — [Qlance](https://qlance.com.br/)

### Inferences
- The user's setup (1–2 fixed phones or GoPros, then a PC) matches what SportsVisio, SmashVision and Balltime expect: a fixed, high, full-court view. GoPro fisheye or wide lenses and low gym light could hurt jersey OCR. GoPro is not mentioned explicitly by any vendor.
- None of the phone-based tools was found to run locally on a Windows PC. They are cloud upload services (SportsVisio within 24 hours, SmashVision 2–3 hours) or iOS on-device apps.

### Gaps
- No vendor publishes requirements for multi-camera fusion from consumer phones. No evidence was found of a GoPro-specific workflow.
- No information was found on performance on outdoor or poorly lit Brazilian courts, or with mixed or unnumbered shirts.

## 3. Reported accuracy figures and known failure modes

### Takeaway
Vendors claim about 95% event detection and about 90–92% player attribution for basketball from phone video (SportsVisio), and 99% shot tracking for solo training (HomeCourt, 2018). **No independent benchmark was found for any product.** The failure modes that recur are occlusion, ball out of view, identity switches after scrambles, poorly read or shared jerseys, high jersey numbers, and low light.

### Cited Findings
- SportsVisio vendor claims:
  - 95%+ detection of made and missed shots, 90%+ for rebounds and steals, 92%+ player attribution "even when jersey numbers are partially obscured".
  - Aggregates (points, FG%) are more reliable than individual play-by-play.
  - Another SportsVisio page gives "90%+" attribution, so the figures are inconsistent across its own pages. — [SportsVisio guide](https://www.sportsvisio.com/stories/how-ai-basketball-analysis-works); [SportsVisio Basketball AI](https://www.sportsvisio.com/stories/basketball-ai)
- SportsVisio's named failure modes:
  - occlusion and a hidden ball;
  - probabilistic possession;
  - identity tracking ("where most systems break down");
  - edge cases such as overturned calls and clock disputes. — [SportsVisio guide](https://www.sportsvisio.com/stories/how-ai-basketball-analysis-works)
- A 2025 App Store reviewer said SportsVisio was slow, did not allow editing roster names, and that they get information faster watching the film themselves. — [App Store SportsVisio, via search summary](https://apps.apple.com/us/app/sportsvisio/id1611231433)
- Balltime: Hudl admits it "may occasionally miss minor details due to players blocking the view". — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- A college coach told Volleyball Magazine the stats are not fully trustworthy yet, so she checks the video herself (article from 2023). — [Volleyballmag 2023](https://volleyballmag.com/ai-and-volleyball-072723/)
- An academic paper used Balltime-powered Hudl Assist data and manually checked 10% of videos. The ">98% event detection" figure it cites comes from a different study (Zhao et al.), not a Balltime validation. — [Journal for Sports Neuroscience](https://nsuworks.nova.edu/cgi/viewcontent.cgi?article=1050&context=neurosports)
- Balltime app reviews are mixed; one reviewer called it a "headache". — [JustUseApp reviews](https://justuseapp.com/en/app/6450258692/balltime-ai/reviews)
- SmashVision: "Automated detection is not perfect". No product in that comparison publishes a numeric accuracy rate. — [SmashVision](https://smashvision.ai/blog/best-volleyball-stats-apps)
- Veo: shirt-number reading degrades for numbers 51–99. — [Veo Support (via search summary)](https://support.veo.com/hc/en-us/articles/27698176364817-Overview-of-Veo-Player-Moments-How-to-track-and-follow-players-in-your-Veo-recordings)
- Pixellot says it feeds back cases where "we made the wrong identification, a wrong event detection or we missed something". This implicitly acknowledges errors; no rate is given. — [Pixellot, via search summary](https://www.pixellot.tv/?p=33318)
- HomeCourt: 99% claimed (2018). A user reported spoken shot counts were "off every 10 or so shots". — [VentureBeat](https://venturebeat.com/ai/homecourt-helps-basketball-players-improve-their-game-with-ai); [App Store, via search summary](https://apps.apple.com/us/app/homecourt-basketball-training/id1258520424)
- XbotGo works well in bright daylight and is weaker in low light. — [Goosed.ie](https://goosed.ie/uncategorized-en/xbotgo-ai-sports-gimbal-review-a-veo-alternative-for-the-rest-of-us)

### Inferences
- Even if the 92% attribution claim is true, a 100-point game would have about 8 points credited to the wrong player. That is not acceptable for an official score sheet without review, but is useful as a cross-check against the scorekeeper's log, for example by flagging discrepancies.
- Team-level scoring (that a point happened, and which side) is likelier to be reliable than "who scored". Vendors themselves say aggregates beat play-by-play.

### Gaps
- No Reddit or forum threads with quantified error rates were retrieved this session. r/volleyball, r/basketballcoach and r/bootroom were not reached within the tool budget.
- No independent tests of Veo, Trace or Pixellot goal-detection accuracy were found.

## 4. Prices for small/amateur users

### Takeaway
Phone-upload AI services cost roughly $30–40 or €20–40 per game, or $150–190 per month. Proprietary-camera ecosystems cost about $300 a year (Trace family plan) up to $1,000–1,700 a year plus a $1,300 camera (Veo). ShotTracker installations cost about $45k. Hudl Assist and Balltime pricing is quote-based. Brazilian arena-replay systems do not publish prices.

### Cited Findings
- SportsVisio: Pro $149/month and Elite $189/month (5 games each); Coach $750 per season (20 games); about $30–38 per extra game (prices as of Aug 2026, per a competitor). — [Highlight Factory comparison](https://highlightfactory.app/blog/basketball-tracking-apps-compared)
- Hudl club basketball: Bronze $400, Silver $1,000, Gold $1,600 per team per year, with Assist as a per-game add-on. — [Highlight Factory](https://highlightfactory.app/blog/basketball-tracking-apps-compared); see also [HoopBrief pricing 2026](https://hoopbrief.com/blog/how-much-does-hudl-cost-2026)
- Hudl Assist: price depends on sport, level and scouting option; no figures on the FAQ. — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- SmashVision: €20 per upload or €40 per live game; Pro €3,000 per season. — [SmashVision](https://smashvision.ai/blog/best-volleyball-stats-apps)
- Veo:
  - Cam 3 costs $1,299.
  - Annual plans: Starter $999, Team $1,399, Club $1,699. Monthly plans: $149, $215, $255.
  - Analytics 2 (which includes player reels) costs from $799 a year.
  - Prices are per Trace, a competitor, verified 17 Nov 2026. — [Trace vs Veo](https://traceup.com/compare/trace-vs-veo)
- Trace: $300 a year for a family or $35/month, camera included. — [Trace vs Veo](https://traceup.com/compare/trace-vs-veo)
- HomeCourt: about $6/month or $60/year. — [Highlight Factory](https://highlightfactory.app/blog/basketball-tracking-apps-compared)
- ShotTracker: about $45,000 installation. — [Front Office Sports](https://frontofficesports.com/?p=46641)
- Pixellot Air NXT: no public price; "Order Now" and "Schedule a Demo" only. — [Pixellot](https://pixellot.tv/products/pixellot-air/)

### Inferences
- For a small Brazilian amateur operation, per-game cloud fees of about $30–40 (roughly R$150–200 at late-2026 rates; the exchange rate was not checked) would quickly exceed the cost of a volunteer scorekeeper. That reinforces the idea of video as a check rather than a replacement.

### Gaps
- No prices were found for Balltime individual subscriptions, League Lens, VolleyStation, Qlance, Foco No Lance or Gravae.
- No BRL pricing was found for any of the global products.
