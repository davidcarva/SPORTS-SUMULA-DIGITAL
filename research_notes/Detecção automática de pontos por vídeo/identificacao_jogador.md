# Identifying WHICH player scored from video in amateur court sports (basketball, volleyball, futsal), as of late 2026

Scope note: almost all published numbers come from broadcast footage (NBA, NHL, NCAA, SoccerNet). Broadcast cameras are zoomed and follow the play, so jerseys show up at far higher resolution than on one fixed wide-angle phone or GoPro. Results are flagged **[BROADCAST]** where that applies. I found no published benchmark of player identification on fixed, single-camera, amateur, poorly lit indoor footage.

## 1. Jersey number recognition: accuracy, and how many pixels a number needs

### Takeaway
On broadcast or near-broadcast footage, the best tracklet-level pipelines (legibility filter, then pose-based torso crop, then PARSeq scene-text OCR, then voting over many frames) reach about 80–93%. Single-frame reads are much worse, because the number is legible in only a minority of frames. No source gives a hard minimum pixel height. Broadcast crops are already tiny (under 20×25 px), and every paper names low resolution, blur and occlusion as the main failure causes. A fixed 1080p wide-angle camera across a whole court probably sits at or below the hard end of these benchmarks.

### Cited Findings
- SoccerNet Jersey Number dataset: 2,853 player tracklets taken from SoccerNet tracking videos. "-1" marks a number that is never visible. The 2023 challenge winner (ZZPM) scored 92.85% accuracy. **[BROADCAST]** — [SoccerNet sn-jersey GitHub](https://github.com/SoccerNet/sn-jersey)
- The SoccerNet 2023 results paper says jersey number recognition got the most participant focus and "impressive results". **[BROADCAST]** — [SoccerNet 2023 Challenges Results (arXiv 2309.06006)](https://arxiv.org/pdf/2309.06006)
- An independent method (University of Warsaw poster) reports 85.62% on the SoccerNet challenge set and names motion blur, low resolution and occlusion as the obstacles. **[BROADCAST]** — [CVsports poster, Grad et al.](https://lukaszgrad.github.io/jnr/static/pdfs/cvsports_poster_final.pdf)
- Koshkina & Elder, "A General Framework for Jersey Number Recognition in Sports Video" (arXiv 2405.13896, 2024) describes the reference open pipeline:
  - ResNet34 legibility classifier, then ViTPose keypoints to crop the torso (shoulders to hips), then PARSeq fine-tuned with labels of at most 2 characters.
  - At tracklet level it adds main-subject filtering (Centroid-ReID features plus Gaussian outlier removal), then a confidence-weighted vote across frames.
  - Hockey, image level: 91.4% with fine-tuned PARSeq vs 85.4% with off-the-shelf PARSeq, 48.1% holistic ResNet34, 65.2% multi-task ResNet34.
  - SoccerNet, tracklet level: 87.45% on test and 79.31% on the challenge set. The previous best was 68.53% / 73.77%. Without main-subject filtering, test accuracy drops to 84.56%.
  - Legibility classifier: 94.5% accuracy but only 71.7% F1.
  - Cross-sport transfer: a soccer-trained model scores only 65.84% on hockey. Fine-tuning on the target domain matters.
  - Stated failure causes: blur, pose, projective distortion, occlusion and jersey folds. "The number is usually clearly visible in only a minority of frames." Occluding players inject their own numbers into a tracklet. Two-digit numbers often show only one digit.
  - The university-game hockey images are lower resolution and "especially challenging", but no pixel sizes are given.
  - — [arXiv 2405.13896 HTML](https://arxiv.org/html/2405.13896v1)
- SoccerNet 2024 had no standalone jersey number leaderboard. Jersey numbers fed into Game State Reconstruction (GS-HOTA), where a track scores zero unless jersey number, role and team all match.
  - Winner Constructor.tech: 63.81 GS-HOTA vs a 23.36 baseline. Second place: 43.15. This shows how much end-to-end identity is lost even on broadcast footage.
  - The winner classified team with an OSNet model trained on 111 uniforms, and used team plus jersey number to merge tracklets.
  - Other teams used YOLOv8 with 0–99 classes, 0–9 digit detectors, or WideResNet.
  - One team's two-stage CLIP method reported 0.78 tracklet accuracy.
  - **[BROADCAST]** — [SoccerNet 2024 Challenges Results (arXiv 2409.10587)](https://arxiv.org/html/2409.10587)
- The SoccerNet 2025 results paper describes a pipeline that filters embeddings, takes torso regions from pose keypoints and reads numbers with PARSeq. I could not extract its accuracy figures because the PDF did not parse. — [SoccerNet 2025 Challenges Results (arXiv 2508.19182)](https://arxiv.org/pdf/2508.19182)
- Roboflow basketball tutorial (Sept 30, 2025), the closest open basketball pipeline:
  - RF-DETR-S detector with 10 classes, including "number", "player-jump-shot", "ball-in-basket" and "rim".
  - SAM2 for tracking.
  - Teams: SigLIP embeddings, then UMAP, then K-means with k=2.
  - Numbers matched to players by mask Intersection-over-Smaller-area ≥ 0.9. Sampled every 5 frames, accepted after 3 identical reads in a row.
  - Number OCR: base SmolVLM2 56%, fine-tuned SmolVLM2 86%, fine-tuned ResNet classifier 93% (trained on about 3.6k NBA Playoffs crops).
  - Runs at about 1–2 FPS on a T4.
  - Errors concentrate on players far from the camera, such as corner shooters. Blur, overlap and near-identical uniforms are named as core problems.
  - Suggested fix: restrict predictions to the numbers known to be on court, i.e. a roster prior.
  - **[BROADCAST-like]**: the footage zooms and pans.
  - — [Roboflow blog](https://roboflow.com/blog/identify-basketball-players)
- Pixel size: broadcast jersey crops are described as smaller than 20×25 px with heavy class imbalance. The same group's ~92% whole-number / 94% single-digit accuracy relied on high-resolution 512 px number images. — [Bhargavi et al., Frontiers in AI 2022](https://www.frontiersin.org/articles/10.3389/frai.2022.988113/full)
- Gerke et al. (ICCV 2015 workshop) say overview (wide) cameras are the worst case: per-player resolution is too low for face recognition, and jersey numbers are often unreadable, especially at SD resolution. — [Gerke et al., ICCVW 2015](https://openaccess.thecvf.com/content_iccv_2015_workshops/w21/papers/Gerke_Soccer_Jersey_Number_ICCV_2015_paper.pdf)

### Inferences
- Rough geometry, my own estimate, not from a source:
  - A 1080p phone covering a 28 m basketball court lengthwise spends about 1920 px on 28+ m, so roughly 60–70 px per metre at best near the far side.
  - A back number roughly 20 cm tall (typical FIBA-style size; the rule was not checked in this research) would be about 12–15 px tall, and only when the player's back faces the camera.
  - With a GoPro-style wide FOV it gets smaller, plus barrel distortion and low-light blur.
  - That is at or below the broadcast crops that already defeat single-frame OCR. Expect it to work only for near-side players, or with 4K capture and a tighter framing.
- Futsal courts (about 40×20 m) are longer than basketball courts, so per-player pixels are worse still. Volleyball (18×9 m) is the most favourable of the three.
- Numbers printed on pinnies or "coletes" are often large but low-contrast, wrinkled and loose. Fine-tuning on the target domain matters a lot: cross-sport transfer dropped to 65.84%.
- A roster prior (only 10–14 possible numbers, split by team colour) turns 0–99 OCR into a classification over about 5–7 candidates per team, which should help considerably. The Roboflow post suggests this but does not test it.
- The precise point timestamp lets the system read numbers over a window of several seconds before and after the point, i.e. tracklet voting, rather than at the instant of the point.

### Gaps
- No public accuracy-vs-pixel-height curve, and no published minimum digit height.
- No amateur or fixed-camera jersey benchmark for basketball, volleyball or futsal.
- SoccerNet 2024/2025 per-team jersey leaderboards were not retrieved (the 2025 PDF did not parse).

## 2. Multi-object tracking, re-identification and team assignment

### Takeaway
Sports trackers built on top of ByteTrack, such as Deep-EIoU, Deep HM-SORT, GTA refinement and SAM-based variants, reach about 77–87 HOTA on SportsMOT. They still produce thousands of identity switches over the benchmark. Same-team look-alikes and sudden direction changes (crossovers, spikes) are the named failure modes. Team assignment by unsupervised embedding or colour clustering is standard and works when the two teams' colours differ clearly. It breaks when the teams wear similar clothes, which is common in "babas".

### Cited Findings
- Deep-EIoU (WACVW 2024): 77.2 HOTA on SportsMOT and 85.4 on SoccerNet-Tracking. The paper notes that same-team players look alike and that sudden moves such as a basketball crossover or a volleyball spike make motion prediction unreliable. — [Huang et al., WACVW 2024](https://openaccess.thecvf.com/content/WACV2024W/RWS/papers/Huang_Iterative_Scale-Up_ExpansionIoU_and_Deep_Features_Association_for_Multi-Object_Tracking_WACVW_2024_paper.pdf); [ar5iv](https://ar5iv.labs.arxiv.org/html/2306.13074)
- Global Tracklet Association (GTA) is an offline refinement step that plugs into these trackers. It reaches 81.04 HOTA on SportsMOT. — [arXiv 2411.08216](https://arxiv.org/html/2411.08216v1)
- Deep HM-SORT: 80.1 HOTA on SportsMOT, with 1,703 ID switches vs 2,659 for Deep-EIoU on the test set (Table 1). — [arXiv 2406.12081](https://arxiv.org/pdf/2406.12081)
- SAM 3 + Deep-EIoU, a June 2026 preprint (likely not peer-reviewed):
  - It reports 87.2 HOTA on the SportsMOT test set in the body but 86.8 in the abstract, which is internally inconsistent.
  - Validation per sport: basketball 90.4, football 87.9, volleyball 87.2 HOTA.
  - — [arXiv 2606.13033](https://arxiv.org/html/2606.13033)
- SportMamba is another recent tracker that targets non-linear sports motion. — [arXiv 2506.03335](https://arxiv.org/html/2506.03335v1)
- Team assignment in practice:
  - Roboflow: SigLIP, then UMAP, then K-means with k=2. — [Roboflow blog](https://roboflow.com/blog/identify-basketball-players)
  - SoccerNet 2024 winner: OSNet team classifier. Another team clustered Siamese embeddings. — [arXiv 2409.10587](https://arxiv.org/html/2409.10587)
- Re-ID in team sports is hard because "players from the same team wear highly similar clothes" and there are few samples per identity. — [Sports Re-ID, arXiv 2206.02373](https://arxiv.org/html/2206.02373v2)
- ContextReID (Oct 2026, arXiv 2610.13259) builds a player embedding from in-frame and cross-frame context with a vision-language backbone. It needs no jersey OCR or roster matching and is aimed at the same-team look-alike problem. It was evaluated on SportsMOT, DanceTrack and SoccerNet-GSR **[BROADCAST framing]**. The abstract reports no numbers. — [arXiv 2610.13259](https://arxiv.org/abs/2610.13259)

### Inferences
- HOTA in the 80s still means identities get swapped regularly. Across a whole amateur game with no jersey numbers to re-anchor identities, an ID-switch-free track for the full match is unrealistic.
- Fixed, uncut amateur footage has one advantage over broadcast: no camera cuts or zoom changes, so motion models behave better. The disadvantages are crowding at the basket or net, low light and motion blur.
- "Tracking until the point, then identifying" only needs short-term identity, a few seconds around the point timestamp. That is much easier than whole-game identity.
- Benchmark caveat: to my knowledge (not confirmed in this research), SportsMOT is built from broadcast footage (Olympics, NCAA, NBA), so these numbers are **[BROADCAST]**.

### Gaps
- No ID-switch figures measured on fixed-phone amateur court footage.
- No study of colour-clustering failure when both teams wear similar colours or partial pinnies.

## 3. Attributing the point to a player: shooter, last touch, goal scorer

### Takeaway
I found no open, validated system that attributes "who scored" in amateur basketball, volleyball or futsal. The building blocks exist:
- shot or point detection (detector classes such as jump-shot, layup, ball-in-basket);
- backtracking from the point time to the player who had possession or made the last contact;
- reading that player's number or appearance.

Commercial volleyball tools such as Balltime/Hudl say they link each action to a player through jersey numbers, but publish no accuracy figures.

### Cited Findings
- Patent application US 2022/0301309 describes finding the shooter of a declared shot attempt:
  - It starts from the shot attempt time and backtracks frames in reverse.
  - It follows moving-object flow to find the shooter and locates their feet.
  - It projects that position onto the court.
  - This closely matches the user's setup, where the app already has the point timestamp.
  - — [uspto.report US20220301309](https://uspto.report/patent/app/20220301309)
- The Roboflow detector has explicit classes for "player-in-possession", "player-jump-shot", "player-layup-dunk", "ball-in-basket" and "rim". Together these give a usable chain: shot pose, then ball in basket, then tracked player ID, then number. **[BROADCAST-like]** — [Roboflow blog](https://roboflow.com/blog/identify-basketball-players)
- Balltime's model (VOLL-E), per its own marketing explainer:
  - Pipeline steps: downtime removal, action ID (attack, pass, set, serve, dig, block), player ID, jersey number tracking matched to the roster, then "stats logic" and ball tracking.
  - No accuracy is given; this is vendor marketing.
  - — [Balltime TikTok explainer](https://www.tiktok.com/@balltime.ai/video/7377456088943168800)
- A trade-press article from about 2023 says Balltime does not require numbered jerseys. That conflicts with the jersey-based explainer, possibly because it describes an earlier version. — [Volleyball Magazine](https://volleyballmag.com/ai-and-volleyball-072723/)
- Hudl Assist "powered by Balltime AI" uses computer vision to track player movements and ball contacts. Hudl admits it "may occasionally miss minor details due to players blocking the view". — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- In volleyball scouting (Data Volley-style), analysts still code each play by hand, including the player's uniform number. — [SciTePress 2025 volleyball assessment paper](https://www.scitepress.org/publishedPapers/2025/132380/pdf/index.html)
- Sports captioning work identifies "salient players" in NBA games. This is identity recognition, not shot attribution. **[BROADCAST]** — [arXiv 2507.20163](https://arxiv.org/pdf/2507.20163v1); [arXiv 2208.04897](https://ar5iv.labs.arxiv.org/html/2208.04897)

### Inferences
- **Basketball**: the shooter is the most tractable case. Look about 1–3 s before the timestamp, find a player in a shooting pose or holding the ball, and take that track's identity. Tip-ins and scrambles under the basket are the hard cases.
- **Volleyball**: "who scored" is ambiguous.
  - An attack kill means the last touch by the scoring team, at the net, where it is crowded with blockers.
  - An ace means the server, which is easy: the server stands isolated behind the end line.
  - An opponent error means no scorer at all. The user's app already models "ponto por erro do adversário".
  - Serve attribution is probably the most reliable piece and could be automated first.
- **Futsal**: the scorer is the last attacker to touch the ball before the goal. With a small, fast ball, a crowded area in front of goal and a long court, this is the hardest of the three from one wide camera.
- In all three sports a top-3 candidate list, scored by proximity to the ball or hoop just before the timestamp plus a team-colour match, is far more realistic than a single confident answer.

### Gaps
- No peer-reviewed paper found on shooter, last-touch or goal-scorer attribution with accuracy numbers.
- No futsal-specific player identification work found.

## 4. Without jerseys: face recognition, appearance enrollment, pose/gait, and LGPD

### Takeaway
Face recognition from a fixed courtside camera is not viable at typical distances. Faces would be roughly 6–32 px tall, the TinyFace regime, where identification accuracy collapses. The most promising jersey-free approach is appearance enrollment: a few labelled examples, or a photo per player taken before the game, used to train or query a re-ID model. It works only partially even on HD broadcast rugby (about 54–68% identification recall). Under LGPD, face or biometric templates are sensitive personal data (art. 5 II, art. 11), and the ANPD is actively enforcing this in sports. Clothing-appearance matching that is discarded after the game is a lighter-risk design.

### Cited Findings
- TinyFace: 5,139 identities and 169,403 native low-resolution faces averaging about 20×16 px (heights 6–32 px). There is a large accuracy gap compared with standard benchmarks, whose faces average 100 px or more. — [TinyFace project](https://qmul-tinyface.github.io); [arXiv 1811.08965](https://arxiv.org/abs/1811.08965)
- One paper reports top-1 identification of about 12% and 26% on TinyFace under different settings. — [arXiv 1907.13255](https://arxiv.org/pdf/1907.13255)
- Wide overview cameras: "low resolution per player makes face recognition impossible". — [Gerke et al., ICCVW 2015](https://openaccess.thecvf.com/content_iccv_2015_workshops/w21/papers/Gerke_Soccer_Jersey_Number_ICCV_2015_paper.pdf)
- Few-shot appearance enrollment in rugby sevens (arXiv 2204.04049):
  - Footage: 1080p50 PTZ broadcast; players sometimes under 150 px tall.
  - No jersey numbers used. A ResNet-50 re-ID network plus a Transformer classifies tracklets into player identities.
  - Needs about 6 short tracklet annotations per player. Gains plateau after about 3.5 annotations.
  - Clips: 76.8–84.3 IDF1.
  - Full-game detection-plus-identification recall: 53.6%, rising to 67.9% for large, well-visible players.
  - Fine-tuning the re-ID network raises training time from 28 s to 25 min.
  - **[BROADCAST]**
  - — [ar5iv 2204.04049](https://ar5iv.labs.arxiv.org/html/2204.04049)
- Runner re-ID from daily practice video, where no bibs are available, suggests clothing and shoe colour as practical cues. — [arXiv 2310.11700](https://arxiv.org/pdf/2310.11700)
- LGPD and ANPD:
  - Biometric data is sensitive personal data under LGPD art. 5 II, so art. 11 governs it.
  - In Feb 2025 the ANPD enforcement unit found signs of irregularities in facial recognition by 23 football clubs. The concerns were transparency, legal basis, purpose, retention, and the biometric data of children and adolescents.
  - The ANPD opened a public consultation (Tomada de Subsídios) on biometric data, asking about legal bases and free, informed consent.
  - — [Tecnoblog](https://tecnoblog.net/noticias/anpd-ve-uso-irregular-de-reconhecimento-facial-nos-estadios/); [Mattos Filho](https://www.mattosfilho.com.br/unico/reconhecimento-facial-estadios-experiencia-brasileira/); [ANPD Tomada de Subsídios: dados biométricos](https://www.gov.br/participamaisbrasil/ts-dados-biometricos); [ANPD Nota Técnica 23/2025](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/ts-01-2025/nota-tecnica-no-23-2025-con1-cgn-anpd.pdf)

### Inferences
- A practical "baba" design:
  - Before the game, capture a full-body photo or a few seconds of video of each player in the clothes they are wearing that day.
  - Embed it with a general re-ID or vision-language model.
  - Match tracklets near the scoring event against only that day's roster, split by team colour.
  - Delete the embeddings afterwards.
- This identifies clothing, not the body, which may keep it outside "biometric" processing. That is a legal judgement still to be confirmed with counsel.
- Face templates would clearly be sensitive data. They would need specific, prominent consent (art. 11 I) and special care for minors (art. 14).
- Players in similar plain t-shirts give appearance embeddings little to work with. Accuracy will vary heavily with how distinct people's clothes are, and shoes, shorts and hair are the residual cues.
- Gait and pose: I found no sports-specific evidence that gait identifies players in short, chaotic court clips. Treat it as unproven.

### Gaps
- No measured accuracy for pre-game photo enrollment in amateur court sports.
- No gait-based player identification results found.
- No final ANPD decision on the stadium investigations or on biometric legal bases was found.
- No specific ANPD guidance on recreational or amateur sports video was found.

## 5. Human in the loop, and how commercial tools handle player tagging

### Takeaway
No commercial product claims fully reliable automatic player attribution in amateur conditions:
- Veo and Balltime read jersey numbers against a coach-entered lineup and provide a UI to fix wrong attributions.
- Hudl Assist relies on trained human analysts, with a 12–24 h turnaround.
- Veo's number-based player features are limited to outdoor soccer.

An industry-standard pattern exists: the AI proposes, the human corrects in the clip view. That supports a "suggest the top candidate, confirm with one tap" design.

### Cited Findings
- Veo Player Spotlight / Player Moments:
  - Player tracking "powered by shirt number detection", currently only for outdoor soccer.
  - The AI detects players mainly from visible jersey numbers. Jersey numbers must be set in the Lineup.
  - Misread or unlinked numbers cause events to be assigned to the wrong player. A help article explains how to fix an event assigned to the wrong player.
  - Player Moments apply only to recordings made after 18 Aug 2026 (Analytics 2).
  - Sources: Veo [product page](https://www.veo.com/en-us/product/player-spotlight), [Player Moments overview](https://support.veo.com/hc/en-us/articles/27698176364817), [fix wrong player](https://support.veo.com/hc/en-us/articles/49504411443857-How-to-fix-an-event-assigned-to-the-wrong-player). The last page returned 403 to my fetch, so its content comes from the search snippet.
- Balltime FAQ:
  - Accuracy depends strongly on video quality and angle.
  - Filming spec: 1080p, 30 fps, horizontal; no wide-angle or fisheye lens and no zooming out.
  - Camera centred behind the end line, on a tripod at 8–10 ft (minimum 5 ft).
  - Users fix "misidentified" athlete tags with an edit tool (pencil icon).
  - — [Balltime Academy FAQ](https://academy.balltime.com/getting-started/faqs)
- Hudl Assist:
  - "Trained analysts who manually tag every play, event, and statistic", with AI in some sports.
  - 12 h or 24 h turnaround tiers.
  - Coaches enter jersey numbers and colours per game.
  - — [Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- Few-shot interactive labelling, where a user labels a few tracklets per player, is a research form of human in the loop: about 3.5–6 labels per player. — [ar5iv 2204.04049](https://ar5iv.labs.arxiv.org/html/2204.04049)

### Inferences
- The user's app already holds the point timestamp and the roster. The highest-value, lowest-risk design:
  - At each point, show a short clip or still with the 2–3 candidate players highlighted. The candidates are those nearest the ball or hoop in the moments before the point, filtered by team.
  - Ask for one tap to confirm.
- Confirmed taps also become labelled appearance examples for the rest of the game, improving later suggestions. This is the rugby few-shot idea applied online.
- Balltime's filming rules ("no wide-angle", 1080p, elevated, centred) show that even commercial vendors need controlled camera setups. GoPro wide or fisheye modes should be switched to linear or narrow.
- Auto-confirm only when confidence is very high, for example a consistent number read over many frames plus a single candidate in the scoring area. Otherwise ask the human.

### Gaps
- Pixellot's player tagging and jersey handling: no information found.
- Independent accuracy figures for Veo, Balltime or Hudl player attribution: none found.

## 6. Non-video alternatives: wearables, BLE/UWB tags, smart balls

### Takeaway
Sensor systems avoid the visual identity problem, because each tag is a player ID. They cost money and require every player to wear something.
- ShotTracker's current system uses a sensor ball, player-worn sensors and anchors mounted in the rafters.
- Its earlier consumer version used a wrist sensor plus a net sensor.

No independent accuracy figures were found. For informal "babas", the cheapest equivalent is the phone app itself: one tap on the scorer when the point is logged.

### Cited Findings
- Original ShotTracker:
  - A wrist or sleeve sensor (accelerometer, gyroscope and/or barometer) plus a net sensor, with a phone app.
  - Shots are detected by matching motion to stored per-player shot profiles, and the system needs per-user training.
  - — [US Patent 9,186,568](https://patentimages.storage.googleapis.com/e8/ff/f5/c6dafadabb9c80/US9186568.pdf); [New Atlas](https://newatlas.com/shottracker-tracks-basketball-players-performance/34872); [Wareable](https://www.wareable.com/sport/boomshakalaka-494)
- Current ShotTracker:
  - A sensor-enabled ball, sensors worn by players, and anchors in the rafters that track ball and player positions in real time.
  - The app shows data such as contested vs uncontested shots.
  - — [ShotTracker "How it works"](https://www.shottracker.com/howitworks)

### Inferences
- BLE RSSI is too coarse (metres) to separate players clustered under a basket. UWB (anchor-based, decimetre class) is what installed systems use, which means fixed gym infrastructure; that does not fit "babas".
- A wrist IMU per player could spot "shooting motion at time t" and so pick the shooter in basketball, but it needs a device on every player. For futsal or volleyball it would not identify the touching player reliably.
- Hybrid idea: pair the video candidate list with a scorer tap on the app, or a smartwatch tap for whoever logs the point. Cost is near zero and accuracy is near human level.

### Gaps
- No independent ShotTracker accuracy figures.
- No consumer BLE or UWB tag product for amateur futsal or volleyball player attribution found.
- No smart-ball product for futsal or volleyball that attributes scorers found.
