import { useEffect, useMemo, useState } from 'react';
import { formatWhen } from './format';
import {
  WINDOW_DAYS,
  comparePresence,
  dayLabel,
  presenceRow,
  recentDates,
  recencyLabel,
  tokyoToday,
  type PresenceRow,
} from './presence';
import type { AttendanceResponse, UserId } from './types';

function cellClass(row: PresenceRow, day: string, today: string): string {
  if (!row.dates.has(day)) return 'cell';
  if (day === today) return 'cell today';
  return 'cell on';
}

export function App() {
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<UserId | null>(null);

  useEffect(() => {
    let stop = false;

    const load = async () => {
      try {
        const response = await fetch('/api/attendance');
        if (!response.ok) throw new Error('入室データの取得に失敗しました');
        const body = (await response.json()) as AttendanceResponse;
        if (!stop) {
          setData(body);
          setError('');
        }
      } catch (exc) {
        if (!stop) {
          setError(exc instanceof Error ? exc.message : String(exc));
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  const users = data?.users ?? [];
  const today = data?.today && /^\d{4}-\d{2}-\d{2}$/.test(data.today) ? data.today : tokyoToday();
  const days = useMemo(() => recentDates(today, WINDOW_DAYS), [today]);
  const rows = useMemo(
    () => users.map((user) => presenceRow(user, today)).sort(comparePresence),
    [users, today],
  );
  const todayCount = rows.filter((row) => row.daysSince === 0).length;
  const active = useMemo(() => {
    if (rows.length === 0) return null;
    return rows.find((row) => row.user.user_id === selected) ?? rows[0];
  }, [rows, selected]);

  return (
    <main>
      <header>
        <h1>研究室 入室管理</h1>
        <p>
          直近14日の入室です。日本時間で、その日にユーザー確定が1回でもあればその日を入室として数えます。最後に来た日が古い人を上に並べています。
        </p>
      </header>
      {error ? <div className="banner">{error}</div> : null}
      {data && data.db_ok === false ? (
        <div className="banner">入室データベースに接続できません。メンバー一覧だけ表示しています。</div>
      ) : null}
      <section className="summary">
        <div>
          <strong>{users.length}</strong>
          <span>登録メンバー</span>
        </div>
        <div>
          <strong>{todayCount}</strong>
          <span>本日の入室（{data?.today || today}）</span>
        </div>
      </section>
      <section className="chart" aria-label="直近14日の入室">
        <div className="legend">
          <span>
            <i className="swatch usual" />
            来室
          </span>
          <span>
            <i className="swatch today" />
            本日
          </span>
        </div>
        {rows.length > 0 ? (
          <div className="scale-row">
            <span />
            <span className="cells scale">
              {days.map((day, index) => {
                const label = dayLabel(day, days[index - 1] ?? null);
                const edge = index === 0 || index === days.length - 1 || day.endsWith('-01');
                return (
                  <span key={day} className={edge ? 'edge' : undefined}>
                    {label}
                  </span>
                );
              })}
            </span>
            <span />
          </div>
        ) : null}
        {rows.map((row) => (
          <button
            key={row.user.user_id}
            className={active?.user.user_id === row.user.user_id ? 'row selected' : 'row'}
            onClick={() => setSelected(row.user.user_id)}
            type="button"
          >
            <span className="name">{row.user.display_name}</span>
            <span className="cells">
              {days.map((day) => (
                <span
                  key={day}
                  className={cellClass(row, day, today)}
                  title={`${day} ${row.dates.has(day) ? '入室' : 'なし'}`}
                />
              ))}
            </span>
            <span className="recency">
              <strong>{recencyLabel(row.daysSince)}</strong>
              <small>直近7日 {row.recentCount}日</small>
            </span>
          </button>
        ))}
      </section>
      {active ? (
        <section className="detail">
          <h2>{active.user.display_name} の入室</h2>
          <p>
            {active.user.last_entered_at
              ? `最新: ${formatWhen(active.user.last_entered_at)}　合計 ${active.user.visit_count} 回`
              : 'まだ入室記録はありません'}
          </p>
          {(active.user.visits ?? []).length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>確定時刻</th>
                </tr>
              </thead>
              <tbody>
                {active.user.visits.map((visit) => (
                  <tr key={visit.visit_date}>
                    <td>{visit.visit_date}</td>
                    <td>{formatWhen(visit.entered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
