FROM python:3.13-slim
WORKDIR /app

RUN pip install uv

COPY pyproject.toml ./

RUN uv sync

COPY /pracuj_pl ./pracuj_pl
COPY main.py ./

ENTRYPOINT ["uv", "run", "main.py"]