import { X } from "lucide-react";
import { deleteTodo, toggleTodo } from "@/app/todo-actions";

type TodoRowProps = {
  todo: {
    id: string;
    title: string;
    status: "open" | "completed" | "archived";
    xp_reward: number;
    completed_at: string | null;
  };
};

export function TodoRow({ todo }: TodoRowProps) {
  const isCompleted = todo.status === "completed";

  return (
    <article className={`todo-row ${isCompleted ? "completed" : ""}`}>
      <form action={toggleTodo.bind(null, todo.id, isCompleted ? "open" : "completed")}>
        <button
          className={`todo-check ${isCompleted ? "checked" : ""}`}
          type="submit"
          aria-label={isCompleted ? "완료 취소" : "완료"}
        >
          {isCompleted ? "✓" : ""}
        </button>
      </form>

      <div className="todo-main">
        <strong>{todo.title}</strong>
        <p className="subtle">
          {isCompleted ? "완료됨" : "완료 보상"} {todo.xp_reward} XP
        </p>
      </div>

      <div className="todo-actions">
        <form action={deleteTodo.bind(null, todo.id)}>
          <button className="icon-button danger" type="submit" aria-label="삭제">
            <X size={18} />
          </button>
        </form>
      </div>
    </article>
  );
}
