FROM python:3.13-slim
WORKDIR /app

RUN pip install uv

COPY pyproject.toml ./

RUN uv sync

COPY /src ./src
COPY main.py ./

ENTRYPOINT ["uv", "run", "main.py"]