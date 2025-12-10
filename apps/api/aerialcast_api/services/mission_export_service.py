"""PDF export helpers for mission flight logs."""

from __future__ import annotations

import io
from collections import defaultdict
from datetime import datetime
from itertools import cycle
from textwrap import wrap
from typing import Any, Iterable, Sequence

import matplotlib

matplotlib.use("Agg")  # noqa: E402
import matplotlib.pyplot as plt
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

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
            mission.flight_sessions,
            key=lambda session: session.start_time or datetime.min,
        )
        telemetry_points: list[TelemetryData] = []
        for session in sessions:


            telemetry_points.extend(
                cls.telemetry_repository.list_for_session(session.session_id)
            )
        telemetry_points.sort(key=lambda point: point.time)

        telemetry_summary = cls._summarize_telemetry(telemetry_points)
        timeline_summary = cls._mission_timeline(sessions, telemetry_points)

        map_image = (
            io.BytesIO(map_image_bytes)
            if map_image_bytes
            else cls._render_mission_map(mission)
        )
        telemetry_chart = cls._render_signal_chart(telemetry_points)

        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)


        width, height = A4
        margin = 2 * cm

        cls._draw_overview(
            pdf,
            mission,
            telemetry_summary,
            timeline_summary,
            width,
            height,
            margin,
        )
        pdf.showPage()

        cls._draw_map_page(pdf, map_image, width, height, margin)
        pdf.showPage()



        cls._draw_signal_page(pdf, telemetry_chart, width, height, margin)
        pdf.showPage()

        cls._draw_checklist_page(
            pdf,
            "Pre-flight Checklist",
            mission.preflight_checklist.items if mission.preflight_checklist else [],
            width,
            height,
            margin,
        )
        pdf.showPage()

        cls._draw_checklist_page(
            pdf,
            "Post-flight Checklist",
            mission.postflight_checklist.items if mission.postflight_checklist else [],
            width,
            height,
            margin,
        )
        pdf.save()
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def _draw_page_header(
        cls,
        pdf: canvas.Canvas,
        title: str,
        width: float,
        height: float,
        margin: float,
    ) -> float:
        top = height - margin
        header_height = 42
        pdf.setFillColor(HexColor("#0f172a"))
        pdf.roundRect(
            margin,
            top - header_height,
            width - 2 * margin,
            header_height,
            10,
            fill=1,
            stroke=0,
        )
        accent_width = 28
        pdf.setFillColor(HexColor("#38bdf8"))
        pdf.roundRect(
            margin,
            top - header_height,
            accent_width,
            header_height,
            10,
            fill=1,
            stroke=0,
        )
        pdf.setFillColor(HexColor("#f8fafc"))
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(margin + accent_width + 10, top - 18, "AerialCast")
        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(HexColor("#cbd5f5"))
        pdf.drawString(margin + accent_width + 10, top - 32, "Mission Flight Log")
        pdf.setFillColor(HexColor("#0f172a"))
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(margin, top - header_height - 16, title)
        pdf.setFillColorRGB(0, 0, 0)
        return top - header_height - 32

    @classmethod
    def _draw_overview(
        cls,
        pdf: canvas.Canvas,
        mission: Mission,
        telemetry_summary: dict[str, Any],
        timeline_summary: dict[str, Any] | None,
        width: float,
        height: float,
        margin: float,
    ) -> None:
        y = cls._draw_page_header(
            pdf,
            f"Mission: {mission.mission_name}",
            width,
            height,
            margin,
        )

        pdf.setFont("Helvetica", 12)
        metadata = [
            ("Mission ID", str(mission.mission_id)),
            (
                "Status",
                mission.status.name
                if getattr(mission.status, "name", None)
                else str(mission.status),
            ),
            (
                "Created",
                mission.created_at.strftime("%Y-%m-%d %H:%M")
                if mission.created_at
                else "—",
            ),
            (
                "Pilot",
                getattr(mission.assigned_pilot, "full_name", None)
                or getattr(mission.creator, "full_name", None)
                or "Unknown",
            ),
            (
                "Drone",
                getattr(mission.drone, "drone_name", None) or str(mission.drone_id),
            ),
        ]
        for label, value in metadata:
            pdf.drawString(margin, y, f"{label}: {value}")
            y -= 14

        if timeline_summary:
            y -= 6
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(margin, y, "Flight Timeline")
            y -= 16
            pdf.setFont("Helvetica", 11)
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
            y = cls._draw_two_column_rows(pdf, timeline_rows, width, margin, y)

        if telemetry_summary.get("has_data"):
            y -= 6
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(margin, y, "Telemetry Summary")
            y -= 16
            pdf.setFont("Helvetica", 11)

            altitude_stats = telemetry_summary["altitude"]
            battery_stats = telemetry_summary["battery"]
            speed_stats = telemetry_summary["speed"]
            signal_stats = telemetry_summary["signal"]
            snr_stats = telemetry_summary["snr"]

            altitude_range = (
                f"{altitude_stats['min']:.0f}–{altitude_stats['max']:.0f} m"
                if altitude_stats["min"] is not None and altitude_stats["max"] is not None
                else "—"
            )
            battery_range = (
                f"{battery_stats['min']:.2f}–{battery_stats['max']:.2f} V"
                if battery_stats["min"] is not None and battery_stats["max"] is not None
                else "—"
            )
            signal_range = (
                f"{signal_stats['min']:.0f}–{signal_stats['max']:.0f} dBm"
                if signal_stats["min"] is not None and signal_stats["max"] is not None
                else "—"
            )
            snr_average = (
                f"{snr_stats['avg']:.1f} dB"
                if snr_stats["avg"] is not None
                else "—"
            )

            telemetry_rows = [
                (
                    f"Distance traveled: {telemetry_summary['distance_display']}",
                    f"Average speed: {cls._format_metric(speed_stats['avg'], 'm/s')}",
                ),
                (
                    f"Top speed: {cls._format_metric(speed_stats['max'], 'm/s')}",
                    f"Altitude range: {altitude_range}",
                ),
                (
                    f"Battery range: {battery_range}",
                    f"RSSI range: {signal_range}",
                ),
                (
                    f"Last battery reading: {cls._format_metric(battery_stats['latest'], 'V', 2)}",
                    f"Average SNR: {snr_average}",
                ),
            ]
            y = cls._draw_two_column_rows(pdf, telemetry_rows, width, margin, y)
        else:
            y -= 8
            pdf.setFont("Helvetica-Oblique", 11)
            pdf.drawString(margin, y, "No telemetry data recorded for this mission.")
            y -= 14

        if mission.notes:
            y -= 8
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(margin, y, "Mission Notes:")
            y -= 16
            pdf.setFont("Helvetica", 11)
            for line in wrap(mission.notes, width=90):
                pdf.drawString(margin, y, line)
                y -= 14

        if mission.waypoints:
            y -= 6
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(margin, y, "Waypoints:")
            y -= 16
            pdf.setFont("Helvetica", 11)
            for waypoint in sorted(mission.waypoints, key=lambda wp: wp.order):
                label = (
                    f"{waypoint.order:02d}. lat {waypoint.latitude:.5f},"
                    f" lon {waypoint.longitude:.5f}"
                )
                if waypoint.altitude is not None:
                    label += f" · alt {waypoint.altitude:.1f} m"
                pdf.drawString(margin + 10, y, label)
                y -= 14
                if y < margin + 40:
                    pdf.showPage()
                    y = cls._draw_page_header(
                        pdf,
                        "Mission Waypoints (continued)",
                        width,
                        height,
                        margin,
                    )
                    pdf.setFont("Helvetica", 11)

    @staticmethod
    def _draw_two_column_rows(
        pdf: canvas.Canvas,
        rows: Sequence[tuple[str, str | None]],
        width: float,
        margin: float,
        y: float,
        line_height: float = 14,
    ) -> float:
        column_width = (width - 2 * margin) / 2
        second_column_x = margin + column_width
        for left, right in rows:
            pdf.drawString(margin, y, left)
            if right:
                pdf.drawString(second_column_x, y, right)
            y -= line_height
        return y
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

            if prev:
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
            start_candidates.append(points[0].time)
            end_candidates.append(points[-1].time)
        if not start_candidates or not end_candidates:
            return None

        start_time = min(start_candidates)
        end_time = max(end_candidates)
        duration_seconds = max(0, (end_time - start_time).total_seconds())
        last_contact = points[-1].time if points else end_time

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
    def _draw_map_page(
        cls,
        pdf: canvas.Canvas,
        image_stream: io.BytesIO,
        width: float,
        height: float,
        margin: float,
    ) -> None:
        cls._draw_page_header(pdf, "Mission Footprint", width, height, margin)
        if image_stream.getbuffer().nbytes == 0:
            pdf.setFont("Helvetica", 12)
            pdf.drawString(margin, height / 2, "Map data unavailable")
            return

        image_stream.seek(0)
        image = ImageReader(image_stream)
        img_width, img_height = image.getSize()
        available_width = width - 2 * margin
        available_height = height - 2 * margin - 20
        scale = min(available_width / img_width, available_height / img_height)
        draw_width = img_width * scale
        draw_height = img_height * scale
        x = (width - draw_width) / 2
        y = (height - draw_height) / 2 - 20

        pdf.setFillColor(HexColor("#e2e8f0"))
        pdf.roundRect(
            x - 6,
            y - 6,
            draw_width + 12,
            draw_height + 12,
            8,
            fill=1,
            stroke=0,
        )
        pdf.drawImage(image, x, y, width=draw_width, height=draw_height)
        pdf.setFillColorRGB(0, 0, 0)

    @classmethod
    def _draw_signal_page(
        cls,
        pdf: canvas.Canvas,
        image_stream: io.BytesIO,
        width: float,
        height: float,
        margin: float,
    ) -> None:
        cls._draw_page_header(
            pdf,
            "Signal Quality Overview",
            width,
            height,
            margin,
        )
        if image_stream.getbuffer().nbytes == 0:
            pdf.setFont("Helvetica", 12)
            pdf.drawString(margin, height / 2, "Telemetry data unavailable")
            return

        image_stream.seek(0)
        image = ImageReader(image_stream)
        img_width, img_height = image.getSize()
        available_width = width - 2 * margin
        available_height = height - 2 * margin - 20
        scale = min(available_width / img_width, available_height / img_height)
        draw_width = img_width * scale
        draw_height = img_height * scale
        x = (width - draw_width) / 2
        y = (height - draw_height) / 2 - 20

        pdf.setFillColor(HexColor("#e2e8f0"))
        pdf.roundRect(
            x - 6,
            y - 6,
            draw_width + 12,
            draw_height + 12,
            8,
            fill=1,
            stroke=0,
        )
        pdf.drawImage(image, x, y, width=draw_width, height=draw_height)
        pdf.setFillColorRGB(0, 0, 0)

    @classmethod
    def _draw_checklist_page(
        cls,
        pdf: canvas.Canvas,
        title: str,
        items: Iterable[MissionPreflightChecklistItem]
        | Iterable[MissionPostflightChecklistItem],
        width: float,
        height: float,
        margin: float,
    ) -> None:
        y = cls._draw_page_header(pdf, title, width, height, margin)

        groups: dict[str, list] = defaultdict(list)
        for item in items:
            section = item.section_title or "General"
            groups[section].append(item)

        if not groups:
            pdf.setFont("Helvetica", 12)
            pdf.drawString(margin, y, "No checklist entries recorded.")
            return

        line_height = 12
        for section, entries in sorted(groups.items(), key=lambda entry: entry[0]):
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(margin, y, section)
            y -= line_height
            pdf.setFont("Helvetica", 11)
            for item in entries:
                status_token = "[x]" if item.is_completed else "[ ]"
                note_suffix = f" — note: {item.note}" if item.note else ""
                bullet = f"{status_token} {item.item_text}{note_suffix}"
                for line in wrap(bullet, width=90):
                    pdf.drawString(margin + 12, y, line)
                    y -= line_height
                    if y < margin + 40:
                        pdf.showPage()
                        y = cls._draw_page_header(
                            pdf,
                            f"{title} (continued)",
                            width,
                            height,
                            margin,
                        )
                        pdf.setFont("Helvetica", 11)
            y -= line_height

    @classmethod
    def _render_mission_map(cls, mission: Mission) -> io.BytesIO:
        waypoints = sorted(mission.waypoints, key=lambda wp: wp.order)
        geofences = getattr(mission, "active_geofences", [])
        if not waypoints and not geofences:
            return io.BytesIO()

        plt.style.use("seaborn-v0_8")
        fig, ax = plt.subplots(figsize=(6.4, 4.6), dpi=220)
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

        palette = cycle(["#bae6fd", "#fde68a", "#f5d0fe", "#bbf7d0", "#fecdd3"])
        for geofence in geofences:
            points = sorted(
                getattr(geofence, "points", []),
                key=lambda point: point.order,
            )
            if len(points) >= 3:
                xs = [p.longitude for p in points] + [points[0].longitude]
                ys = [p.latitude for p in points] + [points[0].latitude]
                face_color = next(palette)
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
        fig.savefig(stream, format="png", dpi=180)
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
