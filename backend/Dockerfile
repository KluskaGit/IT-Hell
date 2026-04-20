FROM python:3.13-slim
WORKDIR /app

RUN pip install uv

COPY pyproject.toml ./

RUN uv sync

COPY /src ./src
COPY alembic.ini ./
COPY /worker ./worker

EXPOSE 8000

ENTRYPOINT ["uv", "run", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]