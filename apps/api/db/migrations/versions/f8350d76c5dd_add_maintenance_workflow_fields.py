"""Add maintenance workflow fields

Revision ID: f8350d76c5dd
Revises: 1bb68d74c094
Create Date: 2025-12-13 14:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f8350d76c5dd"
down_revision = "1bb68d74c094"
branch_labels = None
depends_on = None


maintenance_status = sa.Enum(
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    name="maintenance_status",
)


def upgrade():
    maintenance_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "maintenance_logs",
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "maintenance_logs",
        sa.Column(
            "status",
            maintenance_status,
            nullable=False,
            server_default="SCHEDULED",
        ),
    )
    op.add_column(
        "maintenance_logs",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "maintenance_logs",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_foreign_key(
        "fk_maintenance_logs_created_by_user_id_users",
        "maintenance_logs",
        "users",
        ["created_by_user_id"],
        ["user_id"],
    )

    op.execute("UPDATE maintenance_logs SET status = 'COMPLETED'")

    op.alter_column(
        "maintenance_logs",
        "status",
        server_default=None,
        existing_type=maintenance_status,
    )


def downgrade():
    op.drop_constraint(
        "fk_maintenance_logs_created_by_user_id_users",
        "maintenance_logs",
        type_="foreignkey",
    )

    op.drop_column("maintenance_logs", "completed_at")
    op.drop_column("maintenance_logs", "started_at")
    op.drop_column("maintenance_logs", "status")
    op.drop_column("maintenance_logs", "created_by_user_id")

    maintenance_status.drop(op.get_bind(), checkfirst=True)
