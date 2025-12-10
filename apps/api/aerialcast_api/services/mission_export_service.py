"""Mission PDF export helpers powered by WeasyPrint."""

from __future__ import annotations

import base64
import io
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
from itertools import cycle
from typing import Any, Iterable, Sequence

import matplotlib

matplotlib.use("Agg")  # noqa: E402
import matplotlib.pyplot as plt
from flask import current_app, render_template
from weasyprint import HTML

from ..models.execution import FlightSession, TelemetryData
from ..models.planning import (
    Mission,
    MissionPostflightChecklistItem,
    MissionPreflightChecklistItem,
)
from .flight_session_service import FlightSessionService
from .mission_service import MissionService


class MissionExportService:
    """Render a mission summary PDF including telemetry analytics."""

    telemetry_repository = FlightSessionService.telemetry_repository

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

        map_stream = (
            io.BytesIO(map_image_bytes)
            if map_image_bytes
            else cls._render_mission_map(mission)
        )
        chart_stream = cls._render_signal_chart(telemetry_points)

        context = cls._build_template_context(
            mission=mission,
            telemetry_summary=telemetry_summary,
            timeline_summary=timeline_summary,
            map_stream=map_stream,
            chart_stream=chart_stream,
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
        chart_stream: io.BytesIO,
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
                or str(mission.drone_id),
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

        return {
            "mission_name": mission.mission_name,
            "generated_at": cls._format_datetime(datetime.utcnow()),
            "metadata": metadata,
            "timeline_rows": timeline_rows,
            "telemetry_cards": telemetry_cards,
            "mission_notes": mission.notes or "",
            "waypoints": waypoints,
            "map_data_uri": cls._to_data_uri(map_stream),
            "signal_data_uri": cls._to_data_uri(chart_stream),
            "operations_left": operations_left,
            "operations_right": operations_right,
            "preflight_groups": preflight_groups,
            "postflight_groups": postflight_groups,
            "logo_data_uri": cls._load_logo_data_uri(),
        }

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
    def _format_datetime(value: datetime | None) -> str:
        if not value:
            return "—"
        try:
            localized = value.astimezone()
        except ValueError:
            localized = value
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

        plt.style.use("seaborn-v0_8")
        fig, ax = plt.subplots(figsize=(4.8, 3.2), dpi=220)
        fig.patch.set_facecolor("#f8fafc")
        ax.set_facecolor("#e2e8f0")
        ax.tick_params(colors="#334155", labelsize=9)
        ax.grid(True, linestyle="--", linewidth=0.5, alpha=0.35)
        ax.set_aspect("equal", adjustable="datalim")

        if waypoints:
            latitudes = [wp.latitude for wp in waypoints]
            longitudes = [wp.longitude for wp in waypoints]
            ax.plot(
                longitudes,
                latitudes,
                marker="o",
                color="#166534",
                linewidth=2.4,
                label="Waypoints",
            )
            ax.scatter(
                longitudes[0],
                latitudes[0],
                color="#2563eb",
                s=60,
                zorder=5,
                label="Start",
            )
            ax.scatter(
                longitudes[-1],
                latitudes[-1],
                color="#dc2626",
                s=60,
                zorder=5,
                label="End",
            )
            ax.annotate(
                "Start",
                (longitudes[0], latitudes[0]),
                textcoords="offset points",
                xytext=(-4, 10),
                fontsize=8,
                color="#1f2937",
            )
            ax.annotate(
                "Finish",
                (longitudes[-1], latitudes[-1]),
                textcoords="offset points",
                xytext=(-4, 10),
                fontsize=8,
                color="#1f2937",
            )

        palette_cycle = cycle(["#bae6fd", "#fde68a", "#f5d0fe", "#bbf7d0", "#fecdd3"])
        for geofence in geofences:
            points = sorted(
                getattr(geofence, "points", []),
                key=lambda point: point.order,
            )
            if len(points) >= 3:
                xs = [p.longitude for p in points] + [points[0].longitude]
                ys = [p.latitude for p in points] + [points[0].latitude]
                face_color = next(palette_cycle)
                label = geofence.area_name or "Geofence"
                if label.startswith("_"):
                    label = label.lstrip("_") or "Geofence"
                ax.fill(
                    xs,
                    ys,
                    alpha=0.35,
                    color=face_color,
                    label=label,
                )
                ax.plot(xs, ys, linestyle="--", color="#f97316", linewidth=1.15)
                centroid_x = sum(xs[:-1]) / (len(xs) - 1)
                centroid_y = sum(ys[:-1]) / (len(ys) - 1)
                ax.text(
                    centroid_x,
                    centroid_y,
                    geofence.area_name or "Geofence",
                    fontsize=8,
                    color="#0f172a",
                    ha="center",
                )

        ax.set_title("Mission Layout", fontsize=13, color="#0f172a", pad=14)
        ax.set_xlabel("Longitude", fontsize=10)
        ax.set_ylabel("Latitude", fontsize=10)
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
                    fontsize=9,
                )
                legend.get_frame().set_facecolor("#f8fafc")
                legend.get_frame().set_edgecolor("#cbd5f5")

        stream = io.BytesIO()
        fig.tight_layout()
        fig.savefig(stream, format="png", dpi=200)
        plt.close(fig)
        stream.seek(0)
        return stream

    @staticmethod
    def _render_signal_chart(points: Sequence[TelemetryData]) -> io.BytesIO:
        if not points:
            return io.BytesIO()

        ordered = sorted(points, key=lambda entry: entry.time)
        baseline = ordered[0].time
        time_axis = [
            (entry.time - baseline).total_seconds() / 60.0 for entry in ordered
        ]
        rssi = [entry.rssi for entry in ordered]
        snr = [entry.snr for entry in ordered]

        plt.style.use("seaborn-v0_8")
        fig, ax = plt.subplots(figsize=(6.0, 4.2), dpi=220)
        ax.set_facecolor("#f8fafc")
        ax.grid(True, linestyle="--", linewidth=0.4, alpha=0.5)

        rssi_series = [
            (time, value)
            for time, value in zip(time_axis, rssi)
            if value is not None
        ]
        snr_series = [
            (time, value)
            for time, value in zip(time_axis, snr)
            if value is not None
        ]
        if rssi_series:
            rssi_times, rssi_values = zip(*rssi_series)
            ax.plot(
                list(rssi_times),
                list(rssi_values),
                label="RSSI (dBm)",
                color="#2563eb",
                linewidth=1.9,
            )
        if snr_series:
            snr_times, snr_values = zip(*snr_series)
            ax.plot(
                list(snr_times),
                list(snr_values),
                label="SNR (dB)",
                color="#16a34a",
                linewidth=1.9,
            )

        ax.set_xlabel("Elapsed time (minutes)", fontsize=10)
        ax.set_ylabel("Signal", fontsize=10)
        ax.set_title("RSSI & SNR Trend", fontsize=13, color="#0f172a")
        ax.legend(loc="best")

        stream = io.BytesIO()
        fig.tight_layout()
        fig.savefig(stream, format="png", dpi=180)
        plt.close(fig)
        stream.seek(0)
        return stream


__all__ = ["MissionExportService"]

