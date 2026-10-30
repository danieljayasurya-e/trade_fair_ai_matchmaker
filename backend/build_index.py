"""Pre-compute the exhibitor embeddings. Re-run whenever data/exhibitors.json changes."""
import json

import numpy as np

from engine import DATA, embed, exhibitor_text, load_model

exhibitors = json.loads((DATA / "exhibitors.json").read_text())
vectors = embed(load_model(), [exhibitor_text(e) for e in exhibitors])
np.save(DATA / "exhibitor_embeddings.npy", vectors)
print(f"Embedded {len(exhibitors)} exhibitors: {vectors.shape}")
