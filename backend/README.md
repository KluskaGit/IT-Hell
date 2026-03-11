# How to use uv

1. [Installation uv](https://docs.astral.sh/uv/getting-started/installation/)
2. Adding dependencies eg. fastapi
   ```
   uv add fastapi
   ```
3. Removing dependencies

   ```
   uv remove <dependency>
   ```

4. Installing existing dependencies from `pyproject.toml`

   ```
   uv sync
   ```

5. Running scripts

   ```
   uv run <file or command like `uvicorn main:app`>
   ```

More [here](https://docs.astral.sh/uv/getting-started/features/#python-versions)
