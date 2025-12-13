"""Add SNR column to telemetry data

Revision ID: 6b77f861bf90
Revises: 640312b53e0f
Create Date: 2025-12-10 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6b77f861bf90"
down_revision = "640312b53e0f"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("telemetry_data", sa.Column("snr", sa.Float(), nullable=True))


def downgrade():
    op.drop_column("telemetry_data", "snr")
