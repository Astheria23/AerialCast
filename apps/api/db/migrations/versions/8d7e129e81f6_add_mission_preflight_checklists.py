"""Add mission preflight checklist tables

Revision ID: 8d7e129e81f6
Revises: 1bb68d74c094
Create Date: 2025-12-05 12:00:00.000000

"""

from datetime import datetime
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "8d7e129e81f6"
down_revision = "1bb68d74c094"
branch_labels = None
depends_on = None


mission_status_enum_name = "missionstatus"
preflight_status_enum_name = "preflightstatus"
preflight_status_enum = postgresql.ENUM(
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    name=preflight_status_enum_name,
    create_type=False,
)


def upgrade():
    bind = op.get_bind()

    # Add new mission status value
    op.execute(
        "ALTER TYPE %s ADD VALUE IF NOT EXISTS 'READY_FOR_FLIGHT'" % mission_status_enum_name
    )

    # Add mission lifecycle columns
    op.add_column("missions", sa.Column("assigned_pilot_id", postgresql.UUID(), nullable=True))
    op.add_column("missions", sa.Column("approval_notes", sa.Text(), nullable=True))
    op.add_column(
        "missions",
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "missions",
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "missions",
        sa.Column("ready_for_flight_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "missions",
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_foreign_key(
        "missions_assigned_pilot_id_fkey",
        "missions",
        "users",
        ["assigned_pilot_id"],
        ["user_id"],
    )

    # Ensure preflight status enum exists without recreating it blindly
    op.execute(
        sa.text(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = '{preflight_status_enum_name}'
                ) THEN
                    CREATE TYPE {preflight_status_enum_name} AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
                END IF;
            END
            $$;
            """
        )
    )

    # Create mission_preflight_checklists table
    op.create_table(
        "mission_preflight_checklists",
        sa.Column("preflight_id", postgresql.UUID(), primary_key=True),
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

    # Create mission_preflight_checklist_items table
    op.create_table(
        "mission_preflight_checklist_items",
        sa.Column("preflight_item_id", postgresql.UUID(), primary_key=True),
        sa.Column(
            "preflight_id",
            postgresql.UUID(),
            sa.ForeignKey("mission_preflight_checklists.preflight_id", ondelete="CASCADE"),
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

    # Copy existing mission checklist associations into the new structure
    connection = bind
    legacy_rows = connection.execute(
        sa.text(
            """
            SELECT mc.mission_id, mc.checklist_id, c.title
            FROM mission_checklists mc
            JOIN checklists c ON c.checklist_id = mc.checklist_id
            ORDER BY mc.mission_id
            """
        )
    ).fetchall()

    mission_templates = {}
    for row in legacy_rows:
        mission_templates.setdefault(row.mission_id, []).append((row.checklist_id, row.title))

    checklist_item_stmt = sa.text(
        """
        SELECT item_id, item_text, "order"
        FROM checklist_items
        WHERE checklist_id = :checklist_id
        ORDER BY "order" ASC
        """
    )

    for mission_id, templates in mission_templates.items():
        preflight_id = uuid.uuid4()
        connection.execute(
            sa.text(
                """
                INSERT INTO mission_preflight_checklists (preflight_id, mission_id, status, created_at)
                VALUES (:preflight_id, :mission_id, :status, :created_at)
                """
            ),
            {
                "preflight_id": str(preflight_id),
                "mission_id": str(mission_id),
                "status": "NOT_STARTED",
                "created_at": datetime.utcnow(),
            },
        )
        for section_order, (checklist_id, checklist_title) in enumerate(templates):
            items = connection.execute(
                checklist_item_stmt,
                {"checklist_id": str(checklist_id)},
            ).fetchall()
            for item in items:
                connection.execute(
                    sa.text(
                        """
                        INSERT INTO mission_preflight_checklist_items (
                            preflight_item_id,
                            preflight_id,
                            source_checklist_id,
                            source_checklist_item_id,
                            section_title,
                            section_order,
                            item_text,
                            "order",
                            is_completed
                        ) VALUES (
                            :preflight_item_id,
                            :preflight_id,
                            :source_checklist_id,
                            :source_checklist_item_id,
                            :section_title,
                            :section_order,
                            :item_text,
                            :order,
                            false
                        )
                        """
                    ),
                    {
                        "preflight_item_id": str(uuid.uuid4()),
                        "preflight_id": str(preflight_id),
                        "source_checklist_id": str(checklist_id),
                        "source_checklist_item_id": str(item.item_id),
                        "section_title": checklist_title,
                        "section_order": section_order,
                        "item_text": item.item_text,
                        "order": item.order,
                    },
                )

    # Drop the legacy association table
    op.drop_table("mission_checklists")


def downgrade():
    bind = op.get_bind()

    # Recreate mission_checklists table
    op.create_table(
        "mission_checklists",
        sa.Column("mission_id", postgresql.UUID(), nullable=False),
        sa.Column("checklist_id", postgresql.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["checklist_id"], ["checklists.checklist_id"]),
        sa.ForeignKeyConstraint(["mission_id"], ["missions.mission_id"]),
        sa.PrimaryKeyConstraint("mission_id", "checklist_id"),
    )

    connection = bind
    restored_rows = connection.execute(
        sa.text(
            """
            SELECT DISTINCT mpc.mission_id, mpci.source_checklist_id
            FROM mission_preflight_checklists mpc
            JOIN mission_preflight_checklist_items mpci
                ON mpci.preflight_id = mpc.preflight_id
            WHERE mpci.source_checklist_id IS NOT NULL
            """
        )
    ).fetchall()
    for row in restored_rows:
        connection.execute(
            sa.text(
                """
                INSERT INTO mission_checklists (mission_id, checklist_id)
                VALUES (:mission_id, :checklist_id)
                ON CONFLICT DO NOTHING
                """
            ),
            {"mission_id": str(row.mission_id), "checklist_id": str(row.source_checklist_id)},
        )

    # Drop new tables
    op.drop_table("mission_preflight_checklist_items")
    op.drop_table("mission_preflight_checklists")

    # Drop mission columns and foreign key
    op.drop_constraint("missions_assigned_pilot_id_fkey", "missions", type_="foreignkey")
    op.drop_column("missions", "rejected_at")
    op.drop_column("missions", "ready_for_flight_at")
    op.drop_column("missions", "approved_at")
    op.drop_column("missions", "submitted_at")
    op.drop_column("missions", "approval_notes")
    op.drop_column("missions", "assigned_pilot_id")

    # Revert mission status enum
    op.execute("UPDATE missions SET status = 'APPROVED' WHERE status = 'READY_FOR_FLIGHT'")
    op.execute(f"ALTER TYPE {mission_status_enum_name} RENAME TO {mission_status_enum_name}_old")
    new_mission_status = sa.Enum(
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELED",
        name=mission_status_enum_name,
    )
    new_mission_status.create(bind)
    op.execute(
        f"ALTER TABLE missions ALTER COLUMN status TYPE {mission_status_enum_name} USING status::text::{mission_status_enum_name}"
    )
    op.execute(f"DROP TYPE {mission_status_enum_name}_old")

    # Drop preflight status enum
    preflight_status_enum.drop(bind, checkfirst=True)