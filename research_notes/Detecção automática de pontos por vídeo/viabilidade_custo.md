# Feasibility and cost of automatic scoring-event detection from amateur court-sports video (as of Nov 2026)

Scope: a one-person Python + ffmpeg pipeline on a Windows 11 PC (GPU unknown), 1–2 videos per game, 40–90 min, 1080p/4K phone/GoPro, already synced to a timestamped manual scoresheet. Researched 2026-11-26. BRL figures assume roughly R$5.5 per US$1. That rate is an unverified assumption, so recheck it.

## Local inference on Windows (YOLO / RT-DETR / ONNX Runtime / OpenVINO): speed, processing time, install

### Takeaway
On a recent Intel laptop, a small YOLO model through OpenVINO runs at about 3–35 ms per frame at the default ~640 px input. With frame skipping (5–10 fps sampled), a 60-minute game takes roughly 3–15 minutes to process without an NVIDIA GPU. Decoding the 4K video, not the neural net, is likely the bottleneck. Install is a single `pip install` for OpenVINO. DirectML still works but is now in "sustained engineering" and is no longer the recommended path.

### Cited Findings
- Ultralytics' OpenVINO page (current model family: YOLO26) gives FP32 latency per image. **Core Ultra 7 155H** (Meteor Lake, no NPU): YOLO26n 33.19 ms PyTorch CPU, 13.43 ms OpenVINO CPU, 9.13 ms OpenVINO iGPU; YOLO26s 70.92 / 36.16 / 16.37 ms; YOLO26m 192.45 / 102.52 / 34.47 ms. — [Ultralytics OpenVINO integration](https://docs.ultralytics.com/integrations/openvino/)
- Same page. **Core Ultra 7 258V** (Lunar Lake): YOLO26n 27.33 ms PyTorch CPU, 16.84 ms OpenVINO CPU, 3.33 ms OpenVINO Arc iGPU, 23.71 ms NPU; YOLO26m 152.87 ms PyTorch CPU, 9.03 ms iGPU. **Core Ultra X7 358H**: YOLO26n iGPU 4.09 ms, YOLO26m iGPU 7.10 ms, YOLO26m INT8 on iGPU 5.61 ms, INT8 on CPU 33.33 ms. — [Ultralytics OpenVINO integration](https://docs.ultralytics.com/integrations/openvino/)
- On the 258V, OpenVINO CPU FP32 was slower than PyTorch for YOLO26m (178.59 vs 152.87 ms). FP16 was within 5% of FP32. Accuracy was essentially unchanged (YOLO26n mAP50-95 0.4765 PyTorch vs 0.4762 iGPU FP32). The page does not state the image size; it uses benchmark mode on COCO128, so 640 px is likely but unconfirmed. — [Ultralytics OpenVINO integration](https://docs.ultralytics.com/integrations/openvino/)
- On the YOLO26 NPU: "runs on the NPU only in Core Ultra 2xxV, 3xx, and newer". — [Ultralytics OpenVINO integration](https://docs.ultralytics.com/integrations/openvino/)
- Install: `pip install "ultralytics[export-openvino]"` (needs PyTorch ≥2.1, OpenVINO ≥2024.0, NNCF ≥2.14 for INT8). Install the Intel GPU/NPU driver for iGPU/NPU use. Then export with `YOLO("yolo26n.pt").export(format="openvino")` and run with `device="cpu"|"xpu"|"npu"`. On Windows, Ultralytics forces CPU precision to FP32. — [Ultralytics OpenVINO integration](https://docs.ultralytics.com/integrations/openvino/)
- NVIDIA reference point: Ultralytics cites YOLO11s at about 2.5 ms per image with TensorRT on a T4 and claims up to 5x GPU speedup from TensorRT. No authoritative RTX 3060/4060 at 1080p benchmark was found. One unverified project page reports ~300 FPS (0.57 ms GPU inference) on an RTX 3060 Laptop GPU without stating the model or input size. — [Ultralytics TensorRT blog](https://www.ultralytics.com/blog/optimizing-ultralytics-yolo-models-with-the-tensorrt-integration); [Ultralytics community thread](https://community.ultralytics.com/t/how-is-the-up-to-5x-speedup-with-tensorrt-achived/1432); [brecaspian project page (unverified)](https://brecaspian.github.io/BreCaspian/github-io-homepage/projects/trtinferx.html)
- DirectML is in "sustained engineering" (the repo shows a maintenance warning). New feature work goes to **Windows ML**, which ships its own ONNX Runtime (ORT 1.24.5 in the Windows ML 2.0.300 release dated 2026-04-28) with OpenVINO, NvTensorRtRtx, QNN and CPU EPs. DirectML is listed as legacy. No end-of-life date was found. — [ONNX Runtime PR #25901](https://app.semanticdiff.com/gh/microsoft/onnxruntime/pull/25901/overview); [Windows ML supported EPs](https://learn.microsoft.com/en-in/windows/ai/new-windows-ml/supported-execution-providers); [Windows ML ONNX versions](https://learn.microsoft.com/en-in/windows/ai/new-windows-ml/onnx-versions); [Windows ML GA blog, 2025-09-23](https://blogs.windows.com/windowsdeveloper/2025/09/23/windows-ml-is-generally-available-empowering-developers-to-scale-local-ai-across-windows-devices)
- RF-DETR, Roboflow's Apache-2.0 detector, is what Roboflow's 2025–2026 sports tutorials (basketball, volleyball) use instead of YOLO. — [Roboflow basketball players blog](https://blog.roboflow.com/identify-basketball-players/); [Roboflow volleyball tracking blog, 2026-05-07](https://roboflow.com/blog/automate-volleyball-tracking)

### Inferences
- Frame budget: 60 min at 30 fps is 108,000 frames. Sampling 10 fps gives 36,000 frames, and 5 fps gives 18,000.
  - Intel laptop CPU via OpenVINO, YOLO26n (~13–17 ms): 36k frames come to about 8–10 min of pure inference. YOLO26s (~36–55 ms) comes to about 22–33 min.
  - Intel Arc iGPU (3–9 ms): about 2–6 min for 36k frames.
  - NVIDIA RTX with TensorRT (~1–3 ms): under 2 min. Here decoding dominates.
  - Older CPU-only machine with PyTorch (~30–70 ms): about 18–40 min for 36k frames. That is still usable as an overnight batch job.
- A basketball or volleyball seen from a phone at the side of the court is a small object. Running at 960–1280 px input (or tiling/SAHI, which Roboflow suggests for small balls) costs roughly 2–4x the 640 px latency. This is my estimate, not benchmarked.
- Decoding 4K HEVC from a GoPro or phone on the CPU can be slower than inference. Use ffmpeg with hardware decode (`-hwaccel d3d11va`/`qsv`/`cuda`) and downscale to 720p–1080p before feeding the model. The pipeline already uses ffmpeg, so this fits.
- Recommended stack for an unknown Windows PC: Ultralytics + OpenVINO on Intel (CPU/iGPU/NPU), CUDA/TensorRT on NVIDIA. Fall back to ONNX Runtime (CPU, or DirectML/Windows ML) on AMD. All are pip-installable. No Docker or WSL is needed.

### Gaps
- No authoritative 2026 benchmark for YOLO11/YOLO26 on consumer RTX (3060/4060/5060) at 1080p, and none for AMD iGPU or DirectML. Benchmark on the actual PC with `yolo benchmark`.
- Image size for the Ultralytics Intel tables is not stated.
- No measured numbers for ffmpeg 4K decode throughput on typical laptops.

## Custom training data: labeling effort, dataset size, pretrained models

### Takeaway
Pretrained detectors and Roboflow Universe datasets exist for basketball (ball, rim, players) and volleyball (ball). A gym-specific fine-tune is still advisable. Ultralytics' generic guidance (≥1,500 images per class) is far more than a hobby ball/hoop detector needs in practice. Roboflow's own sports demos fine-tune on modest Universe datasets with very high reported accuracy.

### Cited Findings
- Ultralytics recommends at least 1,500 images per class and at least 10,000 labeled instances per class, with 0–10% background images. Every instance must be labeled, boxes must be tight, and the data should vary by lighting, angle and camera. — [Ultralytics tips for best training results](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- Roboflow's volleyball tutorial (2026-05-07) fine-tuned RF-DETR Small on a fork of the Universe project "volleyball-analysis-4ib8q". It used a 70/20/10 split at 512×512 and detects only the ball. Reported test results: mAP@50 99.0%, precision 100%, recall 97.8%, 3 false negatives. It does not detect rallies or points. The image count is not stated. — [Roboflow volleyball tracking](https://roboflow.com/blog/automate-volleyball-tracking)
- Roboflow's basketball tutorial (2025-09-30, Piotr Skalski) fine-tuned RF-DETR on a 10-class dataset including ball, player, referee and rim, combined with SAM2 tracking and SigLIP team clustering. It says the model was trained free on Roboflow, or can be trained locally or in Colab. — [Roboflow: detect, track, identify basketball players](https://blog.roboflow.com/identify-basketball-players/)
- Roboflow's "AI basketball shot evaluator" (Aug 2026) uses RF-DETR for ball and rim plus an RF-DETR keypoint model for shooter pose. — [Roboflow shot evaluator](https://blog.roboflow.com/how-to-build-an-ai-basketball-shot-evaluator/)
- Universe has public basketball models such as "basketball-detection-cjjxp" and "NBA eye". — [Roboflow Universe basketball-detection](https://universe.roboflow.com/tomas-34ray/basketball-detection-cjjxp); [Roboflow Universe NBA eye](https://universe.roboflow.com/fendog/nba-eye-wyyt4)

### Inferences
- For one gym and fixed camera positions, a practical start is fine-tuning a pretrained ball+rim (basketball) or ball (volleyball/futsal) model on about 200–500 frames sampled from 3–5 of the user's own games. Add more for failures, such as balls hidden by the net or motion blur. I have no source for this figure. Roboflow and CVAT label-assist/auto-label make boxing a frame take seconds, so a few hours of labeling per sport is plausible.
- Hoops and nets are static in fixed-camera footage. They can be marked once per video, by hand or by a single detection, instead of detected every frame. That cuts the labeling to the ball only.
- Futsal goal detection (ball crossing the goal line) is harder than basketball rim crossings. The ball is often occluded by the goalkeeper and players, and phone cameras at the side rarely see the goal mouth clearly.

### Gaps
- No pretrained futsal or indoor-soccer model was verified on Universe in this session.
- No source gives labeling hours for a gym-specific ball detector. The numbers above are estimates.
- The dataset size behind Roboflow's volleyball/basketball demos was not found.

## Cloud options and prices (Gemini, OpenAI, Twelve Labs, AWS, Google Video Intelligence), latency, privacy

### Takeaway
Gemini is the only major LLM API with native video input and fine-grained control (clip offsets, custom fps). A full 60-minute game at default resolution is about 360k tokens, which costs roughly US$0.10–0.30 per game on Flash/Flash-Lite and about US$1.50 on Pro. Twelve Labs costs about US$1.3–1.8 per hour analyzed, plus indexing. AWS Rekognition's generic labels cost US$6 per hour and cannot recognize "a point was scored". OpenAI's API still has no native video input, so frames must be sent as images. Privacy favors the paid tiers: free-tier Gemini content is used to improve Google's products.

### Cited Findings
- **Gemini video tokenization:** about 100 tokens/s at the default (low) media resolution (66 tokens per frame at 1 fps + 32 tokens/s audio + metadata), and about 300 tokens/s at high resolution. Models with 1M context handle up to 3 h at low resolution or 1 h at high. Default sampling is 1 fps, and a custom `fps` can be set (>0 to 24). `start_offset`/`end_offset` clip intervals let one request analyze only a window, e.g. "1200s". File API limit is 20 GB on paid and 2 GB on free. — [Gemini video understanding docs](https://aistudio.google.com/docs/video-understanding)
- **Gemini prices** (USD per 1M tokens, paid tier, page snapshot Nov 2026, undated):
  - Gemini 3.5 Flash-Lite: $0.30 input / $2.50 output (batch $0.15 / $1.25).
  - Gemini 3.1 Flash-Lite: $0.25 / $1.50.
  - Gemini 2.5 Flash-Lite: $0.10 / $0.40.
  - Gemini 3.8 Flash: $0.75 / $3.75 until 2026-12-31, rising to $1.50 / $7.50 from 2027-01-01 (batch $0.375 / $1.875).
  - Gemini 3.1 Pro Preview: $2.00 / $12.00 (≤200k), $4.00 / $18.00 (>200k).
  - Batch API is 50% off.
  - 2.5 Pro and 2.5 Flash are deprecated and route to newer models on 2026-12-01.
  - — [Gemini API pricing](https://aistudio.google.com/docs/pricing)
- **Gemini data use:** the pricing page says free-tier content is used to improve Google products and paid-tier content is not. — [Gemini API pricing](https://aistudio.google.com/docs/pricing)
- **OpenAI:** the official cookbook says direct video sending is not possible through the API. Frames must be sampled and sent as images (GPT-4o / GPT-4.1-mini examples). A January 2026 forum thread and an openai-node GitHub issue confirm there is still no native video file input in the Responses API. — [OpenAI cookbook: GPT-4.1-mini video](https://developers.openai.com/cookbook/examples/gpt_with_vision_for_video_understanding); [openai-node issue #1778](https://github.com/openai/openai-node/issues/1778); [OpenAI community thread, Jan 2026](https://community.openai.com/t/workaround-for-video-analysis-question-about-getting-native-video-upload-access/1369186/2)
- **Twelve Labs:** subscription plans are Free $0 (3 GB), Plus $29/mo, Pro $99/mo and Enterprise custom. New pricing takes effect 2027-01-04. The models are Marengo 3.0 (embeddings) and Pegasus (video LLM). — [Twelve Labs pricing](https://www.twelvelabs.io/pricing)
- **Twelve Labs per-minute meters:** these could not be confirmed from an official rate card, and sources conflict. Pegasus analysis is $0.0292/min input + $0.0075 per 1k output tokens according to usagepricing.com, but $0.021/min according to the Twelve Labs calculator and toolradar. Indexing is about $0.042/min according to toolradar, while an older official page shows $0.033/min for Marengo. The free tier is 600 indexing minutes. — [usagepricing.com](https://usagepricing.com/blueprint/twelve-labs); [Twelve Labs pricing calculator](https://www.twelvelabs.io/pricing-calculator-2); [toolradar](https://toolradar.com/tools/twelvelabs/pricing); [Twelve Labs pricing-2](https://www.twelvelabs.io/pricing-2)
- **AWS Rekognition Video** (stored video, us-east-1): label detection $0.10/min, shot/segment detection $0.05/min, content moderation $0.10/min. Free tier is 60 min/month for 12 months. Custom Labels costs $4 per inference hour and $1 per training hour, and works on images, not on video. — [AWS Rekognition pricing](https://aws.amazon.com/rekognition/pricing/)

### Inferences (cost per game, computed from the cited rates)
- **Full 60-min game, Gemini default resolution:** 3,600 s × ~100 tok/s ≈ 360k input tokens.
  - 3.5 Flash-Lite ≈ $0.11 (R$0.60).
  - 3.8 Flash ≈ $0.27 (2026) / $0.54 (2027). Batch halves this.
  - 3.1 Pro ≈ $1.44 (>200k tier).
  - Output (a JSON list of events, a few thousand tokens) adds cents.
  - A 90-min game is ×1.5.
  - At 1 fps, a basketball make or a volleyball ball-landing can fall between sampled frames, so detection from scratch needs higher fps. That raises the cost roughly linearly with fps.
- **Twelve Labs:** 60 min × $0.021–0.0292 is about $1.3–1.8 for analysis, plus about $2–2.5 if indexing is also billed. That is roughly 5–15x Gemini Flash-Lite.
- **AWS Rekognition:** 60 min of label detection is $6. Generic labels ("Basketball", "Sport") do not mark scoring events, so it is not useful here. It could only help find active play versus dead time.
- **OpenAI:** you would extract frames with ffmpeg and send them as images. The cost depends on frames × image tokens. It is workable for verification windows but awkward for a full game.
- **Latency:** uploading a 4K 60-min file (several GB) is limited by home upload bandwidth. Downscaling to 720p first with ffmpeg cuts upload size and does not change Gemini's token count, because tokens are counted per frame regardless of resolution at a given media-resolution setting.
- **Privacy:** these are amateur, often minor, athletes. Use only paid-tier APIs, whose content is not used for training per Google's page. Downscale, keep retention short, and get consent from the league or parents. Local inference avoids the issue entirely.

### Gaps
- The Google Video Intelligence API pricing page did not render, so its prices are not verified. Like Rekognition, it offers only generic labels and would not detect scores.
- Gemini File API retention and the processing latency for long videos were not stated on the fetched page.
- No official Twelve Labs per-minute rate card was confirmed. The new pricing takes effect 2027-01-04.
- The Gemini model names and prices come from the live page snapshot (Nov 2026). Prices change on 2026-12-01 and 2027-01-01.

## Verification design: check ±10 s windows around manual timestamps instead of detecting from scratch

### Takeaway
Verifying the existing scoresheet is far cheaper and more reliable than open-ended detection. Every candidate window is already known, so you only need a yes/no or which-team answer per window, plus a coarse scan of the gaps for missed points. It processes roughly 20–35% of the video at high temporal density instead of 100%. Gemini's clip offsets and custom fps are built for this pattern.

### Cited Findings
- Gemini supports per-request `start_offset`/`end_offset` clipping and custom `fps` up to 24. You can send many short windows of one uploaded file at higher fps. — [Gemini video understanding docs](https://aistudio.google.com/docs/video-understanding)
- Hobby basketball shot counters (two-class YOLO ball+hoop, ball trajectory fitted by linear regression, a "make" registered when the path intersects the hoop) are exactly the kind of local check a window verifier needs. — [nitinhemaraj/Basketball-shot-detection](https://uithub.com/nitinhemaraj/Basketball-shot-detection); [chonyy/AI-basketball-analysis](https://www.Github.com/chonyy/AI-basketball-analysis)
- Rally/non-rally frame classification is the standard way to segment points in net/racket sports. For badminton, 23,156 frames were annotated (8,009 rally). For table tennis, rally-detection F1 improved from 0.79 to 0.89 with player-level features. — [Badminton broadcast paper](https://arxiv.org/pdf/2308.12199); [Unsupervised event detection, arXiv 2002.08097](https://arxiv.org/pdf/2002.08097v1.pdf)
- VNL-STES split full volleyball matches into rally clips using court keypoint detection. — [VNL-STES project page](https://hoangqnguyen.github.io/stes)

### Inferences
- **Token math (Gemini):** 60 points × 20 s windows = 1,200 s.
  - At 1 fps: ≈120k tokens, about $0.04 (Flash-Lite) or $0.09 (3.8 Flash).
  - At 5 fps: (5 × 66 + 32) ≈ 362 tok/s × 1,200 s ≈ 435k tokens, about $0.13 (Flash-Lite) or $0.33 (3.8 Flash).
  - Basketball has more scoring events, about 80–150 per game. At 5 fps, Flash would cost about $0.45–0.80 per game.
  - These are still well under US$1 per game (≈R$5) for Flash-class models.
- **Gap scan for missed points:** run 0.5–1 fps over the stretches between consecutive timestamps, asking whether there was any score or a rally end. That adds at most the full-video cost (≈$0.11–0.27 per 60 min) and is often skipped.
- **Accuracy advantage:**
  - The prior is strong (a point is very likely in the window), and the model only has to confirm the event or flag an anomaly.
  - Local verification is also simpler. A ball-through-rim check in a 20 s window, or "did the ball touch the floor / did the rally stop" for volleyball, is a constrained problem compared with scanning 90 min.
- **Local verification compute:** 20 s windows × 60 points × 10–15 fps ≈ 12k–18k frames. That is about 1–5 min on an Intel CPU or iGPU with YOLO26n (from the latencies above), versus 3–15+ min for a full scan.
- **Most likely failure modes:**
  - Timestamps offset by more than 10 s.
  - Free throws or and-ones (basketball), where the scoring counts per point differ.
  - Volleyball points won by opponent errors (the repo's recent "ponto por erro do adversário" work), where no visible "scoring action" exists other than the rally ending.

### Gaps
- No published accuracy figures for LLM (Gemini) yes/no verification of sports events in short windows were found. This needs a small pilot on the user's own games.

## Realistic accuracy, human time saved, and hobby/indie examples

### Takeaway
Ball detection itself is mature (Roboflow reports ~98–99% on curated test sets). Detecting scoring events end-to-end in amateur footage is not off-the-shelf: research and hobby projects report rally/event F1 around 0.8–0.9 in constrained settings. The realistic goal for this system is flag-for-review verification, not unattended scoring. The human time saved is mostly in checking a sheet against video, not in creating it.

### Cited Findings
- Roboflow volleyball ball detector: mAP@50 99.0%, recall 97.8% on its test set. It detects the ball only, not points. — [Roboflow volleyball tracking](https://roboflow.com/blog/automate-volleyball-tracking)
- Table tennis rally detection F1 rose from 0.79 to 0.89 with player-level features. — [arXiv 2002.08097](https://arxiv.org/pdf/2002.08097v1.pdf)
- RallyClip (tennis, GitHub) extracts points from full matches. The author notes it confuses service motions with point starts and that a dedicated rally model is still planned. — [RallyClip](https://iroblesrazzaq.github.io/RallyClip/)
- Hobby basketball shot-detection repos (nitinhemaraj, chonyy, anishcd, Esedicol/BABPD) count makes and misses with YOLO ball+hoop detection plus trajectory logic. The Instructables "SmartShot" Raspberry Pi hoop recognizes goals, rim hits, backboard hits and misses. A LinkedIn hobby project claims 98%+ accuracy for workout shot tracking, which is self-reported and unverified. — [nitinhemaraj](https://uithub.com/nitinhemaraj/Basketball-shot-detection); [chonyy/basketball-shot-detection](https://www.github.com/chonyy/basketball-shot-detection); [anishcd](https://github.com/anishcd/basketball-shot-detection); [Esedicol BABPD](https://github.com/Esedicol/BasketballPlayerDetectection-BABPD); [SmartShot Instructables](https://www.instructables.com/SmartShot-Computer-Vision-Powered-Basketball-Hoop); [LinkedIn (self-reported)](https://tr.linkedin.com/in/yarkint)
- There is academic work on counting basketball shot attempts (Theseus PoC thesis, Stanford CS231n 2024 report). — [Theseus PoC](https://www.theseus.fi/handle/10024/909540); [CS231n 2024](https://cs231n.stanford.edu/2024/papers/basketball-detection-from-images-to-videos.pdf)

### Inferences
- **Expected performance** (estimates; validate on a pilot):
  - **Basketball, fixed side camera, verification of known timestamps:** high reliability for field goals with a visible ball-in-rim. Free throws and occluded rims will produce flags.
  - **Volleyball:** "rally ended" is detectable (ball on floor, players stop, a court-state change), but the winning team is harder to tell. Use the score progression on the sheet as the label and the video only to confirm a rally ended near the timestamp.
  - **Futsal:** goals are rare (a handful per game), so verification by a human watching the 15 s clips is already cheap. Automation adds little here.
- **Human time saved:** today the user must watch each clip, or the whole game, to confirm the scoresheet. A verifier that flags only mismatches (an estimated 5–15% of windows) turns "watch 60–150 clips" into "watch about 5–20 flagged clips". This is an estimate, not a measured figure.
- **Incremental roadmap** (my synthesis):
  0. **Measure before building.** Run `yolo benchmark` / OpenVINO on the actual PC and time ffmpeg hardware decode at 720p.
  1. **Cloud pilot (lowest effort, about 1 day of work).** Send each ±10 s window, as a clip offset of the uploaded file at 3–5 fps, to Gemini Flash or Flash-Lite on the paid tier. Ask for a JSON answer: {event_seen, team/side, confidence, offset}. Cost: under US$1 per game. Compare its answers against 3–5 already-verified games to measure precision and recall.
  2. **Gap scan.** Run a 0.5–1 fps Gemini pass on the stretches between timestamps to catch missed points. Cost: about US$0.1–0.3 per hour.
  3. **Local, sport-specific checks for basketball.** Fine-tune a Universe ball+rim RF-DETR/YOLO model on a few hundred frames of the user's gym, then apply trajectory-through-rim logic in each window. This is free per game and private.
  4. **Volleyball.** Train a rally/non-rally classifier, or use ball-height and ball-presence heuristics from a ball detector. Use it to align or check timestamps.
  5. **Only after that:** consider fully automatic detection, with the manual sheet kept as ground truth for training.

### Gaps
- No measured end-to-end point-detection accuracy on amateur, phone-shot indoor futsal, basketball or volleyball footage was found.
- No hobby project was found doing exactly "verify a manual scoresheet against video".
- No YouTube demos were examined in this session.
