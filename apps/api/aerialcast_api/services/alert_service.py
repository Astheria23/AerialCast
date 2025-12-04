"""Alert query helpers and business logic."""

from flask_smorest import abort

from ..repositories import AlertRepository


class AlertService:
    alert_repository = AlertRepository

    @classmethod
    def get_all_alerts(cls):
        return cls.alert_repository.list_recent()

    @classmethod
    def get_alert_by_id(cls, alert_id):
        alert = cls.alert_repository.get(alert_id)
        if alert is None:
            abort(404, message="Alert not found")
        return alert

    @classmethod
    def get_alerts_for_session(cls, session_id):
        return cls.alert_repository.list_for_session(session_id)


__all__ = ["AlertService"]
