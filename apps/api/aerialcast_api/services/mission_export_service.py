"""Mission PDF export helpers powered by WeasyPrint."""

from __future__ import annotations

import base64
import io
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from itertools import cycle
from pathlib import Path
from typing import Any, Iterable, Optional, Sequence

import httpx
import matplotlib

matplotlib.use("Agg")  # noqa: E402
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib.axes import Axes
from PIL import Image
from flask import current_app, render_template
from weasyprint import HTML
from zoneinfo import ZoneInfo

from ..models.execution import Alert, FlightSession, TelemetryData
from ..models.enums import AlertType
from ..models.planning import (
    Mission,
    MissionPostflightChecklistItem,
    MissionPreflightChecklistItem,
)
from ..repositories import AlertRepository
from .flight_session_service import FlightSessionService
from .mission_service import MissionService


class MissionExportService:
    """Render a mission summary PDF including telemetry analytics."""

    telemetry_repository = FlightSessionService.telemetry_repository
    alert_repository = AlertRepository
    MAX_ALERT_ROWS = 40
    ALERT_DISPLAY_LIMIT = 12
    MAP_TILE_SIZE = 256
    MAP_TILE_MAX = 16
    MAP_TILE_SUBDOMAINS = ("a", "b", "c", "d")
    MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"

    @classmethod
    def build_pdf(cls, mission_id, *, map_image_bytes: bytes | None = None) -> bytes:
        mission: Mission = MissionService.get_mission_by_id(mission_id)
        sessions = sorted(
            list(getattr(mission, "flight_sessions", []) or []),
            key=lambda session: session.start_time or datetime.min,
        )

        telemetry_points: list[TelemetryData] = []
        for session in sessions:
            telemetry_points.extend(
                cls.telemetry_repository.list_for_session(session.session_id)
            )
        telemetry_points.sort(
            key=lambda point: point.time
            or datetime.min.replace(tzinfo=timezone.utc)
        )

        telemetry_summary = cls._summarize_telemetry(telemetry_points)
        timeline_summary = cls._mission_timeline(sessions, telemetry_points)

        alert_records = cls.alert_repository.list_for_sessions(
            [session.session_id for session in sessions],
            limit=cls.MAX_ALERT_ROWS,
        )
        alert_context = cls._prepare_alert_context(alert_records)
        alert_timeline_stream = cls._render_alert_timeline(
            alert_context.get("timeline_events") or [],
            alert_context.get("cause_order") or [],
        )

        map_stream = (
            io.BytesIO(map_image_bytes)
            if map_image_bytes
            else cls._render_mission_map(mission)
        )
        rssi_stream = cls._render_metric_chart(
            telemetry_points,
            attr="rssi",
            title="RSSI Trend",
            ylabel="RSSI (dBm)",
            legend_label="RSSI",
            color="#2563eb",
        )
        snr_stream = cls._render_metric_chart(
            telemetry_points,
            attr="snr",
            title="SNR Trend",
            ylabel="SNR (dB)",
            legend_label="SNR",
            color="#16a34a",
        )
        battery_stream = cls._render_metric_chart(
            telemetry_points,
            attr="battery_voltage",
            title="Battery Voltage",
            ylabel="Voltage (V)",
            legend_label="Battery",
            color="#f97316",
        )

        context = cls._build_template_context(
            mission=mission,
            telemetry_summary=telemetry_summary,
            timeline_summary=timeline_summary,
            map_stream=map_stream,
            rssi_stream=rssi_stream,
            snr_stream=snr_stream,
            battery_stream=battery_stream,
            alert_context=alert_context,
            alert_timeline_stream=alert_timeline_stream,
        )

        html = render_template("mission_report.html", **context)
        base_url = str(current_app.root_path)
        pdf_bytes = HTML(string=html, base_url=base_url).write_pdf()
        return pdf_bytes or b""

    @classmethod
    def _build_template_context(
        cls,
        *,
        mission: Mission,
        telemetry_summary: dict[str, Any],
        timeline_summary: dict[str, Any] | None,
        map_stream: io.BytesIO,
        rssi_stream: io.BytesIO,
        snr_stream: io.BytesIO,
        battery_stream: io.BytesIO,
        alert_context: dict[str, Any],
        alert_timeline_stream: io.BytesIO | None,
    ) -> dict[str, Any]:
        metadata = [
            {"label": "Mission ID", "value": str(mission.mission_id)},
            {
                "label": "Status",
                "value": getattr(mission.status, "name", None)
                if getattr(mission.status, "name", None)
                else str(mission.status),
            },
            {
                "label": "Created",
                "value": cls._format_datetime(mission.created_at),
            },
            {
                "label": "Pilot",
                "value": (
                    getattr(mission.assigned_pilot, "full_name", None)
                    or getattr(mission.creator, "full_name", None)
                    or "Unknown"
                ),
            },
            {
                "label": "Drone",
                "value": getattr(mission.drone, "drone_name", None)
                or "—",
            },
        ]

        timeline_rows: list[tuple[str, str]] = []
        if timeline_summary:
            timeline_rows = [
                (
                    f"Window start: {timeline_summary['start_display']}",
                    f"Window end: {timeline_summary['end_display']}",
                ),
                (
                    f"Duration: {timeline_summary['duration_display']}",
                    f"Sessions logged: {timeline_summary['session_count']}",
                ),
                (
                    f"Telemetry fixes: {timeline_summary['point_count']}",
                    f"Last contact: {timeline_summary['last_contact_display']}",
                ),
            ]

        telemetry_cards = cls._telemetry_cards(telemetry_summary)

        waypoints = [
            {
                "order": waypoint.order,
                "label": cls._format_waypoint(
                    waypoint.order,
                    waypoint.latitude,
                    waypoint.longitude,
                    waypoint.altitude,
                ),
            }
            for waypoint in sorted(
                list(getattr(mission, "waypoints", []) or []),
                key=lambda wp: wp.order,
            )
        ]

        operations_left = cls._operations_left_notes(mission, timeline_summary)
        operations_right = cls._operations_right_notes(telemetry_summary)

        preflight_groups = cls._group_checklist(
            mission.preflight_checklist.items if mission.preflight_checklist else []
        )
        postflight_groups = cls._group_checklist(
            mission.postflight_checklist.items if mission.postflight_checklist else []
        )
        drone_context = cls._build_drone_context(mission)

        return {
            "mission_name": mission.mission_name,
            "generated_at": cls._format_datetime(datetime.now(timezone.utc)),
            "metadata": metadata,
            "timeline_rows": timeline_rows,
            "telemetry_cards": telemetry_cards,
            "mission_notes": mission.notes or "",
            "waypoints": waypoints,
            "map_data_uri": cls._to_data_uri(map_stream),
            "rssi_data_uri": cls._to_data_uri(rssi_stream),
            "snr_data_uri": cls._to_data_uri(snr_stream),
            "battery_data_uri": cls._to_data_uri(battery_stream),
            "operations_left": operations_left,
            "operations_right": operations_right,
            "preflight_groups": preflight_groups,
            "postflight_groups": postflight_groups,
            "logo_data_uri": cls._load_logo_data_uri(),
            "alert_summary": alert_context["summary"],
            "alert_breakdown": alert_context["breakdown"],
            "alert_recent_groups": alert_context["recent_groups"],
            "alert_omitted_group_count": alert_context["omitted_groups"],
            "alert_total_events": alert_context["total_events"],
            "alert_timeline_data_uri": cls._to_data_uri(alert_timeline_stream),
            "drone_summary": drone_context["summary"],
            "drone_specs": drone_context["specs"],
            "drone_additional_notes": drone_context["notes"],
        }

    @classmethod
    def _prepare_alert_context(
        cls, alert_records: Sequence[Alert]
    ) -> dict[str, Any]:
        if not alert_records:
            summary = {
                "total": 0,
                "distinct_types": 0,
                "first_display": "—",
                "last_display": "—",
                "duration_display": "—",
                "top_type": None,
                "top_share_display": None,
            }
            return {
                "summary": summary,
                "breakdown": [],
                "recent_groups": [],
                "omitted_groups": 0,
                "total_events": 0,
            }

        alerts_sorted = sorted(
            alert_records,
            key=lambda record: cls._ensure_timezone(record.timestamp)
            or datetime.min.replace(tzinfo=timezone.utc),
        )

        total_events = len(alerts_sorted)
        type_counts: Counter[str] = Counter()
        for record in alerts_sorted:
            label = getattr(record.alert_type, "value", None) or str(record.alert_type)
            type_counts[label] += 1

        first_ts = cls._ensure_timezone(alerts_sorted[0].timestamp)
        last_ts = cls._ensure_timezone(alerts_sorted[-1].timestamp)
        duration_seconds = None
        if first_ts and last_ts:
            try:
                duration_seconds = (last_ts - first_ts).total_seconds()
            except Exception:
                duration_seconds = None

        breakdown: list[dict[str, Any]] = []
        for alert_type, count in type_counts.most_common():
            share = (count / total_events) * 100 if total_events else 0
            if share >= 10:
                share_display = f"{share:.0f}%"
            else:
                share_display = f"{share:.1f}%"
            breakdown.append(
                {
                    "type": alert_type,
                    "count": count,
                    "share_display": share_display,
                }
            )

        summary = {
            "total": total_events,
            "distinct_types": len(type_counts),
            "first_display": cls._format_datetime(first_ts),
            "last_display": cls._format_datetime(last_ts),
            "duration_display": cls._format_duration(duration_seconds),
            "top_type": breakdown[0]["type"] if breakdown else None,
            "top_share_display": breakdown[0]["share_display"] if breakdown else None,
        }

        grouped: dict[str, dict[str, Any]] = {}
        timeline_events: list[dict[str, Any]] = []
        for record in alerts_sorted:
            timestamp = cls._ensure_timezone(record.timestamp)
            alert_type = getattr(record.alert_type, "value", None) or str(
                record.alert_type
            )
            raw_message = record.message or ""
            group_key, display_message, detail_message = cls._normalize_alert_group(
                alert_type, raw_message
            )

            if timestamp:
                timeline_events.append(
                    {
                        "timestamp": timestamp,
                        "category": display_message,
                        "type": alert_type,
                        "detail": detail_message or raw_message or None,
                    }
                )

            entry = grouped.get(group_key)
            if entry is None:
                entry = {
                    "type": alert_type,
                    "message": display_message,
                    "category": display_message,
                    "group_key": group_key,
                    "detail": detail_message,
                    "start": timestamp,
                    "end": timestamp,
                    "count": 0,
                }
                grouped[group_key] = entry

            entry["count"] += 1
            if timestamp:
                if entry.get("start") is None or timestamp < entry["start"]:
                    entry["start"] = timestamp
                if entry.get("end") is None or timestamp > entry["end"]:
                    entry["end"] = timestamp
            if detail_message is not None:
                should_update_detail = False
                if entry.get("end") is None:
                    should_update_detail = True
                elif timestamp and entry["end"] and timestamp >= entry["end"]:
                    should_update_detail = True
                if should_update_detail:
                    entry["message"] = display_message
                    entry["category"] = display_message
                    entry["group_key"] = group_key
                    entry["detail"] = detail_message

        groups = list(grouped.values())

        def sort_key(entry: dict[str, Any]) -> datetime:
            reference = entry.get("end")
            if isinstance(reference, datetime):
                return reference
            return datetime.min.replace(tzinfo=timezone.utc)

        groups.sort(key=sort_key, reverse=True)

        recent_groups: list[dict[str, Any]] = []
        for group in groups:
            start = group.get("start")
            end = group.get("end")
            start_display = cls._format_datetime(start)
            end_display = cls._format_datetime(end)
            if start_display == end_display:
                window_display = start_display
            else:
                window_display = f"{start_display} – {end_display}"

            detail_text = group.get("detail")
            display_text = group.get("message") or "—"
            category_label = group.get("category") or display_text
            message_text = detail_text or display_text

            recent_groups.append(
                {
                    "type": group["type"],
                    "category": category_label,
                    "group_key": group.get("group_key"),
                    "message": message_text,
                    "detail": detail_text,
                    "count": group["count"],
                    "window_display": window_display,
                    "start_display": start_display,
                    "end_display": end_display,
                }
            )

        display_groups = recent_groups[: cls.ALERT_DISPLAY_LIMIT]
        omitted = max(0, len(recent_groups) - len(display_groups))
        cause_order = [group["category"] for group in display_groups]
        timeline_events_filtered = [
            event
            for event in sorted(timeline_events, key=lambda entry: entry["timestamp"])
            if event["category"] in cause_order
        ]

        return {
            "summary": summary,
            "breakdown": breakdown,
            "recent_groups": display_groups,
            "omitted_groups": omitted,
            "total_events": total_events,
            "timeline_events": timeline_events_filtered,
            "cause_order": cause_order,
        }

    @staticmethod
    def _normalize_alert_group(alert_type: str, message: str) -> tuple[str, str, str | None]:
        cleaned_message = (message or "").strip()
        detail = cleaned_message or None
        display = cleaned_message or "No additional details"
        key = f"{alert_type}|{cleaned_message}" if cleaned_message else alert_type

        try:
            enum_value = AlertType(alert_type)
        except Exception:  # pragma: no cover - defensive fallback for unknown types
            enum_value = None

        if enum_value == AlertType.GEOFENCE_BREACH:
            match = re.search(r"geofence '([^']+)'", cleaned_message, re.IGNORECASE)
            area_name = match.group(1).strip() if match else None
            if area_name:
                key = f"{alert_type}|{area_name.lower()}"
                display = f"Geofence breach: {area_name}"
            else:
                key = f"{alert_type}|generic"
                display = "Geofence breach detected"

        elif enum_value == AlertType.SIGNAL_LOST:
            lower = cleaned_message.lower()
            causes: list[str] = []
            if "battery" in lower:
                causes.append("Battery")
            if "rssi" in lower:
                causes.append("RSSI")
            if "snr" in lower:
                causes.append("SNR")
            if not causes:
                causes.append("Signal")
            normalized = "-".join(sorted(token.lower() for token in causes))
            key = f"{alert_type}|{normalized}"
            cause_label = " & ".join(causes)
            display = f"Signal degradation: {cause_label}"

        elif enum_value == AlertType.LOW_BATTERY:
            key = f"{alert_type}|battery"
            display = "Battery critically low"

        return key, display, detail

    @classmethod
    def _render_alert_timeline(
        cls,
        events: Sequence[dict[str, Any]],
        cause_order: Sequence[str],
    ) -> io.BytesIO | None:
        if not events or not cause_order:
            return None

        events_sorted = sorted(events, key=lambda entry: entry["timestamp"])

        categories_in_use: list[str] = [
            category
            for category in cause_order
            if any(event["category"] == category for event in events_sorted)
        ]
        if not categories_in_use:
            return None

        positions = {label: idx for idx, label in enumerate(categories_in_use)}

        plt.style.use("seaborn-v0_8")
        # Increase figure height for more annotation space
        figure_height = max(3.8, 2.2 + 1.1 * len(categories_in_use))
        fig_width = 12.6
        fig, ax = plt.subplots(figsize=(fig_width, figure_height), dpi=220)
        ax.set_facecolor("#f8fafc")
        ax.grid(True, axis="x", linestyle="--", linewidth=0.4, alpha=0.4)
        ax.set_axisbelow(True)

        category_counts: defaultdict[str, int] = defaultdict(int)
        geofence_counts: defaultdict[str, int] = defaultdict(int)

        for index, event in enumerate(events_sorted):
            category = event.get("category")
            timestamp = event.get("timestamp")
            if category not in positions or not isinstance(timestamp, datetime):
                continue
            y_value = positions[category]
            alert_type_value = str(event.get("type") or "")
            color = cls._alert_color(alert_type_value)
            numeric_time = float(mdates.date2num(timestamp))

            ax.scatter(
                [numeric_time],
                [float(y_value)],
                color=color,
                s=26,
                alpha=0.95,
                marker="o",
            )

            annotation = cls._timeline_annotation_text(event.get("detail"))
            time_label = timestamp.strftime("%H:%M:%S")
            label_text = f"{time_label}\n{annotation}" if annotation else time_label

            is_geofence = AlertType.GEOFENCE_BREACH.value.lower() in alert_type_value.lower() or (
                isinstance(category, str) and "geofence" in category.lower()
            )

            # Apply tiered zigzag pattern to all events
            if is_geofence:
                event_index = geofence_counts[category]
                geofence_counts[category] += 1
            else:
                event_index = category_counts[category]
                category_counts[category] += 1

            pair_index = event_index % 4
            # base and higher/lower offsets
            base_y = 15.0  # increased for more space
            high_y = 40.0  # increased for more space
            base_x = 18.0  # increased for more space
            high_x = 38.0  # increased for more space
            if pair_index == 0:
                direction = 1  # up (base)
                y_offset = base_y
                x_offset = base_x
            elif pair_index == 1:
                direction = -1  # down (base)
                y_offset = -base_y
                x_offset = -base_x
            elif pair_index == 2:
                direction = 1  # up (higher)
                y_offset = high_y
                x_offset = high_x
            else:
                direction = -1  # down (lower)
                y_offset = -high_y
                x_offset = -high_x
            vertical_alignment = "bottom" if direction > 0 else "top"

            arrow_rad = 0.18 * direction
            if is_geofence:
                arrow_rad = 0.32 * direction
            arrowprops = {
                "arrowstyle": "-",
                "color": "#94a3b8",
                "lw": 0.30,
                "shrinkA": 0,
                "shrinkB": 2,
                "connectionstyle": f"arc3,rad={arrow_rad}",
            }

            ax.annotate(
                label_text,
                (numeric_time, float(y_value)),
                textcoords="offset points",
                xytext=(x_offset, y_offset),
                ha="center",
                va=vertical_alignment,
                fontsize=5,  # larger text
                rotation=20,
                color="#1e293b",
                linespacing=1.0,
                arrowprops=arrowprops,
                bbox={
                    "boxstyle": "round,pad=0.18",
                    "facecolor": "#e2e8f0" if is_geofence else "#f8fafc",
                    "edgecolor": "#cbd5f5",
                    "linewidth": 0.3,
                    "alpha": 0.92,
                },
            )

        ax.set_yticks([positions[label] for label in categories_in_use])
        ax.set_yticklabels(
            [cls._trim_label(label) for label in categories_in_use], fontsize=7
        )
        ax.set_ylim(-0.6, len(categories_in_use) - 0.4)
        ax.tick_params(axis="y", which="both", length=0)

        ax.set_xlabel("Time", fontsize=7)
        ax.set_title("Alert Timeline", fontsize=10, color="#0f172a")

        ax.xaxis_date()
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M:%S"))
        ax.tick_params(axis="x", labelsize=5.5)
        ax.margins(x=0.16)
        fig.autofmt_xdate(rotation=20, ha="right")

        stream = io.BytesIO()
        fig.tight_layout()
        fig.savefig(stream, format="png", dpi=180, bbox_inches="tight")
        plt.close(fig)
        stream.seek(0)
        return stream

    @staticmethod
    def _timeline_annotation_text(message: str | None) -> str | None:
        if not message:
            return None
        text = message.strip()
        if not text:
            return None
        replacements = [
            "Signal degradation detected:",
            "Signal degradation:",
            "Geofence breach:",
            "Entered restricted geofence",
        ]
        for token in replacements:
            text = text.replace(token, "").strip(" -,:\n")

        coord_match = re.search(r"(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)", text)
        if coord_match:
            lat, lon = coord_match.groups()
            try:
                lat_f = float(lat)
                lon_f = float(lon)
                return f"{lat_f:.4f}, {lon_f:.4f}"
            except ValueError:
                pass

        signal_tokens: list[str] = []
        for segment in re.split(r"[;,]", text):
            cleaned = segment.strip()
            if not cleaned:
                continue
            if cleaned.lower().startswith("rssi"):
                signal_tokens.append(cleaned.replace("dBm", "").strip())
            elif cleaned.lower().startswith("snr"):
                signal_tokens.append(cleaned.replace("dB", "").strip())
            elif cleaned.lower().startswith("battery"):
                signal_tokens.append(cleaned)
        if signal_tokens:
            trimmed = [token[:18].rstrip() + "…" if len(token) > 19 else token for token in signal_tokens[:2]]
            return "\n".join(trimmed)

        if len(text) > 26:
            text = text[:24].rstrip() + "…"
        return text or None

    @staticmethod
    def _trim_label(label: str | None) -> str:
        if not label:
            return "Other"
        text = label.strip()
        if len(text) > 42:
            return text[:39].rstrip() + "…"
        return text

    @staticmethod
    def _alert_color(alert_type: str) -> str:
        palette = {
            AlertType.GEOFENCE_BREACH.value: "#dc2626",
            AlertType.SIGNAL_LOST.value: "#2563eb",
            AlertType.LOW_BATTERY.value: "#f97316",
            AlertType.MISSION_ERROR.value: "#7c3aed",
        }
        return palette.get(alert_type, "#0f172a")

    @staticmethod
    def _format_alert_label(alert_type: str) -> str:
        if not alert_type:
            return "Other"
        try:
            enum_value = AlertType(alert_type)
            base = enum_value.name
        except Exception:
            base = str(alert_type)
        return base.replace("_", " ").title()

    @staticmethod
    def _format_enum_value(value: Any) -> str:
        if value is None:
            return "—"
        candidate = getattr(value, "name", None)
        if isinstance(candidate, str):
            return candidate.replace("_", " ").title()
        if isinstance(value, str):
            return value
        return str(value)

    @classmethod
    def _build_drone_context(cls, mission: Mission) -> dict[str, Any]:
        drone = getattr(mission, "drone", None)
        if not drone:
            return {"summary": [], "specs": [], "notes": None}

        summary_pairs = [
            ("Drone ID", str(getattr(drone, "drone_id", "")) or None),
            ("Name", getattr(drone, "name", None)),
            ("Model", getattr(drone, "model", None)),
            ("LoRa ID", getattr(drone, "lora_id", None)),
            (
                "Registered",
                cls._format_datetime(getattr(drone, "created_at", None)),
            ),
        ]

        summary: list[dict[str, str]] = []
        for label, value in summary_pairs:
            display = value
            if display is None or (isinstance(display, str) and not display.strip()):
                display = "—"
            summary.append({"label": label, "value": display})

        specs: list[dict[str, str]] = []
        additional_notes: Optional[str] = None
        specs_obj = getattr(drone, "specs", None)
        if specs_obj:
            spec_fields = [
                ("Flight Controller", specs_obj.flight_controller),
                ("Motor", specs_obj.motor),
                ("ESC", specs_obj.esc),
                ("Propeller", specs_obj.propeller),
                ("Battery", specs_obj.battery),
                ("GPS Module", specs_obj.gps_module),
            ]
            weight = getattr(specs_obj, "weight_g", None)
            if weight is not None:
                spec_fields.append(("Weight", f"{weight:,} g"))
            max_flight = getattr(specs_obj, "max_flight_time_min", None)
            if max_flight is not None:
                spec_fields.append(("Max Flight Time", f"{max_flight} min"))

            for label, value in spec_fields:
                if value is None or (isinstance(value, str) and not value.strip()):
                    continue
                specs.append({"label": label, "value": str(value)})

            additional = getattr(specs_obj, "additional_info", None)
            if additional and additional.strip():
                additional_notes = additional.strip()

        return {"summary": summary, "specs": specs, "notes": additional_notes}

    @staticmethod
    def _load_logo_data_uri() -> str | None:
        base_path = Path(current_app.root_path)
        candidates: list[tuple[Path, str]] = [
            (base_path / "static" / "aerialcast-logo.png", "image/png"),
            (base_path / "static" / "aerialcast-logo.svg", "image/svg+xml"),
            (
                base_path.parent
                / "web"
                / "public"
                / "images"
                / "aerialcast-logo.png",
                "image/png",
            ),
            (
                base_path.parent
                / "web"
                / "public"
                / "images"
                / "aerialcast-logo.svg",
                "image/svg+xml",
            ),
        ]

        for logo_path, mime in candidates:
            if not logo_path.exists():
                continue
            data = logo_path.read_bytes()
            encoded = base64.b64encode(data).decode("ascii")
            return f"data:{mime};base64,{encoded}"

        return None

    @staticmethod
    def _telemetry_cards(summary: dict[str, Any]) -> list[dict[str, str]]:
        speed_stats = summary.get("speed", {})
        altitude_stats = summary.get("altitude", {})
        battery_stats = summary.get("battery", {})
        signal_stats = summary.get("signal", {})
        snr_stats = summary.get("snr", {})
        return [
            {
                "label": "Distance traveled",
                "value": summary.get("distance_display") or "—",
            },
            {
                "label": "Average speed",
                "value": MissionExportService._format_metric(
                    speed_stats.get("avg"), " m/s"
                ),
            },
            {
                "label": "Top speed",
                "value": MissionExportService._format_metric(
                    speed_stats.get("max"), " m/s"
                ),
            },
            {
                "label": "Altitude range",
                "value": MissionExportService._range_text(altitude_stats, " m"),
            },
            {
                "label": "Battery range",
                "value": MissionExportService._range_text(battery_stats, " V"),
            },
            {
                "label": "RSSI range",
                "value": MissionExportService._range_text(signal_stats, " dBm"),
            },
            {
                "label": "Average SNR",
                "value": MissionExportService._format_metric(
                    snr_stats.get("avg"), " dB"
                ),
            },
            {
                "label": "Last battery reading",
                "value": MissionExportService._format_metric(
                    battery_stats.get("latest"), " V", 2
                ),
            },
        ]

    @staticmethod
    def _operations_left_notes(
        mission: Mission, timeline_summary: dict[str, Any] | None
    ) -> list[str]:
        notes = [
            f"Waypoints planned: {len(mission.waypoints or [])}",
            f"Active geofences: {len(getattr(mission, 'active_geofences', []) or [])}",
        ]
        if timeline_summary:
            notes.append(
                "Flight window: "
                f"{timeline_summary['start_display']} to {timeline_summary['end_display']}"
            )
        return notes

    @staticmethod
    def _operations_right_notes(summary: dict[str, Any]) -> list[str]:
        speed_stats = summary.get("speed", {})
        battery_stats = summary.get("battery", {})
        signal_stats = summary.get("signal", {})
        snr_stats = summary.get("snr", {})
        return [
            f"Distance flown: {summary.get('distance_display') or 'N/A'}",
            "Average speed: "
            + MissionExportService._format_metric(speed_stats.get("avg"), " m/s"),
            "Peak speed: "
            + MissionExportService._format_metric(speed_stats.get("max"), " m/s"),
            "Battery range: "
            + MissionExportService._range_text(battery_stats, " V"),
            "RSSI range: "
            + MissionExportService._range_text(signal_stats, " dBm"),
            "Average SNR: "
            + MissionExportService._format_metric(snr_stats.get("avg"), " dB"),
        ]

    @staticmethod
    def _group_checklist(
        items: Iterable[
            MissionPreflightChecklistItem | MissionPostflightChecklistItem
        ],
    ) -> list[dict[str, Any]]:
        groups: dict[str, list] = defaultdict(list)
        for item in items:
            section = item.section_title or "General"
            groups[section].append(item)

        grouped: list[dict[str, Any]] = []
        for section, entries in sorted(groups.items(), key=lambda entry: entry[0]):
            formatted_items = []
            for entry in entries:
                formatted_items.append(
                    {
                        "text": entry.item_text,
                        "is_completed": bool(entry.is_completed),
                        "note": entry.note or "",
                    }
                )
            grouped.append({"section": section, "entries": formatted_items})
        return grouped

    @staticmethod
    def _format_waypoint(
        order: int, latitude: float, longitude: float, altitude: float | None
    ) -> str:
        label = f"{order:02d}. lat {latitude:.5f}, lon {longitude:.5f}"
        if altitude is not None:
            label += f" · alt {altitude:.1f} m"
        return label

    @staticmethod
    def _to_data_uri(stream: io.BytesIO | None) -> str | None:
        if not stream or stream.getbuffer().nbytes == 0:
            return None
        stream.seek(0)
        encoded = base64.b64encode(stream.read()).decode("ascii")
        return f"data:image/png;base64,{encoded}"

    @classmethod
    def _summarize_telemetry(
        cls, points: Sequence[TelemetryData]
    ) -> dict[str, Any]:
        summary: dict[str, Any] = {
            "has_data": bool(points),
            "point_count": len(points),
            "distance_m": 0.0,
            "distance_display": "—",
            "altitude": cls._series_stats([]),
            "battery": cls._series_stats([]),
            "signal": cls._series_stats([]),
            "snr": cls._series_stats([]),
            "speed": cls._series_stats([]),
        }
        if not points:
            return summary

        altitudes: list[float] = []
        batteries: list[float] = []
        signals: list[float] = []
        snr_values: list[float] = []
        speeds: list[float] = []
        distance = 0.0

        prev = None
        for point in points:
            if point.altitude is not None:
                altitudes.append(float(point.altitude))
            if point.battery_voltage is not None:
                batteries.append(float(point.battery_voltage))
            if point.rssi is not None:
                signals.append(float(point.rssi))
            if point.snr is not None:
                snr_values.append(float(point.snr))

            if prev and point.time and prev.time:
                dist = FlightSessionService._haversine_meters(
                    prev.latitude,
                    prev.longitude,
                    point.latitude,
                    point.longitude,
                )
                if dist is not None:
                    distance += dist
                    delta_seconds = (point.time - prev.time).total_seconds()
                    if delta_seconds > 0:
                        speeds.append(dist / delta_seconds)
            prev = point

        summary["distance_m"] = distance
        summary["distance_display"] = cls._format_distance(distance)
        summary["altitude"] = cls._series_stats(altitudes)
        summary["battery"] = cls._series_stats(batteries)
        summary["signal"] = cls._series_stats(signals)
        summary["snr"] = cls._series_stats(snr_values)
        summary["speed"] = cls._series_stats(speeds)
        return summary

    @staticmethod
    def _series_stats(series: Sequence[float]) -> dict[str, float | None]:
        if not series:
            return {"min": None, "max": None, "avg": None, "latest": None}
        minimum = round(min(series), 2)
        maximum = round(max(series), 2)
        average = round(sum(series) / len(series), 2)
        latest = round(series[-1], 2)
        return {"min": minimum, "max": maximum, "avg": average, "latest": latest}

    @classmethod
    def _mission_timeline(
        cls,
        sessions: Sequence[FlightSession],
        points: Sequence[TelemetryData],
    ) -> dict[str, Any] | None:
        start_candidates: list[datetime] = []
        end_candidates: list[datetime] = []
        for session in sessions:
            if session.start_time:
                start_candidates.append(session.start_time)
            if session.end_time:
                end_candidates.append(session.end_time)
        if points:
            first_time = points[0].time
            last_time = points[-1].time
            if first_time:
                start_candidates.append(first_time)
            if last_time:
                end_candidates.append(last_time)
        if not start_candidates or not end_candidates:
            return None

        start_time = min(start_candidates)
        end_time = max(end_candidates)
        duration_seconds = max(0, (end_time - start_time).total_seconds())
        last_contact = points[-1].time if points else end_time
        if not last_contact:
            last_contact = end_time

        return {
            "start": start_time,
            "end": end_time,
            "start_display": cls._format_datetime(start_time),
            "end_display": cls._format_datetime(end_time),
            "duration_seconds": duration_seconds,
            "duration_display": cls._format_duration(duration_seconds),
            "session_count": len(sessions),
            "point_count": len(points),
            "last_contact_display": cls._format_datetime(last_contact),
        }

    @staticmethod
    def _format_distance(distance_meters: float | None) -> str:
        if distance_meters is None:
            return "—"
        if distance_meters >= 1000:
            return f"{distance_meters / 1000:.2f} km"
        return f"{distance_meters:.0f} m"

    @staticmethod
    def _format_metric(value: float | None, suffix: str, decimals: int = 1) -> str:
        if value is None:
            return "—"
        return f"{value:.{decimals}f}{suffix}"

    @staticmethod
    def _range_text(stats: dict[str, float | None], suffix: str) -> str:
        low = stats.get("min")
        high = stats.get("max")
        if low is None or high is None:
            return "N/A"
        return f"{low:.2f}{suffix} to {high:.2f}{suffix}"

    @staticmethod
    def _ensure_timezone(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    @staticmethod
    def _format_datetime(value: datetime | None) -> str:
        if not value:
            return "—"
        try:
            jakarta = ZoneInfo("Asia/Jakarta")
        except Exception:
            return value.strftime("%Y-%m-%d %H:%M")

        current_value = value
        if current_value.tzinfo is None:
            current_value = current_value.replace(tzinfo=timezone.utc)

        try:
            localized = current_value.astimezone(jakarta)
        except ValueError:
            localized = current_value
        return localized.strftime("%Y-%m-%d %H:%M")

    @staticmethod
    def _format_duration(seconds: float | None) -> str:
        if seconds is None:
            return "—"
        total_seconds = int(seconds)
        hours, remainder = divmod(total_seconds, 3600)
        minutes, secs = divmod(remainder, 60)
        parts: list[str] = []
        if hours:
            parts.append(f"{hours}h")
        if minutes:
            parts.append(f"{minutes}m")
        if not parts and secs:
            parts.append(f"{secs}s")
        elif secs and hours == 0:
            parts.append(f"{secs}s")
        return " ".join(parts) if parts else "0s"

    @classmethod
    def _render_mission_map(cls, mission: Mission) -> io.BytesIO:
        waypoints = sorted(
            list(getattr(mission, "waypoints", []) or []),
            key=lambda wp: wp.order,
        )
        geofences = list(getattr(mission, "active_geofences", []) or [])
        if not waypoints and not geofences:
            return io.BytesIO()

        all_latitudes: list[float] = []
        all_longitudes: list[float] = []

        valid_waypoints = [
            wp for wp in waypoints if wp.latitude is not None and wp.longitude is not None
        ]
        if valid_waypoints:
            all_latitudes.extend([wp.latitude for wp in valid_waypoints])
            all_longitudes.extend([wp.longitude for wp in valid_waypoints])

        for geofence in geofences:
            points = sorted(
                getattr(geofence, "points", []),
                key=lambda point: point.order,
            )
            filtered_points = [
                point
                for point in points
                if point.latitude is not None and point.longitude is not None
            ]
            if len(filtered_points) >= 3:
                all_longitudes.extend([p.longitude for p in filtered_points])
                all_latitudes.extend([p.latitude for p in filtered_points])

        if not all_latitudes or not all_longitudes:
            return io.BytesIO()

        basemap = cls._build_basemap(all_latitudes, all_longitudes)
        use_mercator = basemap is not None

        plt.style.use("seaborn-v0_8")
        fig, ax = plt.subplots(figsize=(4.6, 4.6), dpi=220)
        fig.patch.set_facecolor("#f8fafc")
        ax.set_facecolor("#f1f5f9")
        ax.tick_params(colors="#334155", labelsize=6)
        ax.set_aspect("auto")
        if basemap:
            basemap_image, mercator_extent, bounds = basemap
            ax.imshow(basemap_image, extent=mercator_extent, origin="upper")
            ax.set_xlim(mercator_extent[0], mercator_extent[1])
            ax.set_ylim(mercator_extent[2], mercator_extent[3])
            ax.grid(False)
            cls._apply_basemap_ticks(ax, bounds)
        else:
            ax.grid(True, linestyle="--", linewidth=0.5, alpha=0.35)

        def project(latitude: float, longitude: float) -> tuple[float, float]:
            if use_mercator:
                return cls._to_mercator(latitude, longitude)
            return longitude, latitude

        if valid_waypoints:
            latitudes = [wp.latitude for wp in valid_waypoints]
            longitudes = [wp.longitude for wp in valid_waypoints]
            projected = [project(lat, lon) for lat, lon in zip(latitudes, longitudes)]
            xs = [point[0] for point in projected]
            ys = [point[1] for point in projected]
            ax.plot(
                xs,
                ys,
                marker="o",
                color="#166534",
                linewidth=1.8,
                label="Waypoints",
            )
            ax.scatter(
                xs[0],
                ys[0],
                color="#2563eb",
                s=40,
                zorder=5,
                label="Start",
            )
            ax.scatter(
                xs[-1],
                ys[-1],
                color="#dc2626",
                s=40,
                zorder=5,
                label="End",
            )
            ax.annotate(
                "Start",
                (xs[0], ys[0]),
                textcoords="offset points",
                xytext=(-4, 10),
                fontsize=6,
                color="#1f2937",
            )
            ax.annotate(
                "Finish",
                (xs[-1], ys[-1]),
                textcoords="offset points",
                xytext=(-4, 10),
                fontsize=6,
                color="#1f2937",
            )

        palette_cycle = cycle(["#bae6fd", "#fde68a", "#f5d0fe", "#bbf7d0", "#fecdd3"])
        for geofence in geofences:
            points = sorted(
                getattr(geofence, "points", []),
                key=lambda point: point.order,
            )
            filtered_points = [
                point
                for point in points
                if point.latitude is not None and point.longitude is not None
            ]
            if len(filtered_points) >= 3:
                projected = [
                    project(point.latitude, point.longitude)
                    for point in filtered_points
                ]
                xs = [point[0] for point in projected] + [projected[0][0]]
                ys = [point[1] for point in projected] + [projected[0][1]]
                face_color = next(palette_cycle)
                label = (
                    getattr(geofence, "area_name", None)
                    or getattr(geofence, "geofence_name", None)
                    or getattr(geofence, "name", None)
                    or "Geofence"
                )
                if label.startswith("_"):
                    label = label.lstrip("_") or "Geofence"
                ax.fill(
                    xs,
                    ys,
                    alpha=0.35,
                    color=face_color,
                    label=label,
                )
                ax.plot(xs, ys, linestyle="--", color="#f97316", linewidth=0.9)
                centroid_x, centroid_y = cls._polygon_centroid(projected)
                ax.text(
                    centroid_x,
                    centroid_y,
                    label,
                    fontsize=6,
                    color="#0f172a",
                    ha="center",
                    va="center",
                    weight="bold",
                    bbox={
                        "boxstyle": "round,pad=0.18",
                        "facecolor": face_color,
                        "alpha": 0.75,
                        "edgecolor": "#64748b",
                    },
                    zorder=6,
                )

        if not basemap:
            lat_min, lat_max = min(all_latitudes), max(all_latitudes)
            lon_min, lon_max = min(all_longitudes), max(all_longitudes)
            lat_span = max(lat_max - lat_min, 1e-6)
            lon_span = max(lon_max - lon_min, 1e-6)
            pad_lat = max(lat_span * 0.08, 0.0003)
            pad_lon = max(lon_span * 0.08, 0.0003)
            ax.set_ylim(lat_min - pad_lat, lat_max + pad_lat)
            ax.set_xlim(lon_min - pad_lon, lon_max + pad_lon)

        ax.set_title("Mission Layout", fontsize=9, color="#0f172a", pad=8)
        ax.set_xlabel("Longitude", fontsize=7)
        ax.set_ylabel("Latitude", fontsize=7)
        if ax.has_data():
            handles, labels = ax.get_legend_handles_labels()
            clean_handles: list = []
            clean_labels: list[str] = []
            seen_labels: set[str] = set()
            for handle, label in zip(handles, labels):
                if not label or label.startswith("_") or label in seen_labels:
                    continue
                seen_labels.add(label)
                clean_handles.append(handle)
                clean_labels.append(label)
            if clean_handles:
                legend = ax.legend(
                    clean_handles,
                    clean_labels,
                    loc="upper right",
                    frameon=True,
                    fontsize=6,
                )
                legend.get_frame().set_facecolor("#f8fafc")
                legend.get_frame().set_edgecolor("#cbd5f5")

        stream = io.BytesIO()
        fig.tight_layout()
        fig.savefig(stream, format="png", dpi=200)
        plt.close(fig)
        stream.seek(0)
        return stream

    @classmethod
    def _build_basemap(
        cls, latitudes: Sequence[float], longitudes: Sequence[float]
    ) -> tuple[Image.Image, tuple[float, float, float, float], tuple[float, float, float, float]] | None:
        if not latitudes or not longitudes:
            return None
        lat_min, lat_max = min(latitudes), max(latitudes)
        lon_min, lon_max = min(longitudes), max(longitudes)
        lat_span = max(lat_max - lat_min, 1e-6)
        lon_span = max(lon_max - lon_min, 1e-6)
        pad_lat = max(lat_span * 0.08, 0.0003)
        pad_lon = max(lon_span * 0.08, 0.0003)
        south = lat_min - pad_lat
        north = lat_max + pad_lat
        west = lon_min - pad_lon
        east = lon_max + pad_lon

        zoom = cls._choose_tile_zoom(south, north, west, east)
        if zoom is None:
            return None
        x_min, y_min = cls._tile_xy(north, west, zoom)
        x_max, y_max = cls._tile_xy(south, east, zoom)
        x_min, x_max = sorted((x_min, x_max))
        y_min, y_max = sorted((y_min, y_max))

        tiles_x = x_max - x_min + 1
        tiles_y = y_max - y_min + 1
        if tiles_x * tiles_y > cls.MAP_TILE_MAX:
            return None

        canvas = Image.new(
            "RGB",
            (tiles_x * cls.MAP_TILE_SIZE, tiles_y * cls.MAP_TILE_SIZE),
            color="#f8fafc",
        )
        success_count = 0
        subdomains = cycle(cls.MAP_TILE_SUBDOMAINS)
        with httpx.Client(timeout=5.0) as client:
            for x in range(x_min, x_max + 1):
                for y in range(y_min, y_max + 1):
                    subdomain = next(subdomains)
                    url = cls.MAP_TILE_URL.format(s=subdomain, z=zoom, x=x, y=y)
                    tile = cls._fetch_tile(client, url)
                    if tile is not None:
                        success_count += 1
                    else:
                        tile = Image.new(
                            "RGB",
                            (cls.MAP_TILE_SIZE, cls.MAP_TILE_SIZE),
                            color="#f1f5f9",
                        )
                    offset = (
                        (x - x_min) * cls.MAP_TILE_SIZE,
                        (y - y_min) * cls.MAP_TILE_SIZE,
                    )
                    canvas.paste(tile, offset)

        if success_count == 0:
            return None

        north_lat, west_lon = cls._tile_to_lat_lon(x_min, y_min, zoom)
        south_lat, east_lon = cls._tile_to_lat_lon(x_max + 1, y_max + 1, zoom)
        west_x, north_y = cls._to_mercator(north_lat, west_lon)
        east_x, south_y = cls._to_mercator(south_lat, east_lon)
        extent = (west_x, east_x, south_y, north_y)
        bounds = (west_lon, south_lat, east_lon, north_lat)
        return canvas, extent, bounds

    @classmethod
    def _fetch_tile(
        cls, client: httpx.Client, url: str
    ) -> Image.Image | None:
        try:
            response = client.get(url)
            if response.status_code != 200:
                return None
            tile = Image.open(io.BytesIO(response.content))
            return tile.convert("RGB")
        except Exception:
            return None

    @classmethod
    def _choose_tile_zoom(
        cls, south: float, north: float, west: float, east: float
    ) -> int | None:
        for zoom in range(17, 11, -1):
            x_min, y_min = cls._tile_xy(north, west, zoom)
            x_max, y_max = cls._tile_xy(south, east, zoom)
            tiles_x = abs(x_max - x_min) + 1
            tiles_y = abs(y_max - y_min) + 1
            if tiles_x * tiles_y <= cls.MAP_TILE_MAX:
                return zoom
        return 12

    @staticmethod
    def _apply_basemap_ticks(
        ax: Axes, bounds: tuple[float, float, float, float]
    ) -> None:
        west, south, east, north = bounds
        lon_ticks = MissionExportService._build_tick_values(west, east)
        lat_ticks = MissionExportService._build_tick_values(south, north)
        ax.set_xticks(
            [MissionExportService._to_mercator(0.0, lon)[0] for lon in lon_ticks]
        )
        ax.set_yticks(
            [MissionExportService._to_mercator(lat, 0.0)[1] for lat in lat_ticks]
        )
        ax.set_xticklabels([f"{lon:.4f}" for lon in lon_ticks])
        ax.set_yticklabels([f"{lat:.4f}" for lat in lat_ticks])

    @staticmethod
    def _build_tick_values(min_value: float, max_value: float) -> list[float]:
        if min_value == max_value:
            return [min_value]
        step = (max_value - min_value) / 4
        return [min_value + step * idx for idx in range(5)]

    @staticmethod
    def _clamp_latitude(latitude: float) -> float:
        return max(min(latitude, 85.05112878), -85.05112878)

    @classmethod
    def _to_mercator(cls, latitude: float, longitude: float) -> tuple[float, float]:
        lat = math.radians(cls._clamp_latitude(latitude))
        lon = math.radians(longitude)
        radius = 6378137.0
        x = radius * lon
        y = radius * math.log(math.tan(math.pi / 4 + lat / 2))
        return x, y

    @classmethod
    def _tile_xy(cls, latitude: float, longitude: float, zoom: int) -> tuple[int, int]:
        lat = cls._clamp_latitude(latitude)
        n = 2**zoom
        x = int((longitude + 180.0) / 360.0 * n)
        lat_rad = math.radians(lat)
        y = int(
            (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi)
            / 2.0
            * n
        )
        return x, y

    @classmethod
    def _tile_to_lat_lon(cls, x: int, y: int, zoom: int) -> tuple[float, float]:
        n = 2**zoom
        lon = x / n * 360.0 - 180.0
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
        return math.degrees(lat_rad), lon

    @staticmethod
    def _polygon_centroid(
        vertices: Sequence[tuple[float, float]]
    ) -> tuple[float, float]:
        """Return centroid for a closed polygon defined by longitude/latitude pairs."""

        points = list(vertices)
        if not points:
            return (0.0, 0.0)
        if len(points) == 1:
            return points[0]

        area = 0.0
        cx = 0.0
        cy = 0.0
        for idx, (x0, y0) in enumerate(points):
            x1, y1 = points[(idx + 1) % len(points)]
            cross = x0 * y1 - x1 * y0
            area += cross
            cx += (x0 + x1) * cross
            cy += (y0 + y1) * cross

        area *= 0.5
        if abs(area) < 1e-12:
            avg_x = sum(x for x, _ in points) / len(points)
            avg_y = sum(y for _, y in points) / len(points)
            return (avg_x, avg_y)

        cx /= 6.0 * area
        cy /= 6.0 * area
        return (cx, cy)

    @staticmethod
    def _render_metric_chart(
        points: Sequence[TelemetryData],
        *,
        attr: str,
        title: str,
        ylabel: str,
        legend_label: str,
        color: str,
    ) -> io.BytesIO:
        if not points:
            return io.BytesIO()

        ordered = [
            entry
            for entry in sorted(
                points,
                key=lambda entry: entry.time or datetime.min,
            )
            if entry.time
        ]
        if not ordered:
            return io.BytesIO()
        baseline = ordered[0].time
        time_axis = [
            (entry.time - baseline).total_seconds() / 60.0 for entry in ordered
        ]

        series = [
            (time, getattr(entry, attr, None))
            for time, entry in zip(time_axis, ordered)
        ]
        filtered = [
            (time, float(value))
            for time, value in series
            if value is not None
        ]
        if not filtered:
            return io.BytesIO()

        times, values = zip(*filtered)

        plt.style.use("seaborn-v0_8")
        fig, ax = plt.subplots(figsize=(12.0, 3.0), dpi=220)
        ax.set_facecolor("#f8fafc")
        ax.grid(True, linestyle="--", linewidth=0.4, alpha=0.5)

        ax.plot(
            list(times),
            list(values),
            label=legend_label,
            color=color,
            linewidth=1.9,
        )

        ax.set_xlabel("Elapsed time (minutes)", fontsize=10)
        ax.set_ylabel(ylabel, fontsize=10)
        ax.set_title(title, fontsize=12, color="#0f172a")
        ax.legend(loc="best")

        stream = io.BytesIO()
        fig.tight_layout()
        fig.savefig(stream, format="png", dpi=180)
        plt.close(fig)
        stream.seek(0)
        return stream


__all__ = ["MissionExportService"]

