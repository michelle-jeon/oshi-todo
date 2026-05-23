import { Check, Save, Trash2 } from "lucide-react";
import { completeTodo, deleteTodo, updateTodo } from "@/app/todo-actions";

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
      <div className="todo-main">
        <form className="todo-edit-form" action={updateTodo.bind(null, todo.id)}>
          <input
            name="title"
            defaultValue={todo.title}
            aria-label={`${todo.title} 수정`}
            disabled={isCompleted}
          />
          <button
            className="icon-button secondary"
            type="submit"
            aria-label="수정 저장"
            disabled={isCompleted}
          >
            <Save size={17} />
          </button>
        </form>
        <p className="subtle">
          {isCompleted ? "완료됨" : "완료 보상"} {todo.xp_reward} XP
        </p>
      </div>

      <div className="todo-actions">
        {!isCompleted ? (
          <form action={completeTodo.bind(null, todo.id)}>
            <button className="icon-button" type="submit" aria-label="완료">
              <Check size={18} />
            </button>
          </form>
        ) : null}
        <form action={deleteTodo.bind(null, todo.id)}>
          <button className="icon-button danger" type="submit" aria-label="삭제">
            <Trash2 size={17} />
          </button>
        </form>
      </div>
    </article>
  );
}
