from .associations import(
    mission_checklists,
    mission_geofences
)

# Import tabel-tabel resolver (Junction Tables)
from .associations import (
    mission_checklists,
    mission_geofences
)

# Import Entitas Master (Grup 1)
from .master import (
    User, 
    Drone, 
    Geofence, 
    GeofencePoint, 
    Checklist, 
    ChecklistItem
)

# Import Entitas Perencanaan (Grup 2)
from .planning import (
    Mission, 
    MissionWaypoint
)

# Import Entitas Eksekusi & Log (Grup 3)
from .execution import (
    FlightSession, 
    TelemetryData, 
    Alert, 
    MaintenanceLog
)

# (Opsional) Import Enums jika ingin bisa diakses via app.models
from .enums import (
    UserRole,
    DroneStatus,
    GeofenceType,
    ChecklistType,
    MissionStatus,
    SessionStatus,
    AlertType
)
