import React, { useEffect, useMemo, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';

const h = React.createElement;

function formatWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.replace('T', ' ').slice(0, 16);
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const response = await fetch('/api/attendance');
        if (!response.ok) throw new Error('入室データの取得に失敗しました');
        const body = await response.json();
        if (!stop) {
          setData(body);
          setError('');
        }
      } catch (exc) {
        if (!stop) setError(String(exc.message || exc));
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  const users = data?.users || [];
  const maxCount = Math.max(1, ...users.map((user) => user.visit_count));
  const todayCount = users.filter((user) => user.visited_today).length;
  const active = useMemo(() => {
    if (!users.length) return null;
    return users.find((user) => user.user_id === selected) || users[0];
  }, [users, selected]);

  return h('main', null,
    h('header', null,
      h('h1', null, '研究室 入室管理'),
      h('p', null,
        '日本時間で、その日にユーザー確定が1回でもあれば入室1回として数えます。同じ日の2回目以降は追加しません。'),
    ),
    error ? h('div', { className: 'banner' }, error) : null,
    data && !data.db_ok
      ? h('div', { className: 'banner' }, '入室データベースに接続できません。メンバー一覧だけ表示しています。')
      : null,
    h('section', { className: 'summary' },
      h('div', null, h('strong', null, String(users.length)), h('span', null, '登録メンバー')),
      h('div', null, h('strong', null, String(todayCount)), h('span', null, `本日の入室（${data?.today || '—'}）`)),
    ),
    h('section', { className: 'chart' },
      h('div', { className: 'legend' },
        h('span', null, h('i', { className: 'swatch usual' }), 'これまでの入室'),
        h('span', null, h('i', { className: 'swatch today' }), '本日入室済み'),
      ),
      ...users.map((user) => {
        const width = user.visit_count === 0
          ? 0
          : Math.max(6, Math.round((user.visit_count / maxCount) * 100));
        const fillClass = user.visit_count === 0
          ? 'fill zero'
          : (user.visited_today ? 'fill today' : 'fill');
        return h('button', {
          key: user.user_id,
          className: active && active.user_id === user.user_id ? 'row selected' : 'row',
          onClick: () => setSelected(user.user_id),
          type: 'button',
        },
        h('span', { className: 'name' }, user.display_name),
        h('span', { className: 'track' },
          h('span', { className: fillClass, style: { width: `${width}%` } })),
        h('span', { className: 'count' }, `${user.visit_count}回`));
      }),
    ),
    active ? h('section', { className: 'detail' },
      h('h2', null, `${active.display_name} の入室`),
      h('p', null, active.last_entered_at
        ? `最新: ${formatWhen(active.last_entered_at)}　合計 ${active.visit_count} 回`
        : 'まだ入室記録はありません'),
      active.visits.length
        ? h('table', null,
          h('thead', null, h('tr', null, h('th', null, '日付'), h('th', null, '確定時刻'))),
          h('tbody', null, active.visits.map((visit) => h('tr', { key: visit.visit_date },
            h('td', null, visit.visit_date),
            h('td', null, formatWhen(visit.entered_at))))))
        : null,
    ) : null,
  );
}

createRoot(document.getElementById('root')).render(h(App));
