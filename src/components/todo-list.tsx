"use client";

import { CalendarDays, GripVertical, Plus, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  createTodo,
  deleteTodo,
  reorderTodos,
  toggleTodo,
  updateTodoTitle
} from "@/app/todo-actions";

export type TodoListItem = {
  id: string;
  title: string;
  status: "open" | "completed" | "archived";
  xp_reward: number;
  completed_at: string | null;
  todo_date: string;
  sort_order: number;
};

type TodoListProps = {
  initialTodos: TodoListItem[];
  initialSelectedDate: string;
};

function sortOpenTodos(todos: TodoListItem[]) {
  return [...todos].sort((a, b) => a.sort_order - b.sort_order);
}

function sortCompletedTodos(todos: TodoListItem[]) {
  return [...todos].sort((a, b) => {
    const left = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const right = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return right - left;
  });
}

export function TodoList({ initialTodos, initialSelectedDate }: TodoListProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [newTitle, setNewTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const selectedTodos = useMemo(
    () => todos.filter((todo) => todo.todo_date === selectedDate),
    [selectedDate, todos]
  );
  const openTodos = sortOpenTodos(selectedTodos.filter((todo) => todo.status === "open"));
  const completedTodos = sortCompletedTodos(
    selectedTodos.filter((todo) => todo.status === "completed")
  );

  function handleCreate(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      return;
    }

    formData.set("todoDate", selectedDate);
    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticTodo: TodoListItem = {
      id: optimisticId,
      title,
      status: "open",
      xp_reward: 10,
      completed_at: null,
      todo_date: selectedDate,
      sort_order: (openTodos.at(-1)?.sort_order ?? 0) + 1000
    };

    setTodos((current) => [optimisticTodo, ...current]);
    setNewTitle("");

    startTransition(async () => {
      const savedTodo = await createTodo(formData);

      if (savedTodo) {
        setTodos((current) =>
          current.map((todo) =>
            todo.id === optimisticId ? (savedTodo as TodoListItem) : todo
          )
        );
      }
    });
  }

  function handleToggle(todo: TodoListItem) {
    if (todo.id.startsWith("temp-")) {
      return;
    }

    const nextStatus = todo.status === "completed" ? "open" : "completed";

    setTodos((current) =>
      current.map((item) =>
        item.id === todo.id
          ? {
              ...item,
              status: nextStatus,
              completed_at: nextStatus === "completed" ? new Date().toISOString() : null
            }
          : item
      )
    );

    startTransition(async () => {
      await toggleTodo(todo.id, nextStatus);
    });
  }

  function handleDelete(todoId: string) {
    setTodos((current) => current.filter((item) => item.id !== todoId));

    if (todoId.startsWith("temp-")) {
      return;
    }

    startTransition(async () => {
      await deleteTodo(todoId);
    });
  }

  function handleTitleChange(todoId: string, title: string) {
    setTodos((current) =>
      current.map((item) => (item.id === todoId ? { ...item, title } : item))
    );
  }

  function handleTitleCommit(todoId: string, title: string) {
    if (todoId.startsWith("temp-")) {
      return;
    }

    const formData = new FormData();
    formData.set("title", title);

    startTransition(async () => {
      await updateTodoTitle(todoId, formData);
    });
  }

  function moveTodo(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      return;
    }

    const currentOpen = openTodos;
    const fromIndex = currentOpen.findIndex((todo) => todo.id === draggingId);
    const toIndex = currentOpen.findIndex((todo) => todo.id === targetId);

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const reordered = [...currentOpen];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const reorderedIds = reordered.map((todo) => todo.id);

    setTodos((current) =>
      current.map((todo) => {
        const nextIndex = reorderedIds.indexOf(todo.id);

        if (nextIndex === -1) {
          return todo;
        }

        return { ...todo, sort_order: (nextIndex + 1) * 1000 };
      })
    );

    startTransition(async () => {
      await reorderTodos(reorderedIds.filter((todoId) => !todoId.startsWith("temp-")));
    });
  }

  function renderTodo(todo: TodoListItem, isCompleted: boolean) {
    return (
      <article
        className={`todo-row ${isCompleted ? "completed" : ""}`}
        draggable={!isCompleted}
        key={todo.id}
        onDragStart={() => setDraggingId(todo.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => moveTodo(todo.id)}
      >
        {!isCompleted ? (
          <span className="drag-handle" aria-label="순서 변경">
            <GripVertical size={18} />
          </span>
        ) : null}
        <button
          className={`todo-check ${isCompleted ? "checked" : ""}`}
          type="button"
          onClick={() => handleToggle(todo)}
          aria-label={isCompleted ? "완료 취소" : "완료"}
        >
          {isCompleted ? "✓" : ""}
        </button>

        <div className="todo-main">
          {isCompleted ? (
            <strong>{todo.title}</strong>
          ) : (
            <input
              className="inline-title-input"
              value={todo.title}
              onChange={(event) => handleTitleChange(todo.id, event.target.value)}
              onBlur={(event) => handleTitleCommit(todo.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              aria-label={`${todo.title} 수정`}
            />
          )}
          <p className="subtle">
            {isCompleted ? "완료됨" : "완료 보상"} {todo.xp_reward} XP
          </p>
        </div>

        <button
          className="icon-button danger"
          type="button"
          onClick={() => handleDelete(todo.id)}
          aria-label="삭제"
        >
          <X size={18} />
        </button>
      </article>
    );
  }

  return (
    <>
      <div className="todo-section-header">
        <button
          className="calendar-toggle"
          type="button"
          aria-label="캘린더 열기"
          onClick={() => setIsCalendarOpen((current) => !current)}
        >
          <CalendarDays size={20} />
        </button>
        <h2>오늘의 퀘스트</h2>
      </div>

      <div className={`calendar-drawer ${isCalendarOpen ? "open" : ""}`}>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          aria-label="할 일 날짜 선택"
        />
      </div>

      <form className="form-row" action={handleCreate}>
        <input type="hidden" name="todoDate" value={selectedDate} />
        <input
          name="title"
          placeholder="할 일을 입력하세요"
          aria-label="새 할 일"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
        />
        <button className="icon-button" type="submit" aria-label="할 일 추가">
          <Plus size={18} />
        </button>
      </form>

      <div className="todo-list">
        {openTodos.map((todo) => renderTodo(todo, false))}
        {openTodos.length === 0 ? <div className="empty-state">이 날짜의 퀘스트가 비어 있어요.</div> : null}
      </div>

      {completedTodos.length > 0 ? (
        <section className="completed-section">
          <h3>완료한 퀘스트</h3>
          <div className="todo-list">{completedTodos.map((todo) => renderTodo(todo, true))}</div>
        </section>
      ) : null}
    </>
  );
}
