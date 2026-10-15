from datetime import datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Status = Literal["OPEN", "INVESTIGATING", "RESOLVED"]
Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Service = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Assignee = Annotated[str, StringConstraints(max_length=120)]


class IncidentCreate(BaseModel):
    title: Title
    description: str = ""
    service: Service
    severity: Severity = "MEDIUM"
    status: Status = "OPEN"
    assignee: Assignee = "Unassigned"


class IncidentUpdate(BaseModel):
    title: Title | None = None
    description: str | None = None
    service: Service | None = None
    severity: Severity | None = None
    status: Status | None = None
    assignee: Assignee | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_nulls(cls, data):
        if isinstance(data, dict) and any(data[key] is None for key in cls.model_fields if key in data):
            raise ValueError("Incident fields cannot be null")
        return data


class IncidentOut(IncidentCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatsOut(BaseModel):
    total: int
    open: int
    investigating: int
    critical: int
    resolved: int
