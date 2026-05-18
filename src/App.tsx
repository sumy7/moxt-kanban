import { useEffect, useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { seedIfNeeded } from "./lib/db/seed"
import { db } from "./lib/db/database"
import { filterAndSortCards } from "./lib/services/filterService"
import { useStore } from "./lib/stores/store"
import { activeBoardIdStore, boardsStore } from "./lib/stores/boards"
import { cardsStore } from "./lib/stores/cards"
import { columnsStore } from "./lib/stores/columns"
import { filtersStore } from "./lib/stores/filters"
import { toastStore } from "./lib/stores/ui"
import { useNotifications } from "./lib/hooks/useNotifications"
import { useConfirm } from "./lib/hooks/useConfirm"
import { useDataLoader } from "./lib/hooks/useDataLoader"
import { useBoardActions } from "./lib/hooks/useBoardActions"
import { useColumnActions } from "./lib/hooks/useColumnActions"
import { useCardActions } from "./lib/hooks/useCardActions"
import { useFilters } from "./lib/hooks/useFilters"
import { BoardView } from "./lib/components/board/BoardView"
import { TableView } from "./lib/components/table/TableView"
import { BoardToolbar } from "./lib/components/shared/BoardToolbar"
import { Modal } from "./lib/components/shared/Modal"
import { ConfirmDialog } from "./lib/components/shared/ConfirmDialog"
import { EmptyState } from "./lib/components/shared/EmptyState"
import { DatePicker } from "./lib/components/shared/DatePicker"
import type { WindowWithMoxt } from "./lib/types"

import "./app.css"

export default function App() {
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  const backendLabel = useMemo(
    () => (db.provider === "moxt" ? "moxt" : "indexeddb"),
    []
  )

  // Reactive store state
  const boards = useStore(boardsStore)
  const activeBoardId = useStore(activeBoardIdStore)
  const columns = useStore(columnsStore)
  const cards = useStore(cardsStore)
  const filters = useStore(filtersStore)
  const toast = useStore(toastStore)

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) ?? null,
    [boards, activeBoardId]
  )

  const availableTags = useMemo(
    () => [...new Set(cards.flatMap((c) => c.tags))].sort(),
    [cards]
  )

  const filteredCards = useMemo(
    () => filterAndSortCards(cards, columns, filters),
    [cards, columns, filters]
  )

  // Hooks
  const { notifySuccess, safely } = useNotifications()
  const confirm = useConfirm(safely)
  const { loadBoardData, reloadBoards } = useDataLoader()

  const boardActions = useBoardActions({
    reloadBoards,
    notifySuccess,
    safely,
    requestConfirm: confirm.request,
  })

  const columnActions = useColumnActions({
    loadBoardData,
    notifySuccess,
    safely,
    requestConfirm: confirm.request,
  })

  const cardActions = useCardActions({
    loadBoardData,
    notifySuccess,
    safely,
    requestConfirm: confirm.request,
  })

  const filtersActions = useFilters()

  // Bootstrap
  useEffect(() => {
    const run = async () => {
      try {
        await seedIfNeeded()
        await reloadBoards(true)
        const bridge = (window as WindowWithMoxt).moxt
        const member = bridge?.currentMember
        if (member) {
          setCurrentUser(member.displayName ?? member.email ?? null)
        }
      } finally {
        setLoading(false)
      }
    }
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch board when selector changes
  function handleSelectBoard(id: string): void {
    activeBoardIdStore.set(id)
    void loadBoardData(id)
  }

  return (
    <main className="app">
      {/* ── Header ── */}
      <header className="toolbar">
        <div className="toolbar-title">
          <h1>Moxt Kanban</h1>
          {window.__APP_VERSION__ && (
            <span
              className="chip version-chip"
              aria-label="Application version"
            >
              v{window.__APP_VERSION__}
            </span>
          )}
          <span className="chip backend-chip">Backend: {backendLabel}</span>
          {currentUser ? (
            <span className="chip user-chip">{currentUser}</span>
          ) : null}
        </div>

        <div className="toolbar-actions">
          {boards.length > 0 ? (
            <Select
              value={activeBoardId ?? ""}
              onValueChange={handleSelectBoard}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Button type="button" size="sm" onClick={boardActions.openCreate}>
            + New Board
          </Button>

          {activeBoard ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => boardActions.openEdit(activeBoard)}
              >
                Edit Board
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={columnActions.openCreate}
              >
                + Column
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {/* ── Board Toolbar ── */}
      {activeBoard ? (
        <BoardToolbar
          boardName={activeBoard.name}
          viewMode={filters.viewMode}
          filters={filters}
          columns={columns}
          availableTags={availableTags}
          onToggleView={filtersActions.toggleView}
          onFiltersChange={filtersActions.update}
          onResetFilters={filtersActions.reset}
        />
      ) : null}

      {/* ── Content ── */}
      <section className="content-region">
        {loading ? (
          <p className="loading-hint">Loading…</p>
        ) : !activeBoard ? (
          <EmptyState
            title="No boards yet"
            description="Create your first board to get started."
            actionText="Create Board"
            onAction={boardActions.openCreate}
          />
        ) : filters.viewMode === "table" ? (
          <TableView
            cards={filteredCards}
            columns={columns}
            sortField={filters.sortField}
            sortDirection={filters.sortDirection}
            onSort={filtersActions.updateSort}
            onEditCard={cardActions.openEdit}
            onDeleteCard={cardActions.requestDelete}
          />
        ) : (
          <BoardView
            columns={columns}
            cards={filteredCards}
            onAddCard={cardActions.openCreate}
            onEditCard={cardActions.openEdit}
            onDeleteCard={cardActions.requestDelete}
            onDrop={cardActions.drop}
          />
        )}
      </section>

      {/* ── Toast ── */}
      {toast ? (
        <div
          className={`toast toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      {/* ── Board Modal ── */}
      <Modal
        open={boardActions.modalOpen}
        title={boardActions.editingId ? "Edit Board" : "New Board"}
        onClose={boardActions.closeModal}
        width="sm"
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void boardActions.submit(
              boardActions.nameInput,
              boardActions.editingId
            )
          }}
        >
          <div>
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              value={boardActions.nameInput}
              onChange={(e) => boardActions.setNameInput(e.target.value)}
              placeholder="Board name"
              required
            />
          </div>
          <div className="form-actions">
            {boardActions.editingId && activeBoard ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => boardActions.requestDelete(activeBoard)}
              >
                Delete Board
              </Button>
            ) : null}
            <div className="spacer" />
            <Button
              type="button"
              variant="outline"
              onClick={boardActions.closeModal}
            >
              Cancel
            </Button>
            <Button type="submit">
              {boardActions.editingId ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Column Modal ── */}
      <Modal
        open={columnActions.modalOpen}
        title={columnActions.editingId ? "Edit Column" : "New Column"}
        onClose={columnActions.closeModal}
        width="sm"
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void columnActions.submit(
              columnActions.titleInput,
              columnActions.editingId
            )
          }}
        >
          <div>
            <Label htmlFor="column-title">Column Title</Label>
            <Input
              id="column-title"
              value={columnActions.titleInput}
              onChange={(e) => columnActions.setTitleInput(e.target.value)}
              placeholder="Column title"
              required
            />
          </div>
          <div className="form-actions">
            <div className="spacer" />
            <Button
              type="button"
              variant="outline"
              onClick={columnActions.closeModal}
            >
              Cancel
            </Button>
            <Button type="submit">
              {columnActions.editingId ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Card Editor Modal ── */}
      <Modal
        open={cardActions.editor.open}
        title={cardActions.editor.editingCardId ? "Edit Card" : "New Card"}
        onClose={() =>
          cardActions.setEditor((prev) => ({ ...prev, open: false }))
        }
        width="lg"
      >
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void cardActions.submit(cardActions.editor)
          }}
        >
          <div className="grid-2">
            <div>
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={cardActions.editor.title}
                onChange={(e) =>
                  cardActions.setEditor((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Card title"
                required
              />
            </div>

            <div>
              <Label htmlFor="card-column">Status (Column)</Label>
              <Select
                value={cardActions.editor.columnId}
                onValueChange={(v) =>
                  cardActions.setEditor((prev) => ({ ...prev, columnId: v }))
                }
              >
                <SelectTrigger id="card-column">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="card-description">Description</Label>
            <Textarea
              id="card-description"
              value={cardActions.editor.description}
              onChange={(e) =>
                cardActions.setEditor((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Description (optional)"
              rows={3}
            />
          </div>

          <div className="grid-2">
            <div>
              <Label htmlFor="card-priority">Priority</Label>
              <Select
                value={cardActions.editor.priority}
                onValueChange={(v) =>
                  cardActions.setEditor((prev) => ({
                    ...prev,
                    priority: v as typeof prev.priority,
                  }))
                }
              >
                <SelectTrigger id="card-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <DatePicker
                value={cardActions.editor.dueDate || null}
                placeholder="Pick due date"
                onValueChange={(v) =>
                  cardActions.setEditor((prev) => ({
                    ...prev,
                    dueDate: v ?? "",
                  }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="card-tags">Tags (comma-separated)</Label>
            <Input
              id="card-tags"
              value={cardActions.editor.tagsText}
              onChange={(e) =>
                cardActions.setEditor((prev) => ({
                  ...prev,
                  tagsText: e.target.value,
                }))
              }
              placeholder="e.g. frontend, bug, v2"
              list="card-tag-suggestions"
            />
            <datalist id="card-tag-suggestions">
              {availableTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>

          <div className="form-actions">
            <div className="spacer" />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                cardActions.setEditor((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button type="submit">
              {cardActions.editor.editingCardId ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirm.state.open}
        title={confirm.state.title}
        message={confirm.state.message}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={() => void confirm.confirm(confirm.state.action)}
        onCancel={confirm.cancel}
      />
    </main>
  )
}
