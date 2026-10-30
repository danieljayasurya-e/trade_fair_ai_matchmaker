"""The matching engine: compatibility of one guest with every exhibitor.

Two-way "mutual fit", the same rules as client/src/services/scoring.ts except that `semantic` uses
embeddings here:
  guest -> stall : does the stall sell what the guest wants? (semantic, interest, intent)
  stall -> guest : is the guest a likely buyer for the stall? (sector)
  score          : geometric mean of the two, 0-100.

Exhibitor embeddings are computed ahead of time by build_index.py because exhibitor data is fixed.
Guest embeddings are computed when a profile is created or updated, because those values change.
Every point of a score traces back to profile data; there are no per-exhibitor adjustments.
"""
import json
import math
import re
from pathlib import Path

import numpy as np
from fastembed import TextEmbedding

HERE = Path(__file__).parent
DATA = HERE / "data"
MODEL_NAME = "BAAI/bge-small-en-v1.5"
MODEL_DIR = HERE / "models"
TOP_N = 30

G2E_WEIGHTS = {"semantic": 0.4, "interest": 0.4, "intent": 0.2}
# A missing sector is weak evidence (the lists are inferred), so it lowers a score without burying the stall.
BUYER_FIT_FLOOR = 0.7
SECTOR_INTENT_BONUS = 0.25
# bge-small cosine similarity of unrelated profiles sits near the low end and strong matches near the
# high end; this stretches that range onto 0-1. The same two numbers apply to every exhibitor.
COSINE_LOW = 0.45
COSINE_HIGH = 0.85

# Words nearly every exhibitor's products contain: they say nothing about a specific product.
GENERIC_PRODUCT_WORDS = {"laser", "optic", "optica", "system", "machin", "equipm", "photon", "compon", "produc", "module"}

STOPWORDS = {
    "and", "the", "for", "with", "our", "your", "you", "are", "any", "anything", "that", "this", "from",
    "need", "looking", "interested", "want", "plus", "into", "also", "all", "can", "use", "new",
}


def tokenize(text):
    out = set()
    for raw in re.split(r"[^\w]+", text.lower()):
        if len(raw) < 3 or raw in STOPWORDS:
            continue
        out.add(raw[:6] if len(raw) > 6 else re.sub(r"s$", "", raw))
    return out


def clamp01(value):
    return min(1.0, max(0.0, float(value)))


def exhibitor_text(e):
    return ". ".join([e["name"], e["description"], ", ".join(e["products"]), ", ".join(e["tags"])])


def guest_text(g):
    return ". ".join([g["freeText"], g["jobRole"], g["industry"], ", ".join(g["interests"])])


def load_model():
    return TextEmbedding(MODEL_NAME, cache_dir=str(MODEL_DIR))


def embed(model, texts):
    vectors = np.array(list(model.embed(texts)), dtype=np.float32)
    return vectors / np.linalg.norm(vectors, axis=1, keepdims=True)


class Engine:
    def __init__(self):
        self.model = load_model()
        self.exhibitors = json.loads((DATA / "exhibitors.json").read_text())
        self.vectors = np.load(DATA / "exhibitor_embeddings.npy")
        if len(self.vectors) != len(self.exhibitors):
            raise RuntimeError("Exhibitor embeddings are out of date: run build_index.py")
        self.by_id = {e["id"]: e for e in self.exhibitors}
        self.words = [tokenize(exhibitor_text(e)) for e in self.exhibitors]
        self.tag_words = {t: tokenize(t) for e in self.exhibitors for t in e["tags"]}
        self.product_words = [[(p, tokenize(p)) for p in e["products"]] for e in self.exhibitors]

    def embed_guest(self, guest):
        return embed(self.model, [guest_text(guest)])[0]

    def _pair(self, guest, written, cosine, index):
        e = self.exhibitors[index]
        semantic = clamp01((cosine - COSINE_LOW) / (COSINE_HIGH - COSINE_LOW))

        matched = [t for t in e["tags"] if t in guest["interests"]]
        interest = (
            clamp01(len(matched) / len(guest["interests"])) if guest["interests"] else 0.0
        )
        written_tags = [t for t in e["tags"] if t not in matched and (self.tag_words[t] - GENERIC_PRODUCT_WORDS) & written]
        written_products = [p for p, words in self.product_words[index] if (words - GENERIC_PRODUCT_WORDS) & written]
        sells_to_sector = guest["industry"] in e["industries"]
        tag_intent = (len(matched) + len(written_tags)) / len(e["tags"]) if e["tags"] else 0.0
        product_intent = min(1.0, len(written_products) / 3)
        intent = clamp01(0.5 * tag_intent + 0.5 * product_intent + (SECTOR_INTENT_BONUS if sells_to_sector else 0))

        buyer_fit = 1.0 if sells_to_sector else 0.0
        g2e = clamp01(
            G2E_WEIGHTS["semantic"] * semantic + G2E_WEIGHTS["interest"] * interest + G2E_WEIGHTS["intent"] * intent
        )
        e2g = clamp01(BUYER_FIT_FLOOR + (1 - BUYER_FIT_FLOOR) * buyer_fit)

        insights = [{"label": t, "why": f"Matches your interest “{t}”."} for t in matched]
        insights += [{"label": t, "why": f"Your description mentions what they offer under “{t}”."} for t in written_tags]
        insights += [{"label": p, "why": f"They offer {p}, which you asked about."} for p in written_products[:2]]
        if sells_to_sector:
            insights.append({"label": f"{guest['industry']} buyers", "why": f"They sell to {guest['industry']} businesses, like yours."})
        if not insights:
            insights.append({"label": "General overlap", "why": "Your profile reads similarly to their description and products."})

        matched_on = (matched + written_tags)[:5]
        offer = written_products[0] if written_products else (e["products"][0] if e["products"] else None)
        if matched_on:
            lead = f"Offers {offer}; matches" if offer else "Matches"
            reason = f"{lead} your interest in {', '.join(matched_on[:3])}."
        else:
            reason = insights[0]["why"]

        return {
            "exhibitor": e,
            "score": round(100 * math.sqrt(g2e * e2g)),
            "matchedOn": matched_on,
            "factors": {
                "semantic": round(semantic, 3),
                "interest": round(interest, 3),
                "intent": round(intent, 3),
                "buyerFit": buyer_fit,
                "g2e": round(g2e, 3),
                "e2g": round(e2g, 3),
            },
            "reason": reason[:200],
            "insights": insights,
        }

    def rank(self, guest, guest_vector):
        """Every exhibitor, best first. Ties fall back to g2e and then name, so the order is stable."""
        written = tokenize(guest["freeText"])
        cosines = self.vectors @ guest_vector
        scored = [self._pair(guest, written, float(cosines[i]), i) for i in range(len(self.exhibitors))]
        scored.sort(key=lambda m: (-m["score"], -m["factors"]["g2e"], m["exhibitor"]["name"]))
        for position, match in enumerate(scored, start=1):
            match["rank"] = position
        return scored
