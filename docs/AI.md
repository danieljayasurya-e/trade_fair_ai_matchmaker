# AI in the Trade Fair AI Matchmaker

This covers where AI is used, how it affects a match, how well it works, and its limits. For the exact formula and commands, see [`backend/README.md`](../backend/README.md).

## Summary

| Stage | When it runs | Technology | Runs where | Data sent out |
|---|---|---|---|---|
| Exhibitor enrichment | Once, before the event | Perplexity, a web-connected model | External API | Public company names |
| Exhibitor tagging | Once, before the event | `openai/gpt-oss-120b` on Groq | External API | Public company details |
| Exhibitor embeddings | When exhibitor data changes | `BAAI/bge-small-en-v1.5` | Locally | None |
| Guest embedding | When a profile is created or updated | `BAAI/bge-small-en-v1.5` | On our server | None |
| Scoring and ranking | On every request | Our own formula | On our server | None |

Generative AI prepares the exhibitor data ahead of time. It is **not** called during matching, so the demo doesn't depend on an outside AI service, has no per-request AI cost, and returns the same order for the same profile. Guest profiles never go to an outside AI service.

## The embedding model

- **Model:** `BAAI/bge-small-en-v1.5`, which turns text into 384 numbers, so similar meanings get similar numbers.
- **Runtime:** `fastembed`, which runs it on the CPU with ONNX. The download is about 64 MB, and the whole backend uses about 285 MB of memory on the VM.
- **Why this one:** it's small and fast, runs without a GPU or API key, and works when the network doesn't.

**What gets embedded:**

| Side | Text |
|---|---|
| Exhibitor | Name, description, products and tags |
| Guest | Free text, job role, industry and interests |

Exhibitor embeddings are stored in `backend/data/exhibitor_embeddings.npy`, because that data is fixed. A guest is embedded when their profile is saved, because those values can change. An edit therefore affects the very next set of recommendations.

## How AI feeds the score

Each match combines a guest-to-stall score and a stall-to-guest score, as a geometric mean:

```
g2e   = 0.4 × semantic + 0.4 × interest + 0.2 × intent
e2g   = 0.7 + 0.3 × buyerFit
score = round(100 × sqrt(g2e × e2g))
```

| Factor | Source |
|---|---|
| `semantic` | Embedding similarity, directly from the model |
| `interest` | Guest's ticked interests compared with the AI-assigned tags |
| `intent` | Guest's text compared with tags and enriched products, plus a bonus for the AI-assigned sector |
| `buyerFit` | Guest's industry compared with the AI-assigned sectors |

The weights were chosen by hand and adjusted from reviewing results. They weren't learned from data, because there's no record of which visitors actually valued which stalls.

## Exhibitor data preparation

The visitor guide only gives names and booth numbers, which isn't enough to match on.

**Enrichment.** A web-connected model looked up each company once and returned its description, products, technologies and markets. Each record has a confidence level. Across the 153 records, 138 are high, 11 medium and 4 unknown. This came from the earlier MMI PoC, and it cost about $0.31.

**Tagging.** `data/retag_exhibitors.py` asks a model to assign up to 5 product areas and any number of buyer sectors, from fixed lists.

- **Settings:** temperature 0, JSON output, 6 companies per request. The run used about 88,000 tokens on Groq's free tier.
- **Instructions:** tag what the company sells, not what its customers do. Don't use a company's name or fame as evidence. Return nothing if there are no details.
- **Safeguards:** answers outside the fixed lists are thrown away. Companies with no details are skipped, with no model call. Results are saved in `data/exhibitor_tags.json`, so they don't change between runs.

Tags replaced an earlier keyword-rule approach, which mislabelled companies. For example, it tagged a glove supplier "Laser Safety" and missed "Optical Components" for an infrared optics maker.

## Explaining a match

Explanations are built by our code from the factors, not written by a model, so they can't describe something the score didn't use.

- `matchedOn` lists the product areas behind the match.
- `reason` is one sentence, such as "Offers galvanometer scanners; matches your interest in Scanners & Beam Delivery."
- `insights` lists each reason in the detail view.
- `factors` gives the numbers behind the score bars.

## How it was evaluated

There's no answer key, so this was a **manual review, not a measured accuracy figure**. We read the top 10 for the 10 demo guests and one extra profile, and compared where certain exhibitors landed with where they'd be expected from their products. Those expectations are our own judgement.

| Guest | Rating before tuning |
|---|---|
| Fibre laser cutting | Good |
| Thin film and wafer inspection | Good |
| Fibre and connectors | Good |
| Femtosecond lasers and stages | Fair |
| Quantum optics lab | Fair |
| EV welding and scanners | Fair |
| Marking, cameras and inspection | Fair |
| Infrared lenses and detectors | Weak |
| Marking and safety distributor | Weak |
| Solar laser scribing | Weak |
| Metal 3D printing | Weak |

**Tuning changed two things:** the penalty for a missing sector was softened, because those lists are inferred, and exhibitors were re-tagged by AI. Ratings weren't repeated afterwards, but specific exhibitors moved:

| Guest | Exhibitor | Before | After |
|---|---|---|---|
| Marking, cameras and inspection | Etchon (marking) | #23 | #2 |
| Marking and safety distributor | Protect-Laserschutz (laser safety) | #18 | #2 |
| Marking and safety distributor | Triquench (spindles, poor fit) | #8 | #72 |
| EV welding and scanners | IPG | #28 | #5 |
| EV welding and scanners | Scanlab (worse) | #16 | #33 |
| Fibre laser cutting | Shenzhen Ruida (worse) | #1 | #22 |
| Quantum optics lab | Thorlabs (worse) | #4 | #14 |
| Metal 3D printing | Sensortherm (still poor) | #130 | #133 |

**Speed:** the top 30 is computed in about 2–5 ms on the server. The slowest full API call in testing was 311 ms from a laptop to the VM, against the 2-second goal. We didn't separately time guest embedding.

**Automated checks:** `backend/smoke_test.py` tests the API's behaviour and the score formula. It doesn't test ranking quality.

## Responsible AI

**Fairness**
- The same rules apply to every exhibitor, with no paid boosts or per-company adjustments.
- Region, seniority and company size aren't scored. Favouring nearby stalls would push down overseas exhibitors, 80 of the 153 records, for reasons unrelated to their products.
- Ties break the same way each time, so order is never random.
- Exhibitors with thin data rank lower. This isn't intentional, and it's the main fairness weakness: 7 stalls have no tags and 6 have no sectors, because of missing information rather than a poor fit.

**Privacy**
- The 10 demo guests are made up.
- Guest profiles aren't sent to outside AI services, but they are stored unencrypted on the server.
- There is no login, so this deployment isn't suitable for real visitor data.
- The exhibitor portal, which would need aggregated data and consent controls, isn't built.

**Accuracy and transparency**
- Descriptions, products, tags and sectors are AI-generated or AI-assisted, and only spot-checked. Some will be wrong.
- The app says product details come from public web sources. It doesn't label individual tags as AI-inferred.
- The model's confidence levels aren't used in scoring or shown to visitors.

## Known limitations

- **No training data:** weights are hand-set, and ranking quality isn't measured against real outcomes.
- **Specific needs can be missed:** a guest's exact request doesn't always reach the right makers. For example, melt pool sensors rank low for a 3D printing guest.
- **Similar wording isn't the same as fit:** a company can score well on similar language despite a different process, such as injection moulding for a 3D printing guest.
- **Single-event data:** the tags and categories are specific to photonics, and the data comes from the 2026 event.
- **English only:** other languages will match poorly. The model is English-specific.
- **Offline mode is weaker:** the browser fallback counts shared words rather than using embeddings.
- **Prompt injection:** enriched web text was sent to the tagging model. Answers are limited to fixed lists, which contains the risk, but the text wasn't otherwise screened.

## Possible next steps

1. Build a small answer key with organisers, then measure ranking quality before changing weights.
2. Give more weight to the specific products a guest names.
3. Use real target-buyer criteria from exhibitors in place of inferred sectors.
4. Have people review tags, starting with the medium-confidence and unknown records.
5. Learn the weights from real bookmarks and stall visits once they exist.
