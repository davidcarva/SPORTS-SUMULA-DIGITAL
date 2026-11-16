# Patents, Prior Art and Open-Source Tools: Scoresheet-Synchronized Video Highlights and QR/Clock Camera Sync

> **NOT LEGAL ADVICE.** These notes are desk research from public patent databases and websites (as of Nov 2026). Patent scope is set by the **claims as granted** and by prosecution history, which I did not fully review. Google Patents labels its "legal status" and "expiration" fields as assumptions, not legal conclusions. A Brazilian patent attorney (agente da propriedade industrial) must read the claims and run a proper INPI/Espacenet search before anyone relies on these notes.

## Q1. Which patents/applications claim generating video clips from scorekeeping/stat-event timestamps? (assignees, dates, status, jurisdictions, Brazil)

### Takeaway
At least two active US patent families claim close to the core concept: **Scorebreak LLC** (US10923157B2 / US11636880B2, priority 2015: event data feed + video + clock-offset calculation + clips with lead/lag times) and **CSR Lab LLC** (US11776265B2, priority 2020: time-coded charting + trigger list + automatic clip cutting + highlight compilation). Many other filings cover parts of the idea (Amazon, Pixellot, an individual inventor Sufuentes, GameChanger's scorekeeping patents). None of the families I checked lists a BR, WO or EP member, so they appear to be **US-only**. I could not query INPI directly, so this is a gap to close.

### Cited Findings

**A. Closest matches (event log + clock offset/time codes → clips)**

- **US10923157B2 / US11636880B2 / US20170018290A1 / US20210134329A1: "System and method for event data collection and video alignment"**. Assignee **Scorebreak LLC**. Inventors Jordan Hendry and Michael Hendry. Priority **2015-07-17** (provisional 62/193,948). Parent filed 2016-07-15. Divisional US 17/145,099 filed 2021-01-08 and granted as US11636880B2 on 2023-04-25. Google lists it as Active, with adjusted expiration 2036-09-25. Only US family members are listed (no WO/EP/BR). — [Google Patents US20210134329A1](https://patents.google.com/patent/US20210134329A1/en)
  - Independent claim 9 (system): a GUI showing "a progressively refined set of possible actions and outcomes based on the event's current state"; storage of an event data feed and video files; **calculation and storage of an offset time between the system clocks of the devices that recorded the data feed and the video**; display of clips of the correlated actions. Claim 1 (method): retrieve the event's data feed, find the video files, and compute the playback start and duration. Dependent claims cover lead/lag times (claims 6 and 8) and alignment "manually or by trusted timestamp" (claim 10). — [Google Patents US20210134329A1](https://patents.google.com/patent/US20210134329A1/en)
  - Disclosed sync methods: camera file-creation metadata, server timestamps on live streams, internet-connected clocks, and manual alignment (the user scrubs to a known action and selects it in the list). Clip start = action time − offset − lead; end = action time − offset + lag. **The patent does not mention QR codes or a clock shown on screen.** — [Google Patents US20210134329A1](https://patents.google.com/patent/US20210134329A1/en)
  - USPTO PDF of US11636880 — [USPTO](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11636880)
  - Patents citing it include WO2017218341A1 (Axon Enterprise, "Systems and methods for aligning event data") and US12067780B2 (Samsung, video event segmentation from simultaneously recorded sensor data). It cites US8228372B2 (Agile Sports, i.e. Hudl, digital video editing) and US20150381926A1 (Sport Scope, synchronous capture). — [Google Patents US20210134329A1](https://patents.google.com/patent/US20210134329A1/en)

- **US11776265B2 / US20210232826A1: "Highlight Video Creation"**. Assignee **CSR Lab, LLC**. Inventors C. M. Clark, S. E. Johnson and R. J. Corsi. Priority **2020-01-23**, filed 2021-01-22, granted 2023-10-03. Active, estimated expiry 2041-10-09. Only US family members are listed. — [Google Patents US20210232826A1](https://patents.google.com/patent/US20210232826A1/en)
  - Independent claims 1, 7 and 14 (system, method and CRM) require: an interface for **charting an event with time-coded records** and building trigger lists of actions; a camera capturing time-coded video; upload to a server; building an action log; matching entries to triggers; collecting time codes; **cutting clips**; and compiling a highlight video. Dependent claims add a play-by-play web page, intros and transitions. Claim 13 requires that charting be done by watching the video. — [Google Patents US20210232826A1](https://patents.google.com/patent/US20210232826A1/en)
  - **Per-player highlights are described but not claimed.** The description mentions season reels per player. The example clip default is about 10 s, a few seconds before the event and the rest after. The description focuses on baseball pitch charting. — [Google Patents US20210232826A1](https://patents.google.com/patent/US20210232826A1/en)

- **US10887673B2 / US20180098134A1: "Method and system for associating recorded videos with highlight and event tags to facilitate replay services"**. Assignee listed as "Individual" (inventors Joaquin Sufuentes and Franck Tankoua Kwimi). Priority **2016-10-04**, also claiming **European application No. 17162331.7** and US provisional 62/404,156. Granted 2021-01-05, Active, expiry about 2037-10-03. — [Google Patents US10887673B2](https://patents.google.com/patent/US10887673B2/en); [USPTO PDF](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10887673)
  - The description covers a camera recording video stored with a time reference and event ID, a **mobile device generating timestamped highlight markers**, synchronization of video and markers to a common time reference, selection of the highlight section, and stitching of sections. I did not read the claims. — [Google Patents US10887673B2](https://patents.google.com/patent/US10887673B2/en)

**B. Partial overlaps / broader highlight patents**

- **US20120189273A1: "Method and system for generating highlights from scored data streams"**. For each data point that crosses a threshold, it clips video starting 5 s before for 20 s. Assignee and status not verified. — [Google Patents](https://patents.google.com/patent/US20120189273)
- **US8929721B2: "Methods for identification of highlight game events and automated generation of videos for same"**. Tagged game events are logged to a timeline, and a highlight video is generated when the game ends. Assignee and status not verified. — [Google Patents](https://patents.google.com/patent/US8929721B2/en)
- **US20160225410A1: "Action camera content management system"**. Selects video windows that start before and end after each event time to build a highlight clip. Assignee not verified. — [Google Patents](https://patents.google.com/patent/US20160225410A1/en)
- **US9764217B2: "Interactive scorekeeping and animation generation"**. A scorekeeper app turns plays into event data records, used for animation rather than video clips. — [Google Patents](https://patents.google.com/patent/US9764217B2/en)
- **US11386152B1: "Automatic generation of highlight clips for events"**. Assignee **Amazon Technologies**. Priority 2018-12-13, granted 2022-07-12, expiry about 2041-01-05. It correlates structured data (scores, player statistics) with the stream by comparing timestamps, and a model outputs clip start and end. Its focus is ML on unstructured data; I did not read the claims. — [Google Patents US11386152B1](https://patents.google.com/patent/US11386152B1)
- **US11769327B2** (Baidu, per search summary; not verified): "Automatically and precisely generating highlight videos with artificial intelligence". Uses approximate event timestamps and a time mapping to produce candidate clips, which can be combined per team or player. Granted 2023-09-26. — [Justia US11769327](https://patents.justia.com/patent/11769327)
- **US10433030B2 / CN107148781B: "Generating a customized highlight sequence depicting multiple events"**. Player- or team-focused highlight sequences built from video, audio and play-by-play stats, using event data to produce time-code lists. Assignee not verified. — [Google Patents US10433030B2](https://patents.google.com/patent/US10433030B2/en); [CN107148781B](https://patents.google.com/patent/CN107148781B/en); [US20160105733A1](https://patents.google.com/patent/US20160105733)
- **US7988560B1: "Providing highlights of players from a fantasy sports team"**. Per-player clips extracted using closed-caption content. — [Google Patents](https://patents.google.com/patent/US7988560B1/en)
- **US11830241B2: "Auto-curation and personalization of sports highlights"**. OCR on on-screen graphics to extract player name and statistics. — [Google Patents](https://patents.google.com/patent/US11830241B2/en)
- **US12056928**: a trained OCR model reads the game clock in frames, and play-by-play text is aligned to video segments. — [USPTO PDF 12056928](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12056928)
- **US12223720: "Generating highlight video from video and text inputs"**. — [USPTO PDF 12223720](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12223720)

**C. Company-specific filings**

- **GameChanger (DICK'S)**: The company's own pages cite **US 8,731,458** and **US 9,393,485**. — [gc.com live streaming](https://gc.com/app-features/live-streaming); [gc.com hockey](https://gc.com/hockey)
  - **US8731458B2, "Transmission and retrieval of real-time scorekeeping"**. Inventor Edward M. Sullivan, assigned to **Gamechanger Media Inc.** (assignment recorded 2015-08-27). Priority **2008-06-02**, granted 2014-05-20, maintenance fees paid through year 12, adjusted expiry **2030-03-11**. Family members: US20100048187A1 and CIP US9393485B2 (filed 2014-05-19). **US only.** Independent claims 1 and 11 cover a *baseball* system: a mobile app takes user-entered stats, uploads them to a remote DB and shares them in real time, with a GUI baseball field for hit location and an outcome menu. Dependent claims 4 and 15 add uploading video/photo data. **There is no explicit timestamp or clip-cutting language.** — [Google Patents US8731458B2](https://patents.google.com/patent/US8731458B2/en)
  - GameChanger's product makes **automatic clips when a game is both streamed and scored**, including for basketball. The product shows this is commercially practiced, but I did not find a GameChanger patent claiming it. — [GameChanger auto clips basketball](https://gc.com/post/automatic-video-clips-for-basketball); [Automatic Video Clips FAQ](https://help.gc.com/hc/en-us/articles/21334712734733-Automatic-Video-Clips-FAQs); [Automatic hit clips](https://gc.com/post/automatic-hit-clips)
- **Hudl / Agile Sports Technologies**: A 2021 analysis says three Agile patents are geared to Hudl and that Agile had been patent-dormant since mid-2018. — [PatentForecast 2021](https://www.patentforecast.com/2021/03/04/hudl-introduces-a-new-sports-analytics-product-without-patents-what-is-its-strategy/). **US8228372B2** (Agile Sports, digital video editing) is cited as prior art by Scorebreak. — [Google Patents US20210134329A1](https://patents.google.com/patent/US20210134329A1/en). Hudl's product docs describe clicking a stat to view the associated video, auto-sync across angles and "Auto-Markup". — [Hudl sole-source doc](https://hudl-content.s3.amazonaws.com/billing/agile-sports-hudl-sole-source.pdf)
- **WO2015081303A1: "Automated video tagging with aggregated performance metrics"**. Uses sensor telemetry to tag events on the video timeline. — [Google Patents](https://patents.google.com/patent/WO2015081303A1/en)
- **Pixellot**: **EP3473016A2** (Pixellot Ltd, filed 2017) and **CN109691124B**, "Method and system for automatically generating video highlights". Inputs include crowd tags, scoreboard video and game-clock video, and tags carry game time. — [EP3473016A2](https://patents.google.com/patent/EP3473016A2/de); [CN109691124B](https://patents.google.com/patent/CN109691124B/en). Pixellot's app lets users create highlights by adding tags. — [Pixellot App Store](https://apps.apple.com/us/app/pixellot/id1094242485)
- **PlaySight / Veo**: Both ship live tag → auto-clip features (PlaySight "TagMe"; Veo auto-clips goals and the Veo Go app supports live tagging). My searches found no matching patent from either company. — [PlaySight](https://playsight.com/); [Veo comparison](https://www.veo.com/article/sports-video-camera-systems-compared)

### Inferences
- The Scorebreak claims (offset between scoring-device clock and video clock, then clips using lead/lag around each scored action) read closest on the startup's concept. The CSR Lab claims (time-coded charting → triggers → cut clips → highlight compilation) are second closest. Both are US patents valid until roughly 2036 and 2041. A US launch would need a serious FTO opinion on these two.
- No Brazilian (BR) family members appeared for Scorebreak, CSR Lab, GameChanger or Sufuentes. Patents are territorial, so a US-only patent generally cannot be enforced against activity carried out only in Brazil. Exporting to or serving US users could change that. Pixellot has EP/CN filings, so it is worth checking whether Pixellot or others have BR national-phase filings.
- Brazil's industrial property law (Lei 9.279/1996, art. 10) excludes computer programs "per se" and abstract methods from patentability. This generally makes pure-software methods harder to patent in Brazil, but I did not verify this against a primary source in this session; see Gaps.
- Google's "Active" status needs confirmation in USPTO Patent Center (maintenance fees, terminal disclaimers). The Scorebreak 2015 parent will need its 7.5-year fee paid, for example.

### Gaps
- **INPI (busca.inpi.gov.br)**: I did not query it directly, because it requires an interactive session. Recommended queries: IPC H04N 21/8549, G11B 27/031 and A63B 71/06; keywords "destaques", "súmula", "placar", "vídeo", "marcação de tempo", "QR code sincronização"; and the applicant names Pixellot, Hudl/Agile, GameChanger, Stats Perform, Genius Sports, Amazon and Veo.
- I did not search **Stats Perform, Genius Sports, Synergy Sports or Second Spectrum** portfolios specifically. They likely hold optical-tracking and data-to-video patents (Stats Perform, for example, has many filings), but I did not verify any.
- I did not read the full claims of US10887673B2, US11386152B1, US20120189273A1, US8929721B2 or US9393485B2 (CIP), and I did not verify assignees or status for several of the partial-overlap patents.
- Whether the EP counterpart of Sufuentes (EP 17162331.7) was granted is unknown.
- I did not verify current legal status in USPTO Patent Center or EPO Register.

## Q2. Prior art: academic work on aligning play-by-play logs with video, and on QR-code / visual-clock synchronization of recordings

### Takeaway
Aligning play-by-play logs to broadcast video is established academic practice: OCR of the game clock and score overlay, mapped to play-by-play entries, has been published since at least 2016. Filming a QR code that encodes wall-clock time to sync cameras is both patented (Amazon US9984354B1, priority 2014; and the older US20070189333A1) and shipped commercially (Catapult Thunder, Dartfish, Tentacle/GoPro). The same goes for open research datasets (Ego-Exo4D). QR/clock sync is therefore clearly **not novel**.

### Cited Findings
**Play-by-play ↔ video alignment**
- "Leveraging Contextual Cues for Generating Basketball Highlights" (2016) reads home/visitor score, period and game clock from the broadcast overlay via OCR, then matches them to each play-by-play stat, mapping stats to video. — [arXiv 1606.08955](https://arxiv.org/pdf/1606.08955)
- SoccerNet (2018) fits a linear game-time → video-time mapping (slope 1) with RANSAC to handle OCR errors. — [arXiv 1804.04527](https://arxiv.org/pdf/1804.04527)
- "Distantly Supervised Semantic Text Detection and Recognition for Broadcast Sports Videos Understanding" (2021) covers NBA clock reading for play-by-play alignment and notes that OCR errors cause misalignment. — [arXiv 2111.00629](https://arxiv.org/pdf/2111.00629)
- "A Simple and Effective Temporal Grounding Pipeline for Basketball Broadcast Footage" (2024) uses a custom text detector plus off-the-shelf OCR for clock-based temporal grounding. — [arXiv 2411.00862](https://arxiv.org/pdf/2411.00862)
- Patent analogue: US12056928 claims OCR clock reading plus play-by-play alignment. — [USPTO 12056928](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12056928)

**QR / displayed-clock synchronization**
- **US9984354B1, "Camera time synchronization system"** (Amazon Technologies). Priority/filing 2014-09-30, granted 2018-05-29, Active, expiry about 2034-09-30. Optical timestamps (time encoded as a machine-readable code such as a QR code) are shown in a camera's field of view and decoded from the captured images to sync the cameras. I did not read the claims. — [Google Patents US9984354B1](https://patents.google.com/patent/US9984354B1/en); [USPTO PDF](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9984354)
- **US20070189333A1, "Time synchronization of digital media"**. A camera photographs a screen displaying a reference time, and the offset to the device clock is reconstructed from the media. This is old prior art, from a 2007 publication. — [Google Patents](https://patents.google.com/patent/US20070189333)
- US7200320B1 "Time code slate system and method" (the film-slate analogue); US10951700B2 (timecode display on a personal device); US20170332131A1 "Video stream synchronization". — [US7200320B1](https://patents.google.com/patent/US7200320B1/en); [US10951700B2](https://patents.google.com/patent/US10951700B2/en); [US20170332131A1](https://patents.google.com/patent/US20170332131A1/en)
- **Catapult Thunder** (sports video): users film a QR code from a mobile device before filming on each camera, and the software computes a per-camera offset. The QR clip should be at least 3 s long. — [Catapult Thunder QRC Time Sync](https://thunder.catapultsports.com/hc/en-us/articles/360000532196-Thunder-QRC-Time-Sync)
- **Dartfish** films a QR code shown in a mobile app to sync video with sensor data (record about 5 s). — [Dartfish support](https://support.dartfish.tv/en/support/solutions/articles/27000070670-synchronize-video-and-data-with-a-qr-code)
- **Tentacle Timebar app + GoPro HERO 12/13**: an app-generated QR code sets the GoPro's internal timecode. Latency can be offset, and drift depends on the GoPro clock. — [Tentacle support](https://support.tentaclesync.com/hc/en-us/articles/14434205852957-Tentacle-Timebar-App-QR-code-GoPro-12-13)
- **QSynch (DIY/open)**: an app shows the current UTC timestamp as a QR code to each camera before and after a session, which also corrects drift. — [eduardkieser.github.io](https://eduardkieser.github.io/tag/camera.html)
- **Ego-Exo4D** (2023) plays a QR-code video encoding wall-clock time on a smartphone to sync multiple cameras. — [arXiv 2311.18259](https://arxiv.org/pdf/2311.18259)
- **RocSync** (2025) cites GoPro's dynamic QR code as a known clock-sync method (GoPro reports under 50 ms) and notes drift after 60–90 min. — [arXiv 2511.14948](https://arxiv.org/pdf/2511.14948)

### Inferences
- Using a QR code or clock on the scorer's phone to compute the scorer-clock ↔ video offset combines (a) the Scorebreak-style clock offset, which Scorebreak itself does via metadata or manual alignment, with (b) public QR time-sync techniques dating from 2007 to 2014. On its own this is likely obvious. Note that Amazon's US9984354B1 is still alive in the US until about 2034, so its claims should be checked before shipping QR sync in the US.
- Clock-OCR alignment gives an alternative or fallback sync path that needs no QR step, for venues with a visible scoreboard. It is also prior art.

### Gaps
- I did not read the US9984354B1 claims (the page text cut off). I did not search for other QR-sync patents (for example GoPro's own) or for BR equivalents.
- I found no academic paper specifically on *amateur scorer-app logs (wall-clock) ↔ amateur single-camera video* alignment. Most papers target broadcast footage with clock overlays.

## Q3. Open-source projects that already implement parts of this

### Takeaway
Open-source tools already cover manual event tagging plus playlist/clip export (LongoMatch, PlayTrace) and "CSV of timestamps → per-player ffmpeg clips" (highlight-cuts, if it still exists), as well as many AI auto-highlight pipelines. Nothing I found combines a live digital scoresheet (súmula) for court sports with automatic clock sync to a stream.

### Cited Findings
- **LongoMatch**: open-source, cross-platform sports video analysis. It tags plays, builds playlists and exports highlights. Some sources are dated (2017–2018). — [gHacks](https://www.ghacks.net/2017/03/05/longomatch-open-source-video-analysis-tool/); [VideoHelp](https://www.videohelp.com/software/LongoMatch)
- **iansteiner/highlight-cuts**: per the search snippet, an MIT-licensed CLI that takes a full game recording plus a **CSV of timestamps** and produces **per-player highlight videos**. **The repo returned HTTP 404 when fetched (Nov 2026), so it may have been deleted or made private; this is unverified.** — [GitHub (404 at fetch)](https://github.com/iansteiner/highlight-cuts)
- **MrValtancoli/PlayTrace-App**: open-source football event tagging with multiple time references and JSON/CSV/XML export (Sportscode/LongoMatch-style XML). — [GitHub](https://github.com/MrValtancoli/PlayTrace-App)
- **dennyschwender/sport-video-AI-analysis**: GPT-4o/Gemini event detection → timestamps → ffmpeg clips and reels. — [GitHub](https://github.com/dennyschwender/sport-video-AI-analysis)
- **pitt-cic/automatic-highlight-reel-generator**: AWS pipeline that clusters detections into intervals, cuts them with ffmpeg and merges them. — [GitHub](https://github.com/pitt-cic/automatic-highlight-reel-generator)
- **backblaze-b2-samples/supervision-sports-highlights**: detection and tracking (Roboflow Supervision) → ffmpeg clip cutting → LLM summary. — [GitHub](https://github.com/backblaze-b2-samples/supervision-sports-highlights)
- **matthewhillary/sports-highlights**: audio-energy candidate moments → review clips → reel. — [GitHub](https://github.com/matthewhillary/sports-highlights)
- **MANNY1543/smart-video-highlight-pipeline**: OpenCV + YOLO11n + Gemini highlight generation. — [GitHub](https://github.com/MANNY1543/smart-video-highlight-pipeline)
- Curated lists: [GitHub topic sports-video](https://github.com/topics/sports-video); [Awesome-Video-Analysis](https://github.com/ishandutta2007/Awesome-Video-Analysis)
- Kinovea and OpenSportsLab: my searches returned nothing on OpenSportsLab, and I did not verify Kinovea in this session.

### Inferences
- Cutting clips at "event time − pre-roll to event time + post-roll" with ffmpeg is trivial, widely implemented and freely available. It cannot be a differentiator.
- Before relying on any open-source code, check licenses (LongoMatch historically GPL; verify).

### Gaps
- I did not verify Kinovea features or license, LongoMatch's current maintenance status, or whether OpenSportsLab exists.
- I did not find an open-source "play-by-play JSON → video alignment" repo specifically for basketball, futsal or handball, though one may exist.

## Q4. Overall: what is clearly not novel, what might be differentiated, and the cautious FTO view

### Takeaway
The core concept (scoring app with timestamps + video + clock offset + clips ±N s per event + per-player reels) is **not novel**. It is disclosed and in part claimed by Scorebreak (2015), CSR Lab (2020), Sufuentes (2016), Amazon and others, and it is sold commercially by GameChanger (auto clips when a game is streamed and scored), Hudl, Pixellot, PlaySight and Veo. QR/clock sync is also not novel (Amazon 2014, a 2007 publication, Catapult, Dartfish, GoPro). The differentiation is in **market and execution**: Brazilian amateur/university court sports, an official-style digital súmula for futsal, handball, basketball and volleyball, low-cost phone-only capture, and integration with federations and leagues. Patent novelty is not a realistic differentiator. FTO risk in Brazil appears low based on the families found (all US-only), but this is unverified at INPI. In the US, risk is material because of Scorebreak and CSR Lab.

### Cited Findings
- Scorebreak claims an offset between scoring-device and video clocks, plus clips of correlated actions with lead/lag. Active until about 2036, US only. — [Google Patents US20210134329A1](https://patents.google.com/patent/US20210134329A1/en)
- CSR Lab claims time-coded charting → triggers → clip cutting → compiled highlight. Active until about 2041, US only. Per-player is described but not claimed. — [Google Patents US20210232826A1](https://patents.google.com/patent/US20210232826A1/en)
- GameChanger ships automatic clips from streamed and scored games, including basketball. Its cited patents (US8731458, expiring 2030; US9393485) claim baseball real-time scorekeeping, not clip generation. — [GameChanger basketball auto clips](https://gc.com/post/automatic-video-clips-for-basketball); [Google Patents US8731458B2](https://patents.google.com/patent/US8731458B2/en)
- QR time sync: patented by Amazon (US9984354B1, priority 2014, active until about 2034) and commercial at Catapult and Dartfish. — [US9984354B1](https://patents.google.com/patent/US9984354B1/en); [Catapult Thunder](https://thunder.catapultsports.com/hc/en-us/articles/360000532196-Thunder-QRC-Time-Sync); [Dartfish](https://support.dartfish.tv/en/support/solutions/articles/27000070670-synchronize-video-and-data-with-a-qr-code)
- Mobile timestamped highlight markers synced to recorded video: Sufuentes US10887673B2 (priority 2016, EP priority application 17162331.7). — [Google Patents US10887673B2](https://patents.google.com/patent/US10887673B2/en)

### Inferences
**Clearly NOT novel (public prior art and/or third-party patents):**
1. Recording scoring events with wall-clock timestamps in a mobile app (GameChanger 2008, Scorebreak 2015).
2. Computing an offset between scorer clock and video clock, and cutting clips with pre/post-roll (Scorebreak 2015; US20120189273 uses 5 s before / 20 s total).
3. Compiling per-player or per-team highlight reels from event data (CSR Lab description; US10433030B2; US7988560B1; Baidu US11769327).
4. Syncing via a QR code or clock displayed on a phone and filmed by the camera (US20070189333A1; Amazon US9984354B1; Catapult; Dartfish; GoPro/Tentacle; Ego-Exo4D).
5. Aligning by OCR of the scoreboard or clock (2016 paper; SoccerNet 2018; US12056928).

**Possibly differentiated (more product than patent; any patentability is doubtful):**
- A digital súmula that matches the official formats of Brazilian futsal, handball, basketball and volleyball federations (CBFS/CBHb/CBB/CBV-style), with highlights as a by-product of the official scoresheet. This is a market and workflow differentiator.
- Robust sync for messy amateur setups: the QR at start and end to correct drift, plus fallback alignment by audio whistles or scoreboard OCR, plus correction of the scorer's entry lag (the scorer logs an event several seconds after it happens). Correcting sport-specific entry lag (for example, a learned lead time per event type) might be a narrow technical improvement. The prior art above already includes lead/lag parameters, though (Scorebreak claim 6).
- Multi-source crowd video (parents' phones) auto-aligned to one súmula. Note that crowd multi-device video has its own prior art (Crowdflik US20160155475A1, cited by CSR Lab).
- Privacy and consent workflows (LGPD) for minors and university athletes, and distribution per athlete.

**FTO posture (cautious, not legal advice):**
- **Brazil-only operation:** no BR family members found for the closest patents, so US patents generally do not bind activity in Brazil. Risk looks low *pending a proper INPI search*. Pixellot (EP/CN filings) and big players (Stats Perform, Genius Sports, Hudl) should be checked for BR filings.
- **US expansion:** a material risk. A US attorney should read the claims of Scorebreak US10923157B2/US11636880B2, CSR Lab US11776265B2, Sufuentes US10887673B2 and Amazon US9984354B1 (QR sync). Design-arounds may be possible. For example, CSR Lab's claims require a "trigger list" and charting with time codes, and Scorebreak's claim 9 requires a GUI with a "progressively refined set of possible actions and outcomes". Only counsel can assess whether a design-around avoids each claim element.
- Publishing the startup's own technical approach (defensive publication) could prevent third parties from patenting obvious variants in Brazil.

### Gaps
- I did not search INPI, so there is no definitive BR answer.
- I did not verify Brazilian law on software patentability (LPI art. 10; INPI guidelines for computer-implemented inventions, Portaria/Resolução 411/2020?) against a primary source.
- Stats Perform, Genius Sports, Synergy and Second Spectrum portfolios were not reviewed.
- I did not read full claims for several patents (Sufuentes, Amazon x2, US20120189273, US8929721, US9393485).
