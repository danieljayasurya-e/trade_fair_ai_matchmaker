FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Bake the model and the exhibitor embeddings into the image, so it starts quickly and needs no download.
RUN python build_index.py
EXPOSE 4000
# Point STORE_PATH at a permanent disk so guests and bookmarks survive restarts.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4000"]
