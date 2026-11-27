# Automatic detection of scoring events from video in court sports (state of the art, late 2026)

Scope: made baskets (and 1/2/3 value), volleyball rally end and point winner, futsal/handball goals; single fixed consumer camera (phone/GoPro), amateur gyms; video already synced (±0.1 s) to a manual scoresheet. The question is whether software can detect points on its own, or at least check the scoresheet.

Research note: about 17 tool calls. Several key sources are 2026 arXiv preprints (IDs 2608.x, 2609.x, 2610.x), which fits today's date (Nov 2026). They are not yet peer reviewed. MDPI and theseus.fi pages returned 403, so those were read only through search snippets.

## Basketball: ball/hoop detection, made-shot classification, 2 vs 3 points

### Takeaway
A fixed phone camera with the hoop in frame can now find shots and call makes or misses in amateur gyms. Honest held-out numbers are about 78–92% end-to-end per shot. The common "95–97%" GitHub figures are dev-set or unexplained. Deciding 2 vs 3 points from one wide camera is far less mature. It needs court homography plus the shooter's foot position, and that breaks down on amateur footage.

### Cited Findings
- **avishah3/AI-Basketball-Shot-Detection-Tracker** (about 287 stars, 2023): a custom YOLOv8 model detects ball and hoop, then a linear regression of the ball path decides whether it "intersects the hoop" (make). The README claims 95% score detection and 97% shot detection but does not say how this was measured. It "will not work if multiple basketballs and hoops are in frame", and accuracy depends on lighting and how clearly the ball and hoop are visible. The test videos are outdoor, with the phone on the ground. — [GitHub avishah3](https://github.com/avishah3/AI-Basketball-Shot-Detection-Tracker)
- **nitinhemaraj/Basketball-shot-detection**: also YOLOv8 for ball and hoop plus motion analysis, also claiming 97% shot and 95% score accuracy (seen only in a search snippet; it looks derived from the same approach). — [uithub mirror](https://uithub.com/nitinhemaraj/Basketball-shot-detection)
- Other repos: **chonyy/basketball-shot-detection** (marks each shot as make, miss or undetermined, plus a trajectory curve fit); **iamyb/shotcut** (cuts scoring shots into highlights, with the warning that it was trained on few courts and may fail on other courts). — [chonyy](https://www.github.com/chonyy/basketball-shot-detection); [shotcut](https://github.com/iamyb/shotcut)
- **NathanielRecto/Basketball-Shot-Tracker** is the most rigorous open evaluation found.
  - Method: YOLOv8 ball and rim, a constant-velocity tracker, and a state machine with projectile-arc fit, rim crossing, net braking and rattle handling.
  - Labelling: shots were hand-labelled blind, and dev and test sets were split.
  - Camera: fixed phone at the side with the hoop in frame, 1080×1920 at about 60 fps.
  - Public videos (103 shots): the first look scored 77.7% end-to-end (CI 69–85%), with detection precision 98.8%, recall 82.5% and make/miss accuracy 94.1% on found shots. A re-test of the frozen system scored 92.2% (85–96%). Indoor was 88.5% versus outdoor 66.7% on the first look.
  - Own iPhone 11, gym 1 (119 shots): 78.2% end-to-end, precision 98.1%, recall 86.6%, make/miss accuracy 90.3%.
  - Gym 2 (90 shots, frozen code): 85.6%, with 87 of 90 shots found and none invented. By shot type: FT 76.7%, mid-range 90%, threes 90%.
  - Main failure: from a side camera, made versus missed is inferred, not seen. Makes through the net can look like misses, and near-rim misses can look like makes. In gym 2, 8 of 13 errors were makes called "fell past the rim". Front-rim bounces also caused uncounted shots.
  - Needs the whole arc in frame and only one ball in play. Layups, bank shots and tip-ins are not specially handled.
  - A call comes about 0.45 s after the rim crossing, and up to about 2 s after rim contact.
  - The 0.970 detector mAP is inflated (test frames come from the training videos), and the dev scores of 94–95% are optimistic.
  - Source: [GitHub NathanielRecto](https://github.com/NathanielRecto/Basketball-Shot-Tracker)
- **Trinh (2025) BSc thesis** (Theseus, Finland): uses pretrained shot-event and court-keypoint models, single-view homography to map each attempt to court coordinates, and a make/miss call. It "struggled with amateur footage due to poor court-line visibility, camera motion, occlusion, and domain shift", which reduced both homography stability and event detection. Exact numbers were not retrievable (403). — [Theseus](https://www.theseus.fi/handle/10024/909540)
- 2 vs 3 points in patents (HomeCourt-style approaches):
  - One patent describes a deep network that segments the court into restricted, 2-point, 3-point and outside regions, combined with half-court identification and the shooter's foot position. — [USPTO 12472419](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12472419)
  - A mobile-app patent applies a homography to the shooter's foot location, frame by frame, with heuristics for shot type. — [USPTO 11638854](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11638854)
- **BasketballBench** (arXiv 2608.23435, NBA broadcast, 1280×720 at 25 fps) has a shot-zone classification task with 0.6935 macro F1 on 2,219 test examples. The source is broadcast, not amateur. — [arXiv 2608.23435 (search snippet)](https://arxiv.org/pdf/2608.23435); [HTML](https://arxiv.org/html/2608.23435)
- A 2021 shot-type classifier (Temporal Relational Network) reached 96.8% on 1,500 shots, but segmentation was done manually before it. — [SciTePress 2021](https://scitepress.org/PublishedPapers/2021/106502/pdf/index.html)
- **Free throws:** BGS-YOLO (PLOS ONE 2025) covers ball detection only. A Kaunas University of Technology (KTU) CEUR paper counts free throws made. — [PMC12380336](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12380336/); [CEUR Vol-3885 paper26](https://ceur-ws.org/Vol-3885/paper26.pdf)
- **TrackNet family:** TrackNetV3 adds trajectory rectification and background estimation. TrackNetV4 adds motion-attention (frame-difference) maps as a plug-in to V2 and V3. TrackNetV5 claims F1 0.9859 on the TrackNetV2 dataset. All were evaluated on tennis, badminton and table tennis, with no volleyball or basketball numbers found. An independent tennis reproduction got about 66.5% accuracy for TrackNetV2, against 85.2% reported. — [TrackNetV4](https://arxiv.org/pdf/2409.14543); [TrackNetV5](https://arxiv.org/html/2512.02789); [reproduction notes](https://hackmd.io/@XDU5dRI5RJOkP6SWYyGUQA/HkQA5OZaJg); [RacketVision](https://arxiv.org/pdf/2511.17045)

### Inferences
- Made versus missed works best when the camera sees the rim and net from about 45° above the sideline. Using one camera per hoop (two GoPros, one behind each basket) would fix the main failure, which is that a side view cannot see the ball enter the net.
- Since the scoresheet already gives the timestamp of each basket, the realistic product is verification, not detection. The software checks for a rim-crossing event within ±2–3 s of each logged basket (catching false entries), and flags confident makes with no logged point (missed entries). At about 98% detection precision and about 83–87% recall, unmatched detections are strong evidence. Unconfirmed logged points are weak evidence, because recall is lower.
- 1/2/3 value is the weakest link. The practical approach is: check that a make happened by vision, and check the value with heuristics. Free throws can be identified by game context (clock stopped, players lined up) or by the scoresheet itself. A 3-pointer needs the release location, which requires visible court lines and a stable homography.

### Gaps
- No peer-reviewed benchmark of made-shot detection on amateur full-court single-camera game footage, with 10 players and occlusion, was found. The open evaluations cover shooting sessions with one ball.
- No published accuracy for automatic 2-point versus 3-point classification from amateur video was found.
- Trinh (2025) thesis numbers could not be retrieved (403).
- No Roboflow Universe dataset or model statistics were collected for hoop and rim detection.

## Volleyball: rally segmentation and point-winner detection

### Takeaway
The best 2026 evidence, from amateur single-camera indoor volleyball, says not to read the outcome from pixels. Instead, segment the rallies and identify the serving team of the next rally: the team that serves next won the previous point in 99.96% of cases. Rally segmentation and team-of-server recognition are feasible. The ball landing and in/out call from one camera are not.

### Cited Findings
- **"Prompt, Probe, Train, or Annotate? Single-camera sports video understanding in amateur settings"** (arXiv 2609.28049, Sports Vision Inc., 2026):
  - Data: 66 amateur indoor volleyball matches, one fixed camera with no operator, 8,251 rallies and 46,648 labelled contacts.
  - Rule invariants: every rally begins with one serve in 0.9998 of rallies (8,249/8,251). The next rally is served by the team that won the last in 0.9996 (8,048/8,051).
  - Conclusion: outcomes are "best recovered from the sport's rules", not from pixels, because the ball is often too small to read outcomes directly.
  - Source: [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)
- Same paper, team and segmentation results:
  - Team assignment from the observed server position reaches the "low-to-mid nineties" on held-out matches.
  - A fixed motion threshold misclassifies about half of live versus dead time.
  - Audio onset detects attacks and blocks a little over half the time, and digs about a quarter.
  - Recommendations: use a prompted general model for play (rally) segmentation and a compact trained model for contact spotting. A trained model of about 2M parameters beats prompted frontier models at contact spotting, at about 1/100 cent per match versus "several dollars". Route low-agreement items to human review.
  - Source: [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)
- Same paper, per-match event recall versus camera: endline, 169 px player height: event recall 0.724, identity 0.608. Endline 93 px: recall 0.435. Sideline 148 px: recall 0.612, identity 0.340. Camera placement and resolution jointly determine whether footage is usable. — [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)
- **Vollytics** (MDPI Electronics 15(21):5114, 2026): a single-camera beach volleyball system using a YOLO detector, court geometry and temporal reasoning to rebuild rallies. The winner is inferred from the serving team at the start of the next rally, and results are validated against the on-screen scoreboard on full broadcast matches. Detailed metrics are not retrieved (403). — [MDPI](https://www.mdpi.com/2079-9292/15/21/5114)
- **VREN** (arXiv 2209.13846): a volleyball rally dataset that labels rally-level winning reasons and the winning team, with models that predict the rally winner from annotated actions. It does not detect winners from raw video. — [arXiv VREN](https://arxiv.org/html/2209.13846v1)
- The badminton precedent infers point winners from the serving player of the next rally (same rule). — [arXiv 1712.08714](https://arxiv.org/pdf/1712.08714)
- The Roboflow volleyball tutorial (2026) uses RF-DETR plus ByteTrack for ball tracking, and SAHI-style slicing when the ball is tiny with a high camera. — [Roboflow blog](https://blog.roboflow.com/automate-volleyball-tracking/)
- A Portuguese thesis (UFP) builds a modular volleyball pipeline (YOLO ball detection, tracking, scoreboard reading, court calibration, rally management). It names ball tracking and scoreboard recognition as still open, and frames itself as semi-automatic. — [UFP bdigital](https://bdigital.ufp.pt/bitstreams/9e2cbd9e-89d4-4191-a1bc-7a0533e97f9f/download)
- The volleyball in/out judgment patents found use multiple cameras, some on the ceiling, so not a single camera. — [USPTO 10688342](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10688342)
- **PathFinderPlus:** single-camera setting-tactic classification from setter ball trajectories. — [paperswithcode](https://astro.paperswithcode.com/paper/advanced-volleyball-stats-for-all-levels)

### Inferences
- The "next server" rule maps directly onto checking the scoresheet. Detect each serve (a dead-ball gap, then a serve at the endline) and which side serves. Every logged point must sit between two serves, and the scoring team must equal the next serving team. A mismatch flags a scoresheet error.
- Sideouts also produce visible rotations, which fits the commit "Vôlei: ponto por erro do adversário" (point from an opponent error). The rule holds whatever the reason for the point.
- Weaknesses: the last point of a set has no next serve (use the set end or the scoresheet), and a partial court view may hide the far-side server. Camera placement on the endline, raised, is preferable.
- The classic "Volleyball dataset" (Ibrahim et al., CVPR 2016, group activity recognition, broadcast) exists but is not about point winners. This is from background knowledge and was not verified this session.

### Gaps
- No exact numeric precision or recall for automatic rally segmentation in 2609.28049 (the numbers are in figures that were not extracted).
- No single-camera ball landing or in/out estimation for indoor volleyball was found.
- Referee hand signals as a point-winner cue: no paper found.

## Futsal/handball goals and generic action spotting transfer

### Takeaway
Goal detection for futsal and handball from one amateur camera is under-researched. The available work is ball-and-goal YOLO detection (ball position versus goalpost) and single-camera production systems. Generic action spotting (SoccerNet) is mature, but trained on broadcast. Transfer to fixed amateur cameras is unproven and probably needs fine-tuning.

### Cited Findings
- A University of Ljubljana thesis detects ball and goal in handball footage as a basis for match analysis. A related paper (YOLOv2/v3, Faster R-CNN) identifies a scoring goal by comparing the ball position with the goalpost location in the image. — [repozitorij.uni-lj.si](https://repozitorij.uni-lj.si/IzpisGradiva.php?id=159391); [J. Imaging 9(80)](https://www.bib.irb.hr:8443/1275434/download/1275434.jimaging-09-00080.pdf)
- **ISVP.AI** (2023): single-camera automated production for handball and futsal for small clubs. YOLO detects players and ball, and the camera sits mid-field behind the line. — [SciTePress 2023](https://www.scitepress.org/Papers/2023/121593/121593.pdf)
- Single-camera handball analytics (Host et al. 2023: player detection, tracking and action recognition; a 2026 monocular homography pipeline) focus on player actions, not goals. — [PMC10144022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10144022/); [MDPI BDCC 10(4):118](https://www.mdpi.com/2504-2289/10/4/118)
- **SoccerNet 2024 ball action spotting:** the winner T-DEED scored 73.39 mAP@1 and 77.25 tight avg-mAP. **SoccerNet 2025 team ball action spotting:** the best entry scored 60.03 Team-mAP@1, beating the T-DEED baseline by 8.31. — [SoccerNet 2024 results](https://arxiv.org/pdf/2409.10587); [SoccerNet 2025 results](https://arxiv.org/html/2508.19182v1)
- ASTRA scored 70.21 tight avg-mAP on the 2023 challenge set. — [ASTRA](https://arxiv.org/html/2404.01891v1)
- There is a 2026 paper on whether event detectors trained on broadcast transfer off the broadcast camera (tennis). Its text could not be extracted, so no numbers. — [arXiv 2610.38042](https://arxiv.org/pdf/2610.38042)

### Inferences
- With a fixed camera aimed at one goal, a simple ball-in-goal-region heuristic (YOLO ball plus a hand-drawn goal polygon, with a few frames of persistence) is plausible. Its weaknesses are goalkeeper occlusion, the ball hitting the net from outside, and a futsal ball moving at 100+ km/h, causing blur at 30 fps.
- A wide mid-court camera makes goal mouths small and often occluded. A camera behind or above each goal would change feasibility.
- As with basketball, "event near the logged timestamp" verification is much easier than blind detection. Possession restarting from the centre is also a strong rule-based cue that a goal happened (the analogue of volleyball's next server).

### Gaps
- No futsal-specific goal detection study, and no per-class "goal" mAP from SoccerNet 2024/2025, were found.
- No transfer numbers from broadcast to amateur were found (the 2610.38042 text was not readable).

## Alternative signals: scoreboard OCR, audio (whistle, crowd), referee gestures

### Takeaway
Scoreboard reading is the most reliable automatic signal when a scoreboard is visible: frontier VLMs read broadcast scorebugs at 92–94% exact match. Physical gym scoreboards filmed by a phone are untested. Audio (whistles) is a useful secondary cue for rally and play boundaries, but not standalone for scoring. Referee gesture recognition for scoring had no usable literature.

### Cited Findings
- BasketballBench scorebug reading (exact match, broadcast): Gemini 3.5 Flash 94.0, GPT-5.4 93.5, Claude Sonnet 5 92.5, Qwen3.5-4B 77.5, Qwen2.5-VL-7B 75.5, InternVL3.5-8B 66.0. — [arXiv 2608.23435](https://arxiv.org/html/2608.23435)
- SmartTennisTV segments rallies, then uses OCR on the broadcast scorecard to index points. — [arXiv 1801.01430](https://arxiv.org/pdf/1801.01430)
- In amateur volleyball, audio onset energy detects hard contacts only about half the time, and a single threshold does not work across action types. — [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)
- Hockey play segmentation (CVPRW 2021) uses the referee whistle as a supplementary cue for play start and stop, with whistles averaging 0.73 s long. — [CVPRW 2021 Pidaparthy](https://openaccess.thecvf.com/content/CVPR2021W/CVSports/papers/Pidaparthy_Automatic_Play_Segmentation_of_Hockey_Videos_CVPRW_2021_paper.pdf)
- Whistle detection with FFT and MFCC features is reported at 98% accuracy in a secondhand citation (Backer et al. 2014), with no live results. — [UvA BSc thesis](https://staff.fnwi.uva.nl/a.visser/education/bachelorAI/daniel_vermaas_thesis_bsc.pdf)
- Early soccer audio work found crowd noise and announcements were mislabelled as cheering, causing false events. Whistle-like sounds need their own class. — [Glasgow CVPR 2004](https://www.dcs.gla.ac.uk/~jj/publications/conference/2004/bailliem_m_cvpr04.pdf)
- Spectator whistles, horns and vuvuzelas confuse referee-whistle detectors, and video context helps. — [arXiv 1411.6496](https://arxiv.org/pdf/1411.6496)

### Inferences
- In amateur Brazilian gyms, a visible electronic scoreboard, even in part of the frame, could give near-ground-truth checks. Sample one frame per second, OCR or VLM-read the digits, and diff against the scoresheet. Crop the scoreboard region once per camera.
- Many amateur games have a manual flip scoreboard or none at all.
- Whistle detection could help align rally ends in volleyball. In gyms, echo, multiple courts and spectator whistles will cause false positives.

### Gaps
- No benchmark of OCR or VLM reading of physical gym scoreboards (LED, glare, distance) from phone video was found.
- No referee-gesture recognition papers for point attribution in volleyball, basketball or handball were found.

## Multimodal LLMs on video (Gemini, GPT, Claude, Qwen) for counting points or describing plays

### Takeaway
As of 2026, frontier video LLMs are good at reading static text (scorebugs, about 93%). They are poor at fine-grained temporal event detection and counting: in BasketballBench they reach about 27–30 full-event F1 on broadcast, and in amateur volleyball they find about a quarter of events in one pass. They are not reliable as standalone point counters. They may be useful as a second opinion on short clips around each logged point, with dense frame sampling.

### Cited Findings
- **BasketballBench** (2026, NBA broadcast, 2,501 possession clips) play-event QA, full-event F1: GPT-5.4 29.8, Gemini 3.5 Flash 27.0, Claude Sonnet 5 14.3, Qwen3.5-9B 10.4, Qwen2.5-VL-7B 1.6. Event-type-only F1 is higher: GPT-5.4 59.6, Gemini 51.8. The tool-composing agent BasketballSkills reaches 45.9 full-event F1. — [arXiv 2608.23435](https://arxiv.org/html/2608.23435)
- BasketballBench temporal localization (Acc@1s, macro): GPT-5.4 77.5, Gemini 3.5 Flash 63.2, Claude Sonnet 5 51.3, Qwen3.5-4B 48.4. Official play-by-play timestamps lag visible events by 1–2 s. — [arXiv 2608.23435](https://arxiv.org/html/2608.23435)
- Amateur volleyball: a single-pass prompted VLM finds "about a quarter" of true events, rising to "a little under half" with agentic reasoning (a reasoning-enabled Gemini).
  - Frame sampling: on a 13.33 s rally with 7 contacts, gemini-3.5-flash at 1 fps found 0 contacts. At 3 fps it found 10 (over-counting), with timestamps drifting about 1 s.
  - Self-reported confidence was useless for abstention, while agreement across independent passes worked.
  - Source: [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)
- Same paper, jersey identity accuracy across nine commercial readers: 0.46–0.59 (e.g., gemini-3.5-flash 0.585 at $1.14, gpt-5.2 0.585 at $0.66). Most cost is not best accuracy. — [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)
- **MINERVA:** basketball is one of the harder domains. The best model (Gemini 2.5 Pro Thinking) scores 66.2% overall versus 92.5% for humans. — [MINERVA arXiv 2505.00681](https://arxiv.org/pdf/2505.00681)
- **BARD** basketball action recognition: Gemini 2.5 perfect-video accuracy is only about 0.12–0.19. — [ScienceDirect BARD](https://www.sciencedirect.com/science/article/pii/S1077314226000809)
- Tennis: VideoLLaMA2 is poor at counting the number of events without guidance. — [arXiv 2507.02904](https://arxiv.org/pdf/2507.02904)
- General temporal benchmarks cited in 2609.28049: TOMATO 37.9% (model) versus 95.2% (human), TemporalBench 38.5%. — [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)

### Inferences
- For checking the scoresheet, ask the VLM a narrow question about a short clip, such as "did the ball go through the hoop in this 6 s clip?" or "which side served next?". Avoid open-ended counting over a full game.
- Sample at ≥3–5 fps, run 2–3 independent passes, and use agreement as the confidence signal.
- Cost: a few dollars per match for frontier prompting, versus near-zero for small trained models.
- No Twelve Labs-specific sports counting benchmark was found.

### Gaps
- No public benchmark of VLM point-counting on amateur basketball or futsal.
- No Twelve Labs (Marengo/Pegasus) sports accuracy reports were found.
- Gemini 3.x Pro or GPT-5.x results on made-basket yes/no clips were not found.

## Reported precision/recall and main failure modes (cross-cutting)

### Takeaway
Realistic single-camera numbers: basketball shot detection precision about 98% and recall 83–87%, with make/miss accuracy 90–94% on found shots and 78–92% end-to-end. Volleyball point winner via the next-server rule is about 99.96% if serves and sides are detected (team assignment about 92–95%). VLM event F1 is about 27–30 on broadcast. Lab and broadcast numbers (SoccerNet mAP 73–77, TrackNetV5 F1 0.986, "97%" READMEs) overstate amateur performance.

### Cited Findings
- **Basketball, single phone:**
  - Precision and recall: 98.8/82.5 on public videos, 98.1/86.6 on own gym footage.
  - Indoor 88.5% versus outdoor 66.7% (first look).
  - Failure modes: make versus miss is not visible from the side, front-rim bounces, the arc must stay in frame, and one ball only.
  - Source: [NathanielRecto](https://github.com/NathanielRecto/Basketball-Shot-Tracker)
- **Homography and court location:** these fail on amateur footage because of poor court-line visibility, camera motion, occlusion and domain shift. — [Theseus thesis](https://www.theseus.fi/handle/10024/909540)
- **Volleyball, amateur:**
  - Event recall varies 0.435–0.755 per match depending on camera axis and player pixel height.
  - Jersey digits are below about 20 px and unreliable.
  - Occlusion produced 13 overlapping tracks in one frame.
  - Chained pipeline stages compound errors.
  - Source: [arXiv 2609.28049](https://arxiv.org/html/2609.28049v1)
- **Ball tracking:** reproducing TrackNetV2 on tennis gave 66.5% versus 85.2% claimed. Small, fast balls are the core difficulty, which motivates the motion-attention maps of V4 and V5. — [hackmd reproduction](https://hackmd.io/@XDU5dRI5RJOkP6SWYyGUQA/HkQA5OZaJg); [TrackNetV4](https://arxiv.org/pdf/2409.14543)
- A high camera makes the ball tiny. Tiling or SAHI slicing helps. — [Roboflow](https://blog.roboflow.com/automate-volleyball-tracking/)
- Detectors trained on few courts generalize poorly to new courts. — [shotcut](https://github.com/iamyb/shotcut)

### Inferences
- With a scoresheet synced to ±0.1 s, the problem becomes anomaly detection, not detection:
  - Basketball: a rim-crossing event or a VLM yes/no near each logged basket.
  - Volleyball: next-server-side consistency.
  - Futsal/handball: a ball-in-goal-region event or a kickoff/throw-off restart near each logged goal.
  - Any scoreboard: OCR diffs.
- This approach tolerates the roughly 10–20% recall loss, because it only flags disagreements for human review.
- Fully automatic scoring without a scoresheet is not realistic in 2026 for amateur single-camera multi-sport footage. The exception is shooting-practice-style basketball, or volleyball rally and winner logging with a good endline camera.
- Main levers under the user's control: camera placement (endline or behind the hoop, raised), 60 fps for blur, a resolution keeping players above about 120–150 px, and keeping the hoop or goal and the serving zones in frame.

### Gaps
- No standardized benchmark across amateur court sports. Most amateur numbers come from one 2026 volleyball preprint and one GitHub project, with small samples and wide confidence intervals (±8–10 points).
- Low-light gym performance has not been quantified separately in any source found.
