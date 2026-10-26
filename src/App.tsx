import { useEffect, useMemo, useState } from 'react';
import { formatWhen } from './format';
import type { AttendanceResponse, AttendanceUser, UserId } from './types';

function barWidth(visitCount: number, maxCount: number): number {
  if (visitCount === 0) return 0;
  return Math.max(6, Math.round((visitCount / maxCount) * 100));
}

function fillClass(user: AttendanceUser): string {
  if (user.visit_count === 0) return 'fill zero';
  if (user.visited_today) return 'fill today';
  return 'fill';
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
  const maxCount = Math.max(1, ...users.map((user) => user.visit_count));
  const todayCount = users.filter((user) => user.visited_today).length;
  const active = useMemo(() => {
    if (users.length === 0) return null;
    return users.find((user) => user.user_id === selected) ?? users[0];
  }, [users, selected]);

  return (
    <main>
      <header>
        <h1>研究室 入室管理</h1>
        <p>
          日本時間で、その日にユーザー確定が1回でもあれば入室1回として数えます。同じ日の2回目以降は追加しません。
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
          <span>本日の入室（{data?.today || '—'}）</span>
        </div>
      </section>
      <section className="chart">
        <div className="legend">
          <span>
            <i className="swatch usual" />
            これまでの入室
          </span>
          <span>
            <i className="swatch today" />
            本日入室済み
          </span>
        </div>
        {users.map((user) => (
          <button
            key={user.user_id}
            className={active?.user_id === user.user_id ? 'row selected' : 'row'}
            onClick={() => setSelected(user.user_id)}
            type="button"
          >
            <span className="name">{user.display_name}</span>
            <span className="track">
              <span
                className={fillClass(user)}
                style={
                  user.visit_count === 0
                    ? undefined
                    : { width: `${barWidth(user.visit_count, maxCount)}%` }
                }
              />
            </span>
            <span className="count">{user.visit_count}回</span>
          </button>
        ))}
      </section>
      {active ? (
        <section className="detail">
          <h2>{active.display_name} の入室</h2>
          <p>
            {active.last_entered_at
              ? `最新: ${formatWhen(active.last_entered_at)}　合計 ${active.visit_count} 回`
              : 'まだ入室記録はありません'}
          </p>
          {active.visits.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>確定時刻</th>
                </tr>
              </thead>
              <tbody>
                {active.visits.map((visit) => (
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
