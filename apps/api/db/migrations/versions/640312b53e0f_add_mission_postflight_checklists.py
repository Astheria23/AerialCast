"""Add mission postflight checklist tables

Revision ID: 640312b53e0f
Revises: 8d7e129e81f6
Create Date: 2025-12-10 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "640312b53e0f"
down_revision = "8d7e129e81f6"
branch_labels = None
depends_on = None


preflight_status_enum_name = "preflightstatus"
preflight_status_enum = postgresql.ENUM(
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    name=preflight_status_enum_name,
    create_type=False,
)


def upgrade():
    op.create_table(
        "mission_postflight_checklists",
        sa.Column("postflight_id", postgresql.UUID(), primary_key=True),
        sa.Column("mission_id", postgresql.UUID(), nullable=False, unique=True),
        sa.Column(
            "status",
            preflight_status_enum,
            nullable=False,
            server_default="NOT_STARTED",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["mission_id"], ["missions.mission_id"], ondelete="CASCADE"),
    )

    op.create_table(
        "mission_postflight_checklist_items",
        sa.Column("postflight_item_id", postgresql.UUID(), primary_key=True),
        sa.Column(
            "postflight_id",
            postgresql.UUID(),
            sa.ForeignKey("mission_postflight_checklists.postflight_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_checklist_id", postgresql.UUID(), nullable=True),
        sa.Column("source_checklist_item_id", postgresql.UUID(), nullable=True),
        sa.Column("section_title", sa.String(length=255), nullable=True),
        sa.Column("section_order", sa.SmallInteger(), nullable=True),
        sa.Column("item_text", sa.String(length=255), nullable=False),
        sa.Column("order", sa.SmallInteger(), nullable=True),
        sa.Column(
            "is_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("completed_by_user_id", postgresql.UUID(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["source_checklist_id"], ["checklists.checklist_id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["source_checklist_item_id"], ["checklist_items.item_id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["completed_by_user_id"], ["users.user_id"], ondelete="SET NULL"
        ),
    )


def downgrade():
    op.drop_table("mission_postflight_checklist_items")
    op.drop_table("mission_postflight_checklists")
