# Candidate model and licensing inventory — review required
This is not legal approval. Confirm exact code, model-weight, checkpoint, dataset, dependency and commercial-output terms at implementation time.

| Candidate | Function | Preliminary license/risk | Decision |
|---|---|---|---|
| MuseTalk | Lip synchronization | Public project advertises MIT; verify pretrained weights and bundled dependencies individually | Prototype candidate only |
| LivePortrait | Portrait animation | Repository code and model dependencies differ; InsightFace pretrained components may be noncommercial | BLOCK until commercially usable detection stack is substituted and verified |
| Chatterbox TTS | Consented voice synthesis | MIT project reported; confirm model checkpoint terms and maintenance status | Prototype candidate only |
| Coqui XTTS v2 | Voice synthesis alternative | Coqui Public Model License has usage restrictions; not equivalent to unrestricted MIT | Do not select without legal review |
| F5-TTS pretrained weights | Voice synthesis alternative | Common pretrained weights CC BY-NC | REJECT for commercial release absent alternate licensed weights |
| Remotion | Video assembly | Check Remotion's business/commercial license eligibility; not automatically free for every organization | Existing dependency; verify before scale |
| FFmpeg | Encoding | LGPL/GPL status depends on build configuration and codecs | Choose compliant build and document codecs |

Source checkpoints to verify: official upstream GitHub repos, model cards and licenses; preserve URLs, commit hashes and downloaded weight SHA256 in future lockfile. Do not download or execute models during planning.

Evaluation gate: lawful commercial rights; user consent for face/voice; realistic dental terminology; lip alignment; accessibility/captions; no likeness leakage; deterministic re-rendering; GPU VRAM requirement; total cost per accepted minute; vulnerability and supply-chain checks.
