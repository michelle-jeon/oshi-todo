"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { createTodo, deleteTodo, toggleTodo, updateTodoTitle } from "@/app/todo-actions";

export type TodoListItem = {
  id: string;
  title: string;
  status: "open" | "completed" | "archived";
  xp_reward: number;
  completed_at: string | null;
};

type TodoListProps = {
  initialTodos: TodoListItem[];
};

export function TodoList({ initialTodos }: TodoListProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [newTitle, setNewTitle] = useState("");
  const [, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      return;
    }

    const optimisticTodo: TodoListItem = {
      id: `temp-${crypto.randomUUID()}`,
      title,
      status: "open",
      xp_reward: 10,
      completed_at: null
    };

    setTodos((current) => [optimisticTodo, ...current]);
    setNewTitle("");

    startTransition(async () => {
      await createTodo(formData);
    });
  }

  function handleToggle(todo: TodoListItem) {
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
    const formData = new FormData();
    formData.set("title", title);

    startTransition(async () => {
      await updateTodoTitle(todoId, formData);
    });
  }

  return (
    <>
      <form className="form-row" action={handleCreate}>
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
        {todos.map((todo) => {
          const isCompleted = todo.status === "completed";

          return (
            <article className={`todo-row ${isCompleted ? "completed" : ""}`} key={todo.id}>
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
        })}
        {todos.length === 0 ? <div className="empty-state">첫 퀘스트를 추가해볼까요?</div> : null}
      </div>
    </>
  );
}
