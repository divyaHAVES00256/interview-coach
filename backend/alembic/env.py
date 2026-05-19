"""
env.py — Alembic environment configuration.

Key changes from the default:
1. Load DATABASE_URL from our .env via pydantic settings
2. Pass Base.metadata to target_metadata so Alembic can auto-generate migrations
3. Import all models so they're registered with Base
"""

import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# add backend dir to sys.path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# load setting
from app.core.config import get_settings

# import base, models
from app.db.database import Base
from app.models import User, InterviewSession, Question, Answer, Score 

# alembic config (reads alembic.ini)
settings = get_settings()

config = context.config

# override the sqlalchemy.url from alembic.ini with our .env value
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# logginng from alembic.ini config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# tells Alembic to compare against our models
target_metadata = Base.metadata

# generates SQL without connecting to DB
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

# connects to DB and runs migrations directly
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()