import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedIfNeeded } from './lib/db/seed';
import { db } from './lib/db/database';
import { boardService } from './lib/services/boardService';
import type { Board, MoxtBridge } from './lib/types';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardName, setBoardName] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backendLabel = useMemo(
    () => (db.provider === 'moxt' ? 'moxt' : 'indexeddb'),
    [],
  );

  const refreshBoards = useCallback(async () => {
    const nextBoards = await boardService.list();
    setBoards(nextBoards);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        await seedIfNeeded();
        await refreshBoards();

        const bridge = (window as Window & { moxt?: MoxtBridge }).moxt;
        const member = bridge?.currentMember;
        if (member) {
          setCurrentUser(member.displayName ?? member.email ?? null);
        }
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'Failed to load data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [refreshBoards]);

  const handleCreateBoard = useCallback(async () => {
    if (saving) return;

    const name = boardName.trim();
    if (!name) return;

    setSaving(true);
    setError(null);
    try {
      await boardService.create(name);
      setBoardName('');
      await refreshBoards();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Failed to create board';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [boardName, refreshBoards, saving]);

  return (
    <main className="app">
      <header className="toolbar">
        <div className="toolbar-title">
          <h1>Moxt Kanban</h1>
          <span className="chip">v{__APP_VERSION__}</span>
          <span className="chip">Backend: {backendLabel}</span>
          {currentUser ? <span className="chip">{currentUser}</span> : null}
        </div>
      </header>

      <section className="content">
        <p className="hint">
          React migration complete. Existing Svelte views are retained as
          legacy source and can be incrementally rewritten in React.
        </p>

        <div className="create-row">
          <input
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            placeholder="New board name"
            aria-label="New board name"
          />
          <button type="button" onClick={handleCreateBoard} disabled={saving}>
            {saving ? 'Creating...' : 'Create board'}
          </button>
        </div>

        {loading ? <p>Loading...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <ul className="board-list">
          {boards.map((board) => (
            <li key={board.id}>{board.name}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
