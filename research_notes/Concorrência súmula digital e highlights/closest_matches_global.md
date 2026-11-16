# Closest global matches: digital scoresheet linked to video that auto-cuts per-athlete clips

Research date: 2026-11-06. Classification used throughout:
- **(a) Manual tagging** by coaches/analysts after the game
- **(b) AI auto-detection** from video (no scorer input)
- **(c) Live scorekeeper-driven tagging** (the concept: scorer's tap timestamp + player = clip)

"Verified (official)" = read on the vendor's own page/help center/blog in this session. "Third-party" = press, app store, aggregator. "Snippet only" = seen only in a search-result summary; page could not be fetched.

## 1. Which products tie scorekeeping/stat-entry events to video timestamps to auto-generate per-player clips?

### Takeaway
Three products implement the concept (c) almost exactly: **GameChanger** (US, free for coaches, basketball, phone stream + scorekeeping -> per-player clips after the game), **BallerCam** (US, launched 2025, basketball/volleyball/futsal, dedicated camera unit + second iOS device for scoring) and **Glory League** (Australia/NZ, venue-installed cameras, scorebench points -> player highlights). Everyone else either relies on AI detection (SportsVisio, Hooper, Hudl Balltime, Pixellot) or manual/outsourced tagging (Hudl Assist, TurboStats-style "video scoring" against recorded footage).

### Cited Findings

**GameChanger (DICK'S Sporting Goods) — concept (c), closest match**
- Basketball automatic clips: originally every made 2- or 3-pointer was clipped; a December 8, 2025 update added rebounds, assists, blocks and steals. Requirement: the game must be **both streamed and scored**. Clips are created "once the game has ended" (post-game, not instant). Clips appear in each player's profile (Video Clips tab) and can be watched, downloaded and shared outside the app. Free for team staff; fans need a Premium subscription. Clip length not stated. — Verified (official): [GameChanger blog, Automatic Video Clips for Basketball](https://gc.com/post/automatic-video-clips-for-basketball)
- Help center (snippet only, page returned 403): "Once a play is logged we generate a clip off of that data, so scoring in real time is essential"; clip performance "reliant on a consistent stream and the scorekeeping data"; downloads take ~45 s each and only one clip can be downloaded at a time. — [GameChanger Help: Automatic Video Clips for Basketball](https://help.gc.com/hc/en-us/articles/7050399896845-Automatic-Video-Clips-for-Basketball)
- Help center (snippet only): if a play is assigned to one player and then edited to another, "a clip will not generate for the new player. The clip will be assigned to the original player"; non-scorekeeping clips are not assigned to any player. — [GameChanger Help FAQ](https://help.gc.com/hc/en-us/articles/21334712734733)
- A help article titled "Stream and Score from One Device" exists, indicating one phone can both stream and keep score (title seen in search; content not fetched). — [GameChanger Help: Stream and Score from One Device](https://help.gc.com/hc/en-us/articles/34099550389773-Stream-and-Score-from-One-Device)
- AutoStream: GameChanger describes it as a FREE feature using proprietary AI to automatically track basketball game action "requiring only a mobile device" (snippet). — [GameChanger partner news: AutoStream](https://gc.com/partner-news/gamechanger-puts-spotlight-on-basketball-with-autostream-ai-driven-innovation-for-hands-free-streaming)
- Sept 29, 2026 article: basketball expansion adds club management, AutoStream (saved court outline, 720p, audience controls), three scorekeeping modes (points only; points + video on the same device; points + full stats). Automatic Highlight Clips labeled by play type (2PT, 3PT, steals, blocks), offense/defense, filterable by play and period. Player Game Story and Player Season Story and social-ready clips listed as "coming soon". Basketball is GameChanger's most-used sport after baseball/softball; free for coaches. — Third-party: [Youth Sports Business Report, 2026-09-29](https://youthsportsbusinessreport.com/gamechanger-basketball-expansion-adds-club-management-autostream-and-automated-highlights/)
- "Player Game Reels organize an athlete's clips from a single game into one chronological playlist" (snippet; official blog). Note: conflicts slightly with YSBR listing Player Game Story as "coming soon" — may be staged rollout. — [GameChanger: New Ways to Replay the Basketball Action](https://gc.com/post/replay-the-action-player-game-story-player-season-story)
- Same mechanism exists for baseball/softball ("automatic hit clips"). — [GameChanger: Automatic Video Clips](https://gc.com/post/automatic-hit-clips)
- Fan pricing (US$): App Store lists Monthly Premium $14.99, Monthly Plus $9.99, Annual Premium $99.99, Annual Plus $39.99; GameChanger plan finder shows Individual Premium Monthly $14.99; family plan shares with up to 3 others. — Third-party aggregators [apppricinglab](https://apppricinglab.com/iap/apple/1308415878), [TrustRadius](https://www.trustradius.com/products/gamechanger/pricing); official [GameChanger plan finder](https://gc.com/pricing/perfect-plan-finder) (seen via search summary, not fetched)
- Spring 2026: free baseball/softball livestream viewers limited to five full-game views before subscription (basketball not mentioned). — Third-party: [YSBR spring 2026 release](https://youthsportsbusinessreport.com/?p=16768)
- Sports: baseball, softball, basketball (no volleyball/futsal/handball found). — [GameChanger Basketball](https://gc.com/basketball); [Wikipedia](https://en.wikipedia.org/wiki/GameChanger)

**BallerCam — concept (c) + AI, hardware-based**
- FAQ (dated Feb 25, 2026): AI auto-panning for Basketball, Soccer, **Futsal**, **Volleyball**, Lacrosse, Ice Hockey, Flag Football; "can automatically create clips from supported scoring events entered during a game"; "Mark Moment" button for non-scoring plays; scoring is done on a **second device** (older iPhone/iPad OK) by a user with Keep Score permission; player attribution "may happen automatically or require manual assignment" depending on workflow; AI Plays "may miss or misclassify events". Hardware: supported iPhone + BallerCam unit with 180° lens + tripod. Plans: Base (20 h cloud, included), Starter (100 h), Pro (250 h + RTMP + logo overlay); prices not shown on that page. Clip length not stated. Pickleball supported in Philippines and India. — Verified (official): [BallerCam: 25 most common questions](https://ballercam.com/blogs/posts/25-most-common-ballercam-questions-answered)
- Scoring help article: scoring events connected to automatically generated clips "when supported"; second iOS device recommended; roster required for player attribution; basketball controls for 2PT/3PT/FT (snippet; page 403). — [BallerCam Scoring: Who Can Keep Score](https://support.ballercam.com/hc/en-us/articles/37731906610829-BallerCam-Scoring-Who-Can-Keep-Score-and-How-It-Works)
- Volleyball scorecard detection and portrait play clips for basketball/volleyball (titles seen in search). — [BallerCam update: volleyball scorecard detection](https://ballercam.com/blogs/updates/volleyball-scorecard-detection-portrait-plays-scoring-screen); [Moments for volleyball](https://ballercam.com/blogs/updates/introducing-moments-for-volleyball); [Apple Watch scoring app](https://ballercam.com/blogs/updates/ballercam-apple-watch-scoring-app)
- USAV Nationals 2026 promo page exists (US volleyball club market). — [BallerCam USAV promo](https://ballercam.com/pages/usav-nationals-ballercam-promo-2026)

**Glory League — concept (c), venue-installed, basketball only**
- Scorebench volunteers enter points in a scoring app; that data is matched with game video to create highlights. Points are automatic; assists, blocks, steals, rebounds, turnovers are tagged manually by users post-game. Scorebench "may not always get the timing quite right", so anyone can edit start/end times of a highlight. — Verified (official): [Glory League guide: Tagging](https://gloryleague.basketball/guides/tagging)
- Cameras follow the ball with AI tracking; only available to venues and sports organisations; highlights assigned to a player feed Glory League Leaderboards (search summary of GameDay/Glory League pages). — [GameDay: Glory League Overview](https://support.mygameday.app/help/glory-league-overview) (404 when fetched); [Glory League features](https://gloryleague.basketball/features); [GameDay Marketplace Spotlight, 2023](https://community.mygameday.app/2023/05/gameday-marketplace-spotlight-glory-league) (pre-2024, possibly outdated)
- Origin NZ (2014 pitch) — [Idealog 2014](https://idealog.co.nz/venture/2014/08/elevator-pitch-glory-league) (old; context only)

**TurboStats — closer to (a) with live option**
- "Video scoring" mode automatically stops/starts video as you enter statistics and tags clips as you score; works with YouTube, Hudl and other video sources (snippet only; site TLS error on fetch; page appears old). — [TurboStats Basketball](http://turbostats.com/basket.htm)

**AI detection (b) — no scorer**
- SportsVisio: basketball, 3x3, volleyball; any phone; AI credits shots, rebounds, assists, steals to players; a clip per stat plus game reel; stats ~12 h after upload (post-game); prices not on players page. — Verified (official): [SportsVisio for Players](https://www.sportsvisio.com/players); volleyball "video clip for each stat", within 24 h — [SportsVisio Volleyball](https://www.sportsvisio.com/sport/volleyball)
- Hooper: basketball only; phone recording; computer vision detects players/events; per-player clips by jersey number via API webhook; in app users tag themselves among detected players; two phones for full court; Free $0 (2 h/mo), Pro US$11.99/mo (10 h), Team US$29.99/mo; site in English and Japanese, "30+ countries". — Verified (official): [Hooper](https://www.hooper.gg/)
- Hudl Balltime (volleyball, joined Hudl Feb 2025): individual plan US$20/month with 14-day trial; team "contact us"; Balltime's own HS page "starting at $499/season". — [Hudl pricing: Balltime](https://www.hudl.com/pricing/balltime); [Balltime high schools](https://www.balltime.com/high-schools); [BusinessWire Feb 2025](https://www.businesswire.com/news/home/20250206384625/en) (search summaries)
- Pixellot: automatic highlights "without any need for metadata, such as play-by-play commentary or scoring statistics" (2018, outdated); VidSwap + FIBA LiveStats integration so breakdowns available immediately after game (2020, outdated). — [Broadcast Now 2018](https://www.broadcastnow.co.uk/tech/ai-made-auto-highlights-added-to-pixellots-products/5129751.article); [Sports Video Group 2020](https://www.sportsvideo.org/2020/09/14/190719/)

**Manual / outsourced tagging (a)**
- Hudl Assist: Hudl tags games for you; automatic playlists deliver each athlete's key moments after every game; clips viewable in athletes' libraries up to 14 days; Hudl Focus camera auto-uploads to Assist. Human/outsourced breakdown, post-game. — [Hudl blog: automatic playlists](https://www.hudl.com/blog/play-hard-watch-smart-with-new-automatic-playlists); [Hudl Focus basketball](https://www.hudl.com/blog/hudl-focus-smart-camera-basketball) (search summaries)
- PlaySight (futsal page): integration with physical scoreboard for overlay during streaming and "pre-tagged events saved in the cloud". — [PlaySight Futsal](https://playsight.com/our-sports/futsal/) (search summary)
- iScore Basketball: only "scorecasts" (live text play-by-play) found; no evidence of video sync/clips. — [iScore Basketball](https://iscoresports.com/basketball/); [iScore Central Game Viewer](https://apps.apple.com/us/app/id978181909)

### Inferences
- GameChanger is the benchmark: same core loop as the concept (phone stream + scorer taps -> per-player clips), free for coaches, monetized via fans. Its gaps vs. the concept: post-game (not instant) clips, basketball only among the target sports, US-centric, no Portuguese evidence.
- BallerCam covers futsal and volleyball but needs proprietary hardware and a second iOS device; it's a hybrid (c)+(b).
- Glory League proves the scorebench-driven model works at league/venue scale but with fixed installs, and only points are automatic.
- No product found does (c) for **handball**; for **futsal** and **volleyball** only BallerCam (hardware-bound) was found.

### Gaps
- Exact clip duration/pre-roll offsets for GameChanger, BallerCam, Glory League not published on pages fetched.
- GameChanger availability in Brazil/LatAm and Portuguese localization: not found. BallerCam/Glory League languages: not found.
- BallerCam hardware/subscription prices (US$): pricing page not fetched.
- Not verified in this session (no source collected): Hudl Focus AI clipping details, Synergy, Genius Sports/FIBA LiveStats current video sync, Krossover status, Hoopsalytics, VolleyStation, Data Volley video, ScoreVision, SportsEngine, TeamSnap, Scoreholio, Spiideo, LiveBarn, NFHS Network, BallerTV, Veo, Nacsport, LongoMatch, Dartfish, Sportscode, Catapult, HomeCourt, SwishPro. Most of these are believed to be (a) or (b) but this was not confirmed here.

## 2. Is there any product doing exactly "scoresheet event -> per-athlete clip" for basketball, futsal, handball or volleyball?

### Takeaway
Yes for basketball (GameChanger, BallerCam, Glory League). Partially for volleyball and futsal (BallerCam, hardware-dependent). None found for handball. No Brazilian/Portuguese product found doing this.

### Cited Findings
- Basketball: GameChanger clips made FG, rebounds, assists, blocks, steals from scored+streamed games — [GameChanger blog](https://gc.com/post/automatic-video-clips-for-basketball)
- Basketball: Glory League points from scorebench -> highlights — [Glory League tagging](https://gloryleague.basketball/guides/tagging)
- Basketball/futsal/volleyball: BallerCam scoring-event clips — [BallerCam FAQ](https://ballercam.com/blogs/posts/25-most-common-ballercam-questions-answered)
- Portuguese-language search for futsal/handball "súmula digital + vídeo + lances por jogador" returned only stat apps without video (Futsal Notes), tactics boards (TacticalPad), the LNF video-referee protocol, and generic AI editors (Vidio). — [Futsal Notes](https://spark.mwm.ai/en/apps/futsal-notes/1462579186); [TacticalPad](https://apps.apple.com/us/app/id969619812); [LNF Vídeo Suporte 2023](https://lnfoficial.com.br/media/2023/10/Video-Suporte-LNF-2023.pdf); [Vidio PT-BR](https://www.vidio.ai/pt-BR/tools/futsal-highlight-video-maker)
- Brazil search for basketball/volleyball scoreboard + per-athlete highlights found only spectator score apps (VBTV, 365Scores, Flashscore, Sofascore, Virtual Scoreboard). — [VBTV](https://apps.apple.com/BR/app/id1369088371); [Virtual Scoreboard](https://apps.apple.com/br/app/virtual-scoreboard-placar/id477793710)

### Inferences
- The white space for the Brazilian startup: futsal + handball + volleyball with a phone-only, Portuguese, scorer-driven, instant clip flow. Basketball is contested by GameChanger only if it enters Brazil (no evidence it has).

### Gaps
- CBFS/CBHb/CBV official e-scoresheet systems and whether they have video hooks were not researched here.

## 3. Weaknesses/complaints reported about the closest matches

### Takeaway
Complaints center on clip accuracy depending on scorer timing, wrong-player attribution that cannot be fixed retroactively, stream/score sync lag, and slow/one-at-a-time downloads. Little Reddit evidence surfaced.

### Cited Findings
- GameChanger App Store review: app doesn't load, "captures the wrong clips", livestream and play announcer "drastically off" during live games (single anecdote). — [GameChanger App Store](https://apps.apple.com/us/app/gamechanger/id1308415878)
- GameChanger: reassigning a play to a different player does not regenerate the clip (vendor-documented limitation). — [GameChanger Help FAQ](https://help.gc.com/hc/en-us/articles/21334712734733)
- GameChanger: clips depend on real-time scoring and a consistent stream; ~45 s per download, one at a time. — [GameChanger Help](https://help.gc.com/hc/en-us/articles/7050399896845-Automatic-Video-Clips-for-Basketball)
- GameChanger: for missed moments users must screen-record from Video Archives. — [GameChanger blog](https://gc.com/post/automatic-video-clips-for-basketball)
- Glory League: scorebench timing often off; users must edit start/end; if moment isn't in the window, delete and re-add. — [Glory League tagging](https://gloryleague.basketball/guides/tagging)
- BallerCam App Store review: clip tool sometimes shows only one portion of a video (single anecdote). — [BallerCam App Store](https://apps.apple.com/app/id6747689741)
- BallerCam: attribution may require manual assignment; AI Plays may miss/misclassify. — [BallerCam FAQ](https://ballercam.com/blogs/posts/25-most-common-ballercam-questions-answered)

### Inferences
- Design implications: let the scorer adjust clip window/attribution after the fact and regenerate clips; compensate for scorer latency with pre-roll; allow multi-download/export.

### Gaps
- No Reddit threads (r/basketballcoach, r/youthsports, r/volleyball) surfaced in searches; systematic review mining not done.
