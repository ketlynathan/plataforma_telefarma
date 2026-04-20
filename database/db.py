from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd

from config import CONSULTA_COLUMNS, CONSULTAS_FILE, USER_COLUMNS, USERS_FILE


class DatabaseWriteError(RuntimeError):
    """Raised when a spreadsheet is locked or unavailable for writing."""


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _ensure_excel(path: Path, columns: list[str]) -> None:
    _ensure_parent(path)
    if not path.exists():
        pd.DataFrame(columns=columns).to_excel(path, index=False)
        return

    df = pd.read_excel(path)
    missing_columns = [column for column in columns if column not in df.columns]
    if missing_columns:
        for column in missing_columns:
            df[column] = ""
        df = df[columns]
        df.to_excel(path, index=False)


def init_db() -> None:
    _ensure_excel(USERS_FILE, USER_COLUMNS)
    _ensure_excel(CONSULTAS_FILE, CONSULTA_COLUMNS)


def _write_excel(df: pd.DataFrame, path: Path) -> None:
    try:
        df.to_excel(path, index=False)
    except PermissionError as exc:
        raise DatabaseWriteError(
            f"Nao foi possivel salvar em {path.name}. Feche o arquivo no Excel e tente novamente."
        ) from exc


def load_users() -> pd.DataFrame:
    init_db()
    df = pd.read_excel(USERS_FILE)
    for column in USER_COLUMNS:
        if column not in df.columns:
            df[column] = ""
    return df[USER_COLUMNS].fillna("")


def save_user(user: dict[str, Any]) -> None:
    df = load_users()
    new_row = {column: user.get(column, "") for column in USER_COLUMNS}
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    _write_excel(df, USERS_FILE)


def update_user(email: str, updated_data: dict[str, Any]) -> dict[str, Any] | None:
    df = load_users()
    mask = df["email"] == email
    if not mask.any():
        return None

    for key, value in updated_data.items():
        if key in df.columns:
            df.loc[mask, key] = value

    _write_excel(df, USERS_FILE)
    return df.loc[mask].iloc[0].to_dict()


def authenticate_user(email: str, senha: str) -> dict[str, Any] | None:
    df = load_users()
    user = df[(df["email"] == email.strip()) & (df["senha"] == senha)]
    if user.empty:
        return None
    return user.iloc[0].to_dict()


def user_exists(email: str) -> bool:
    df = load_users()
    return (df["email"] == email.strip()).any()


def load_consultas() -> pd.DataFrame:
    init_db()
    df = pd.read_excel(CONSULTAS_FILE)
    for column in CONSULTA_COLUMNS:
        if column not in df.columns:
            df[column] = ""
    return df[CONSULTA_COLUMNS].fillna("")


def create_consulta(payload: dict[str, Any]) -> dict[str, Any]:
    df = load_consultas()
    new_consulta = {
        "id": payload.get("id", uuid4().hex[:8]),
        "paciente_nome": payload.get("paciente_nome", ""),
        "paciente_email": payload.get("paciente_email", ""),
        "data": str(payload.get("data", date.today())),
        "hora": payload.get("hora", ""),
        "status": payload.get("status", "Agendada"),
        "observacoes": payload.get("observacoes", ""),
    }
    df = pd.concat([df, pd.DataFrame([new_consulta])], ignore_index=True)
    _write_excel(df, CONSULTAS_FILE)
    return new_consulta


def get_consultas_by_email(email: str) -> pd.DataFrame:
    df = load_consultas()
    return df[df["paciente_email"] == email].reset_index(drop=True)


def get_upcoming_consultas() -> pd.DataFrame:
    df = load_consultas()
    if df.empty:
        return df
    return df.sort_values(by=["data", "hora"]).reset_index(drop=True)


def list_unique_patients() -> pd.DataFrame:
    df = load_consultas()
    if df.empty:
        return pd.DataFrame(columns=["paciente_nome", "paciente_email"])
    patients = df[["paciente_nome", "paciente_email"]].drop_duplicates()
    return patients.sort_values(by="paciente_nome").reset_index(drop=True)
