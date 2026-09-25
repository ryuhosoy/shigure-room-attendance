"""日本時間の入室記録. ユーザー確定は同じ日に1回だけ数える."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

JST = ZoneInfo('Asia/Tokyo')


def to_jst(value: datetime | str | None = None) -> datetime:
    """時刻を日本時間へ変換する. 未指定なら現在時刻."""
    if value is None:
        return datetime.now(JST)
    if isinstance(value, str):
        text = value.replace('Z', '+00:00')
        value = datetime.fromisoformat(text)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(JST)


def display_name(user_id: str) -> str:
    """user_ 接頭辞を外した表示名を返す."""
    name = user_id[5:] if user_id.startswith('user_') else user_id
    return name.replace('_', ' ')


def _format_jst(when: datetime) -> str:
    return when.isoformat(timespec='seconds')


def record_confirmed_visit(
    user_id: str,
    timestamp: datetime | str | None = None,
) -> Dict[str, Any]:
    """ユーザー確定を日本時間の日付で1日1回まで記録する."""
    user_id = (user_id or '').strip()
    if not user_id or user_id in ('none', 'unknown'):
        return {'recorded': False, 'user_id': user_id, 'reason': 'skipped'}

    when = to_jst(timestamp)
    visit_date = when.date()
    entered_at = when.replace(tzinfo=None)

    from shigure_core.db.event_repository import EventRepository

    recorded = EventRepository.insert_room_visit(user_id, visit_date, entered_at)
    return {
        'recorded': recorded,
        'user_id': user_id,
        'visit_date': visit_date.isoformat(),
        'entered_at': _format_jst(when),
    }


def _as_date_text(value) -> str:
    if hasattr(value, 'isoformat'):
        return value.isoformat()[:10]
    return str(value)[:10]


def _as_entered_text(value) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=JST)
        return value.astimezone(JST).isoformat(timespec='seconds')
    return str(value)


def build_attendance(user_ids: List[str]) -> Dict[str, Any]:
    """顔辞書の全ユーザーに入室回数を付けて返す. DB障害時も一覧は返す."""
    today = datetime.now(JST).date().isoformat()
    visits: List[dict] = []
    db_error: Optional[str] = None
    try:
        from shigure_core.db.event_repository import EventRepository

        visits = EventRepository.select_room_visits()
    except Exception as exc:
        db_error = str(exc)

    by_user: Dict[str, List[dict]] = {}
    for row in visits:
        user_id = str(row.get('user_id') or '')
        if not user_id:
            continue
        by_user.setdefault(user_id, []).append({
            'visit_date': _as_date_text(row.get('visit_date')),
            'entered_at': _as_entered_text(row.get('entered_at')),
        })

    ordered = list(user_ids)
    for user_id in by_user:
        if user_id not in ordered:
            ordered.append(user_id)

    users = []
    for user_id in ordered:
        records = by_user.get(user_id, [])
        latest = records[0] if records else None
        users.append({
            'user_id': user_id,
            'display_name': display_name(user_id),
            'visit_count': len(records),
            'last_visit_date': latest['visit_date'] if latest else None,
            'last_entered_at': latest['entered_at'] if latest else None,
            'visited_today': bool(latest and latest['visit_date'] == today),
            'visits': records,
        })
    users.sort(key=lambda item: (-item['visit_count'], item['display_name']))
    return {
        'timezone': 'Asia/Tokyo',
        'today': today,
        'db_ok': db_error is None,
        'db_error': db_error,
        'users': users,
    }
