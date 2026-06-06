"use client";

import { Archive, CalendarDays, GripVertical, Plus, Repeat2, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState, useTransition } from "react";
import {
  completeRoutine,
  createRoutine,
  deleteRoutine,
  endRoutine,
  updateRoutine
} from "@/app/routine-actions";
import {
  createTodo,
  deleteTodo,
  reorderTodos,
  toggleTodo,
  updateTodoDueDate,
  updateTodoDifficulty,
  updateTodoNotes,
  updateTodoPriority,
  updateTodoTitle
} from "@/app/todo-actions";
import {
  DEFAULT_TODO_PRIORITY,
  DEFAULT_XP_DIFFICULTY,
  getXpRewardForDifficulty,
  type TodoPriority,
  type XpDifficulty
} from "@/lib/game-config";

export type TodoListItem = {
  id: string;
  title: string;
  notes: string | null;
  status: "open" | "completed" | "archived";
  xp_difficulty: XpDifficulty;
  priority: TodoPriority;
  xp_reward: number;
  base_xp_reward: number;
  completed_at: string | null;
  todo_date: string;
  due_date: string | null;
  sort_order: number;
  routine_id: string | null;
};

export type RoutineListItem = {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  weekdays: number[];
  xp_difficulty: XpDifficulty;
  xp_reward: number;
  base_xp_reward: number;
  is_active: boolean;
  starts_on: string;
  ends_on: string | null;
};

type TodoListProps = {
  initialTodos: TodoListItem[];
  initialRoutines: RoutineListItem[];
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

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

const weekdayOptions = [
  { label: "월", value: 1 },
  { label: "화", value: 2 },
  { label: "수", value: 3 },
  { label: "목", value: 4 },
  { label: "금", value: 5 },
  { label: "토", value: 6 },
  { label: "일", value: 0 }
];

const difficultyOptions: { value: XpDifficulty; label: string }[] = [
  { value: "low", label: "가벼움" },
  { value: "medium", label: "보통" },
  { value: "high", label: "도전" }
];

const priorityOptions: { value: TodoPriority; label: string }[] = [
  { value: "low", label: "낮음" },
  { value: "normal", label: "보통" },
  { value: "high", label: "높음" }
];

function getPriorityLabel(priority: TodoPriority) {
  return priorityOptions.find((option) => option.value === priority)?.label ?? "보통";
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(parseDate(value));
}

function getDueDateState(dueDate: string | null, selectedDate: string) {
  if (!dueDate) {
    return null;
  }

  if (dueDate < selectedDate) {
    return "overdue";
  }

  if (dueDate === selectedDate) {
    return "today";
  }

  return "upcoming";
}

function getDueDateLabel(dueDate: string | null, selectedDate: string) {
  const state = getDueDateState(dueDate, selectedDate);

  if (!dueDate || !state) {
    return null;
  }

  if (state === "overdue") {
    return `마감 지남 · ${formatDueDate(dueDate)}`;
  }

  if (state === "today") {
    return "오늘 마감";
  }

  return `마감 ${formatDueDate(dueDate)}`;
}

function isRoutineAvailableOnDate(routine: RoutineListItem, dateString: string, weekday: number) {
  return (
    routine.starts_on <= dateString &&
    (!routine.ends_on || dateString < routine.ends_on) &&
    (routine.is_active || Boolean(routine.ends_on)) &&
    (routine.frequency === "daily" || routine.weekdays.includes(weekday))
  );
}

export function TodoList({ initialTodos, initialRoutines, initialSelectedDate }: TodoListProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [routines, setRoutines] = useState(initialRoutines);
  const [newTitle, setNewTitle] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<XpDifficulty>(DEFAULT_XP_DIFFICULTY);
  const [newPriority, setNewPriority] = useState<TodoPriority>(DEFAULT_TODO_PRIORITY);
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineDifficulty, setRoutineDifficulty] = useState<XpDifficulty>(DEFAULT_XP_DIFFICULTY);
  const [routineFrequency, setRoutineFrequency] = useState<"daily" | "weekly">("daily");
  const [routineWeekdays, setRoutineWeekdays] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [visibleMonth, setVisibleMonth] = useState(parseDate(initialSelectedDate));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineListItem | null>(null);
  const [editingTodo, setEditingTodo] = useState<TodoListItem | null>(null);
  const [endingRoutine, setEndingRoutine] = useState<RoutineListItem | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [undoCompletedTodoId, setUndoCompletedTodoId] = useState<string | null>(null);
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
  const selectedWeekday = parseDate(selectedDate).getDay();
  const selectedRoutineIds = new Set(
    selectedTodos.map((todo) => todo.routine_id).filter((routineId): routineId is string => Boolean(routineId))
  );
  const selectedRoutines = routines.filter(
    (routine) =>
      isRoutineAvailableOnDate(routine, selectedDate, selectedWeekday) &&
      !selectedRoutineIds.has(routine.id)
  );
  const calendarDays = getCalendarDays(visibleMonth);
  const monthLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long"
  }).format(visibleMonth);
  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const yearOptions = Array.from({ length: 9 }, (_, index) => visibleYear - 4 + index);

  function clearOperationFeedback() {
    setOperationMessage(null);
    setUndoCompletedTodoId(null);
  }

  function reportActionError(message: string) {
    setUndoCompletedTodoId(null);
    setOperationMessage(message);
  }

  function handleCreate(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      return;
    }

    formData.set("todoDate", selectedDate);
    const dueDateValue = String(formData.get("dueDate") ?? "").trim();
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDateValue) ? dueDateValue : null;
    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticTodo: TodoListItem = {
      id: optimisticId,
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      status: "open",
      xp_difficulty: newDifficulty,
      priority: newPriority,
      xp_reward: getXpRewardForDifficulty(newDifficulty),
      base_xp_reward: getXpRewardForDifficulty(newDifficulty),
      completed_at: null,
      todo_date: selectedDate,
      due_date: dueDate,
      sort_order: (openTodos.at(-1)?.sort_order ?? 0) + 1000,
      routine_id: null
    };

    const previousTodos = todos;
    setTodos((current) => [optimisticTodo, ...current]);
    setNewTitle("");
    setNewDifficulty(DEFAULT_XP_DIFFICULTY);
    setNewPriority(DEFAULT_TODO_PRIORITY);
    setIsCreatePanelOpen(false);
    clearOperationFeedback();

    startTransition(async () => {
      const result = await createTodo(formData);

      if (result.ok) {
        setTodos((current) =>
          current.map((todo) =>
            todo.id === optimisticId ? (result.data as TodoListItem) : todo
          )
        );
        return;
      }

      setTodos(previousTodos);
      setNewTitle(title);
      setNewDifficulty(optimisticTodo.xp_difficulty);
      setNewPriority(optimisticTodo.priority);
      setIsCreatePanelOpen(true);
      reportActionError(result.error);
    });
  }

  function handleCreateRoutine(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      return;
    }

    const weekdays = routineFrequency === "weekly" ? routineWeekdays : [];
    const optimisticRoutine: RoutineListItem = {
      id: `temp-${crypto.randomUUID()}`,
      title,
      frequency: routineFrequency,
      weekdays,
      xp_difficulty: routineDifficulty,
      xp_reward: getXpRewardForDifficulty(routineDifficulty),
      base_xp_reward: getXpRewardForDifficulty(routineDifficulty),
      is_active: true,
      starts_on: selectedDate,
      ends_on: null
    };

    const previousRoutines = routines;
    setRoutines((current) => [optimisticRoutine, ...current]);
    setRoutineTitle("");
    setRoutineDifficulty(DEFAULT_XP_DIFFICULTY);
    setIsCreatePanelOpen(false);
    clearOperationFeedback();

    startTransition(async () => {
      const result = await createRoutine(formData);

      if (result.ok) {
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === optimisticRoutine.id ? (result.data as RoutineListItem) : routine
          )
        );
        return;
      }

      setRoutines(previousRoutines);
      setRoutineTitle(title);
      setIsCreatePanelOpen(true);
      reportActionError(result.error);
    });
  }

  function handleDeleteRoutine(routineId: string) {
    const previousRoutines = routines;
    setRoutines((current) => current.filter((routine) => routine.id !== routineId));
    clearOperationFeedback();

    if (routineId.startsWith("temp-")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteRoutine(routineId);

      if (!result.ok) {
        setRoutines(previousRoutines);
        reportActionError(result.error);
      }
    });
  }

  function handleEndRoutine() {
    if (!endingRoutine) {
      return;
    }

    const routineToEnd = endingRoutine;
    const previousRoutines = routines;
    const formData = new FormData();
    formData.set("todoDate", selectedDate);

    setRoutines((current) =>
      current.map((routine) =>
        routine.id === routineToEnd.id
          ? {
              ...routine,
              is_active: false,
              ends_on: selectedDate
            }
          : routine
      )
    );
    setEndingRoutine(null);
    clearOperationFeedback();

    if (routineToEnd.id.startsWith("temp-")) {
      return;
    }

    startTransition(async () => {
      const result = await endRoutine(routineToEnd.id, formData);

      if (result.ok) {
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === routineToEnd.id ? (result.data as RoutineListItem) : routine
          )
        );
        return;
      }

      setRoutines(previousRoutines);
      setEndingRoutine(routineToEnd);
      reportActionError(result.error);
    });
  }

  function handleCompleteRoutine(routine: RoutineListItem) {
    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimisticTodo: TodoListItem = {
      id: optimisticId,
      title: routine.title,
      notes: null,
      status: "completed",
      xp_difficulty: routine.xp_difficulty ?? DEFAULT_XP_DIFFICULTY,
      priority: DEFAULT_TODO_PRIORITY,
      xp_reward: routine.xp_reward,
      base_xp_reward: routine.base_xp_reward,
      completed_at: new Date().toISOString(),
      todo_date: selectedDate,
      due_date: null,
      sort_order: (openTodos.at(-1)?.sort_order ?? 0) + 1000,
      routine_id: routine.id
    };
    const formData = new FormData();
    formData.set("todoDate", selectedDate);

    const previousTodos = todos;
    setTodos((current) => [optimisticTodo, ...current]);
    clearOperationFeedback();

    startTransition(async () => {
      const result = await completeRoutine(routine.id, formData);

      if (result.ok && result.data) {
        const completedResult = result.data as Partial<TodoListItem>;
        const completedTodo = {
          ...completedResult,
          notes: completedResult.notes ?? null,
          priority: completedResult.priority ?? DEFAULT_TODO_PRIORITY,
          due_date: completedResult.due_date ?? null
        } as TodoListItem;

        setTodos((current) =>
          current.map((todo) =>
            todo.id === optimisticId ? completedTodo : todo
          )
        );
        setUndoCompletedTodoId(completedTodo.id);
        setOperationMessage("루틴을 완료했어요.");
        return;
      }

      setTodos(previousTodos);
      reportActionError(result.ok ? "루틴을 완료할 수 없어요." : result.error);
    });
  }

  function handleUpdateRoutine(formData: FormData) {
    if (!editingRoutine) {
      return;
    }

    const title = String(formData.get("title") ?? "").trim();
    const frequency = String(formData.get("frequency") ?? "daily") === "weekly" ? "weekly" : "daily";
    const weekdays = formData
      .getAll("weekdays")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

    if (!title) {
      return;
    }

    const difficultyValue = String(formData.get("xpDifficulty") ?? editingRoutine.xp_difficulty);
    const xpDifficulty =
      difficultyOptions.some((option) => option.value === difficultyValue)
        ? (difficultyValue as XpDifficulty)
        : editingRoutine.xp_difficulty;
    const xpReward = getXpRewardForDifficulty(xpDifficulty);

    const nextRoutine: RoutineListItem = {
      ...editingRoutine,
      title,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : [],
      xp_difficulty: xpDifficulty,
      xp_reward: xpReward,
      base_xp_reward: xpReward
    };

    const previousRoutines = routines;
    setRoutines((current) =>
      current.map((routine) => (routine.id === editingRoutine.id ? nextRoutine : routine))
    );
    setEditingRoutine(null);
    clearOperationFeedback();

    startTransition(async () => {
      const result = await updateRoutine(nextRoutine.id, formData);

      if (result.ok) {
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === nextRoutine.id ? (result.data as RoutineListItem) : routine
          )
        );
        return;
      }

      setRoutines(previousRoutines);
      setEditingRoutine(editingRoutine);
      reportActionError(result.error);
    });
  }

  function toggleRoutineWeekday(weekday: number) {
    setRoutineWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((item) => item !== weekday)
        : [...current, weekday].sort((a, b) => a - b)
    );
  }

  function handleToggle(todo: TodoListItem) {
    if (todo.id.startsWith("temp-")) {
      return;
    }

    const nextStatus = todo.status === "completed" ? "open" : "completed";
    const previousTodos = todos;

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
    clearOperationFeedback();

    startTransition(async () => {
      const result = await toggleTodo(todo.id, nextStatus);

      if (!result.ok) {
        setTodos(previousTodos);
        reportActionError(result.error);
        return;
      }

      if (nextStatus === "completed") {
        setUndoCompletedTodoId(todo.id);
        setOperationMessage("완료했어요.");
      }
    });
  }

  function handleDelete(todoId: string) {
    const previousTodos = todos;
    setTodos((current) => current.filter((item) => item.id !== todoId));
    clearOperationFeedback();

    if (todoId.startsWith("temp-")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTodo(todoId);

      if (!result.ok) {
        setTodos(previousTodos);
        reportActionError(result.error);
      }
    });
  }

  function handleDeleteFromDetail(todo: TodoListItem) {
    handleDelete(todo.id);
    setEditingTodo(null);
  }

  function handleUpdateTodoDetail(formData: FormData) {
    if (!editingTodo) {
      return;
    }

    const title = String(formData.get("title") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000) || null;
    const difficultyValue = String(formData.get("xpDifficulty") ?? editingTodo.xp_difficulty);
    const priorityValue = String(formData.get("priority") ?? editingTodo.priority);
    const dueDateValue = String(formData.get("dueDate") ?? "").trim();
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDateValue) ? dueDateValue : null;
    const xpDifficulty =
      difficultyOptions.some((option) => option.value === difficultyValue)
        ? (difficultyValue as XpDifficulty)
        : editingTodo.xp_difficulty;
    const priority =
      priorityOptions.some((option) => option.value === priorityValue)
        ? (priorityValue as TodoPriority)
        : editingTodo.priority;
    const xpReward = getXpRewardForDifficulty(xpDifficulty);

    if (!title || editingTodo.id.startsWith("temp-")) {
      return;
    }

    const previousTodos = todos;
    const nextTodo: TodoListItem = {
      ...editingTodo,
      title,
      notes,
      xp_difficulty: xpDifficulty,
      priority,
      xp_reward: xpReward,
      base_xp_reward: xpReward,
      due_date: dueDate
    };

    setTodos((current) =>
      current.map((todo) => (todo.id === editingTodo.id ? nextTodo : todo))
    );
    setEditingTodo(null);
    clearOperationFeedback();

    startTransition(async () => {
      let latestTodo: TodoListItem | null = null;

      if (title !== editingTodo.title) {
        const titleFormData = new FormData();
        titleFormData.set("title", title);
        const titleResult = await updateTodoTitle(editingTodo.id, titleFormData);

        if (!titleResult.ok) {
          setTodos(previousTodos);
          setEditingTodo(editingTodo);
          reportActionError(titleResult.error);
          return;
        }

        latestTodo = titleResult.data as TodoListItem;
      }

      if (notes !== editingTodo.notes) {
        const notesResult = await updateTodoNotes(editingTodo.id, notes);

        if (!notesResult.ok) {
          setTodos(previousTodos);
          setEditingTodo(editingTodo);
          reportActionError(notesResult.error);
          return;
        }

        latestTodo = notesResult.data as TodoListItem;
      }

      if (xpDifficulty !== editingTodo.xp_difficulty) {
        const difficultyResult = await updateTodoDifficulty(editingTodo.id, xpDifficulty);

        if (!difficultyResult.ok) {
          setTodos(previousTodos);
          setEditingTodo(editingTodo);
          reportActionError(difficultyResult.error);
          return;
        }

        latestTodo = difficultyResult.data as TodoListItem;
      }

      if (priority !== editingTodo.priority) {
        const priorityResult = await updateTodoPriority(editingTodo.id, priority);

        if (!priorityResult.ok) {
          setTodos(previousTodos);
          setEditingTodo(editingTodo);
          reportActionError(priorityResult.error);
          return;
        }

        latestTodo = priorityResult.data as TodoListItem;
      }

      if (dueDate !== editingTodo.due_date) {
        const dueDateResult = await updateTodoDueDate(editingTodo.id, dueDate);

        if (!dueDateResult.ok) {
          setTodos(previousTodos);
          setEditingTodo(editingTodo);
          reportActionError(dueDateResult.error);
          return;
        }

        latestTodo = dueDateResult.data as TodoListItem;
      }

      if (latestTodo) {
        setTodos((current) =>
          current.map((todo) =>
            todo.id === editingTodo.id
              ? {
                  ...todo,
                  ...latestTodo,
                  priority: latestTodo.priority ?? nextTodo.priority,
                  due_date: latestTodo.due_date
                }
              : todo
          )
        );
      }
    });
  }

  function renderDifficultyButtons(
    selectedDifficulty: XpDifficulty,
    onSelectDifficulty: (difficulty: XpDifficulty) => void
  ) {
    return (
      <div className="difficulty-options">
        {difficultyOptions.map((option) => (
          <button
            className={selectedDifficulty === option.value ? "selected" : ""}
            key={option.value}
            type="button"
            onClick={() => onSelectDifficulty(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  function renderPriorityButtons(
    selectedPriority: TodoPriority,
    onSelectPriority: (priority: TodoPriority) => void
  ) {
    return (
      <div className="priority-options">
        {priorityOptions.map((option) => (
          <button
            className={selectedPriority === option.value ? "selected" : ""}
            key={option.value}
            type="button"
            onClick={() => onSelectPriority(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  function moveTodo(targetId: string, shouldPersist = true) {
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
    const previousTodos = todos;

    setTodos((current) =>
      current.map((todo) => {
        const nextIndex = reorderedIds.indexOf(todo.id);

        if (nextIndex === -1) {
          return todo;
        }

        return { ...todo, sort_order: (nextIndex + 1) * 1000 };
      })
    );

    if (shouldPersist) {
      startTransition(async () => {
        const result = await reorderTodos(reorderedIds.filter((todoId) => !todoId.startsWith("temp-")));

        if (!result.ok) {
          setTodos(previousTodos);
          reportActionError(result.error);
        }
      });
    }
  }

  function persistCurrentOrder() {
    const persistedIds = openTodos
      .map((todo) => todo.id)
      .filter((todoId) => !todoId.startsWith("temp-"));

    setDraggingId(null);
    startTransition(async () => {
      const result = await reorderTodos(persistedIds);

      if (!result.ok) {
        reportActionError(result.error);
      }
    });
  }

  function handleUndoCompletedTodo() {
    if (!undoCompletedTodoId) {
      return;
    }

    const completedTodo = todos.find(
      (todo) => todo.id === undoCompletedTodoId && todo.status === "completed"
    );

    setUndoCompletedTodoId(null);

    if (!completedTodo) {
      setOperationMessage(null);
      return;
    }

    handleToggle(completedTodo);
  }

  function renderTodo(todo: TodoListItem, isCompleted: boolean) {
    const dueDateLabel = getDueDateLabel(todo.due_date, selectedDate);
    const dueDateState = getDueDateState(todo.due_date, selectedDate);

    return (
      <article
        className={`todo-row ${isCompleted ? "completed" : ""}`}
        draggable={!isCompleted}
        key={todo.id}
        onDragStart={() => setDraggingId(todo.id)}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={() => moveTodo(todo.id, false)}
        onDrop={persistCurrentOrder}
        onDragEnd={() => setDraggingId(null)}
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
          <button
            className="todo-title-button"
            type="button"
            onClick={() => setEditingTodo(todo)}
          >
            {todo.title}
          </button>
          {todo.notes ? <p className="todo-note-preview">{todo.notes}</p> : null}
          <div className="todo-meta-row">
            <span className={`todo-priority-label priority-${todo.priority}`}>
              우선순위 {getPriorityLabel(todo.priority)}
            </span>
            {dueDateLabel ? (
              <span className={`todo-due-label due-${dueDateState}`}>
                {dueDateLabel}
              </span>
            ) : null}
          </div>
        </div>

      </article>
    );
  }

  return (
    <>
      <div className="todo-section-header">
        <div className="todo-section-title-row">
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
        <div className="todo-section-actions">
          <Link className="ghost-button compact-button" href={"/todos/archive" as Route}>
            <Archive size={16} /> 아카이브
          </Link>
          <button
            className={`icon-button secondary add-task-toggle ${isCreatePanelOpen ? "open" : ""}`}
            type="button"
            aria-label={isCreatePanelOpen ? "추가 패널 닫기" : "할 일 또는 루틴 추가"}
            aria-expanded={isCreatePanelOpen}
            onClick={() => setIsCreatePanelOpen((current) => !current)}
            title={isCreatePanelOpen ? "추가 패널 닫기" : "할 일 또는 루틴 추가"}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {operationMessage ? (
        <div className="notice compact-notice operation-notice">
          <span>{operationMessage}</span>
          {undoCompletedTodoId ? (
            <button className="inline-action-button" type="button" onClick={handleUndoCompletedTodo}>
              되돌리기
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={`calendar-drawer ${isCalendarOpen ? "open" : ""}`}>
        <div className="calendar-card">
          <div className="calendar-card-header">
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
            >
              이전
            </button>
            <button
              className="calendar-month-trigger"
              type="button"
              onClick={() => setIsMonthPickerOpen(true)}
            >
              {monthLabel}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                )
              }
            >
              다음
            </button>
          </div>
          {isMonthPickerOpen ? (
            <div className="calendar-picker-backdrop" onClick={() => setIsMonthPickerOpen(false)}>
              <div className="calendar-picker" onClick={(event) => event.stopPropagation()}>
                <strong>년월 선택</strong>
                <div className="calendar-picker-controls">
                  <select
                    value={visibleYear}
                    onChange={(event) =>
                      setVisibleMonth(
                        new Date(Number(event.target.value), visibleMonth.getMonth(), 1)
                      )
                    }
                    aria-label="연도 선택"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                  <select
                    value={visibleMonthIndex}
                    onChange={(event) =>
                      setVisibleMonth(
                        new Date(visibleMonth.getFullYear(), Number(event.target.value), 1)
                      )
                    }
                    aria-label="월 선택"
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index} value={index}>
                        {index + 1}월
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setIsMonthPickerOpen(false)}
                >
                  이동
                </button>
              </div>
            </div>
          ) : null}
          <div className="calendar-weekdays">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((date) => {
              const dateString = toDateString(date);
              const isSelected = dateString === selectedDate;
              const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
              const dayTodos = todos.filter((todo) => todo.todo_date === dateString);
              const routineIdsForDate = new Set(
                dayTodos
                  .map((todo) => todo.routine_id)
                  .filter((routineId): routineId is string => Boolean(routineId))
              );
              const weekday = date.getDay();
              const routineCount = routines.filter(
                (routine) =>
                  isRoutineAvailableOnDate(routine, dateString, weekday) &&
                  !routineIdsForDate.has(routine.id)
              ).length;
              const openCount =
                dayTodos.filter((todo) => todo.status === "open").length + routineCount;
              const completedCount = dayTodos.filter((todo) => todo.status === "completed").length;

              return (
                <button
                  className={`${isSelected ? "selected" : ""} ${
                    isOutsideMonth ? "outside-month" : ""
                  }`}
                  key={dateString}
                  type="button"
                  onClick={() => setSelectedDate(dateString)}
                >
                  <span>{date.getDate()}</span>
                  <span className="calendar-badges">
                    {openCount > 0 ? <em className="open-count">{openCount}</em> : null}
                    {completedCount > 0 ? (
                      <em className="completed-count">{completedCount}</em>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isCreatePanelOpen ? (
        <section className="create-quest-panel" aria-label="할 일과 루틴 추가">
          <form className="form-row" action={handleCreate}>
            <input type="hidden" name="todoDate" value={selectedDate} />
            <input type="hidden" name="xpDifficulty" value={newDifficulty} />
            <input type="hidden" name="priority" value={newPriority} />
            <input
              name="title"
              placeholder="할 일을 입력하세요"
              aria-label="새 할 일"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <textarea
              className="create-notes-input"
              name="notes"
              placeholder="메모를 추가해도 좋아요"
              aria-label="새 할 일 메모"
              rows={2}
            />
            <fieldset className="difficulty-field create-difficulty-field">
              <legend>난이도</legend>
              {renderDifficultyButtons(newDifficulty, setNewDifficulty)}
            </fieldset>
            <fieldset className="priority-field create-priority-field">
              <legend>우선순위</legend>
              {renderPriorityButtons(newPriority, setNewPriority)}
            </fieldset>
            <label className="due-date-field create-due-date-field">
              <span>마감일 (선택)</span>
              <input name="dueDate" type="date" />
            </label>
            <button className="icon-button" type="submit" aria-label="할 일 추가">
              <Plus size={18} />
            </button>
          </form>

          <form className="routine-form" action={handleCreateRoutine}>
            <input type="hidden" name="todoDate" value={selectedDate} />
            <input type="hidden" name="xpDifficulty" value={routineDifficulty} />
            <input
              name="title"
              placeholder="반복할 일을 입력하세요"
              aria-label="새 루틴"
              value={routineTitle}
              onChange={(event) => setRoutineTitle(event.target.value)}
            />
            <div className="segmented-control compact">
              <button
                className={routineFrequency === "daily" ? "selected" : ""}
                type="button"
                onClick={() => setRoutineFrequency("daily")}
              >
                매일
              </button>
              <button
                className={routineFrequency === "weekly" ? "selected" : ""}
                type="button"
                onClick={() => setRoutineFrequency("weekly")}
              >
                요일 선택
              </button>
            </div>
            <input type="hidden" name="frequency" value={routineFrequency} />
            <fieldset className="difficulty-field create-difficulty-field">
              <legend>난이도</legend>
              {renderDifficultyButtons(routineDifficulty, setRoutineDifficulty)}
            </fieldset>
            {routineFrequency === "weekly" ? (
              <div className="weekday-picker">
                {weekdayOptions.map((day) => (
                  <label
                    className={routineWeekdays.includes(day.value) ? "selected" : ""}
                    key={day.value}
                  >
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={day.value}
                      checked={routineWeekdays.includes(day.value)}
                      onChange={() => toggleRoutineWeekday(day.value)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            ) : null}
            <button className="ghost-button" type="submit">
              <Plus size={16} /> 루틴 추가
            </button>
          </form>
        </section>
      ) : null}

      <section className="routine-panel">
        <div className="routine-panel-header">
          <h3>
            <Repeat2 size={17} /> 루틴
          </h3>
        </div>

        {selectedRoutines.length > 0 ? (
          <div className="routine-list">
            {selectedRoutines.map((routine) => (
                <article className="routine-row" key={routine.id}>
                  <button
                    className="todo-check"
                    type="button"
                    onClick={() => handleCompleteRoutine(routine)}
                    aria-label={`${routine.title} 루틴 완료`}
                  />
                  <button
                    className="routine-edit-trigger"
                    type="button"
                    onClick={() => setEditingRoutine(routine)}
                  >
                    <strong>{routine.title}</strong>
                  </button>
                  <button
                    className="icon-button secondary"
                    type="button"
                    onClick={() => setEndingRoutine(routine)}
                    aria-label="루틴 종료"
                    title="루틴 종료"
                  >
                    <Square size={16} />
                  </button>
                  <button
                    className="icon-button secondary"
                    type="button"
                    onClick={() => handleDeleteRoutine(routine.id)}
                    aria-label="루틴 삭제"
                    title="루틴 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
            ))}
          </div>
        ) : null}
      </section>

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

      {editingTodo ? (
        <div className="modal-backdrop" onClick={() => setEditingTodo(null)}>
          <form
            className="confirm-modal todo-detail-modal"
            action={handleUpdateTodoDetail}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>할 일 상세</h2>
            {editingTodo.status === "open" ? (
              <>
                <label>
                  할 일
                  <input name="title" defaultValue={editingTodo.title} />
                </label>
                <label>
                  메모
                  <textarea name="notes" defaultValue={editingTodo.notes ?? ""} rows={4} />
                </label>
              </>
            ) : (
              <div className="detail-readonly-row">
                <span className="subtle">할 일</span>
                <strong>{editingTodo.title}</strong>
              </div>
            )}
            {editingTodo.status !== "open" && editingTodo.notes ? (
              <div className="detail-readonly-row">
                <span className="subtle">메모</span>
                <p>{editingTodo.notes}</p>
              </div>
            ) : null}
            <input type="hidden" name="xpDifficulty" value={editingTodo.xp_difficulty} readOnly />
            <input type="hidden" name="priority" value={editingTodo.priority} readOnly />
            {editingTodo.status === "open" ? (
              <>
                <label>
                  마감일 (선택)
                  <input name="dueDate" type="date" defaultValue={editingTodo.due_date ?? ""} />
                </label>
                <fieldset className="difficulty-field">
                  <legend>난이도</legend>
                  {renderDifficultyButtons(editingTodo.xp_difficulty, (difficulty) => {
                    const xpReward = getXpRewardForDifficulty(difficulty);

                    setEditingTodo({
                      ...editingTodo,
                      xp_difficulty: difficulty,
                      xp_reward: xpReward,
                      base_xp_reward: xpReward
                    });
                  })}
                </fieldset>
                <fieldset className="priority-field">
                  <legend>우선순위</legend>
                  {renderPriorityButtons(editingTodo.priority, (priority) => {
                    setEditingTodo({
                      ...editingTodo,
                      priority
                    });
                  })}
                </fieldset>
              </>
            ) : null}
            <div className="form-actions">
              <button
                className="primary-button danger-button"
                type="button"
                onClick={() => handleDeleteFromDetail(editingTodo)}
              >
                <Trash2 size={16} /> 삭제
              </button>
              <button className="ghost-button" type="button" onClick={() => setEditingTodo(null)}>
                취소
              </button>
              {editingTodo.status === "open" ? (
                <button className="primary-button" type="submit">
                  저장
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {editingRoutine ? (
        <div className="modal-backdrop" onClick={() => setEditingRoutine(null)}>
          <form
            className="confirm-modal routine-edit-modal"
            action={handleUpdateRoutine}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>루틴 수정</h2>
            <label>
              루틴 이름
              <input name="title" defaultValue={editingRoutine.title} />
            </label>
            <input type="hidden" name="frequency" value={editingRoutine.frequency} readOnly />
            <input type="hidden" name="xpDifficulty" value={editingRoutine.xp_difficulty} readOnly />
            <div className="segmented-control compact smooth-toggle">
              <button
                className={editingRoutine.frequency === "daily" ? "selected" : ""}
                type="button"
                onClick={() => setEditingRoutine({ ...editingRoutine, frequency: "daily", weekdays: [] })}
              >
                매일
              </button>
              <button
                className={editingRoutine.frequency === "weekly" ? "selected" : ""}
                type="button"
                onClick={() => setEditingRoutine({ ...editingRoutine, frequency: "weekly" })}
              >
                요일 선택
              </button>
            </div>
            <fieldset className="difficulty-field">
              <legend>난이도</legend>
              {renderDifficultyButtons(editingRoutine.xp_difficulty, (difficulty) => {
                const xpReward = getXpRewardForDifficulty(difficulty);

                setEditingRoutine({
                  ...editingRoutine,
                  xp_difficulty: difficulty,
                  xp_reward: xpReward,
                  base_xp_reward: xpReward
                });
              })}
            </fieldset>
            {editingRoutine.frequency === "weekly" ? (
              <div className="weekday-picker">
                {weekdayOptions.map((day) => {
                  const isSelected = editingRoutine.weekdays.includes(day.value);

                  return (
                    <label className={isSelected ? "selected" : ""} key={day.value}>
                      <input
                        type="checkbox"
                        name="weekdays"
                        value={day.value}
                        checked={isSelected}
                        onChange={() =>
                          setEditingRoutine({
                            ...editingRoutine,
                            weekdays: isSelected
                              ? editingRoutine.weekdays.filter((value) => value !== day.value)
                              : [...editingRoutine.weekdays, day.value].sort((a, b) => a - b)
                          })
                        }
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
            ) : null}
            <div className="form-actions">
              <button className="ghost-button" type="button" onClick={() => setEditingRoutine(null)}>
                취소
              </button>
              <button className="primary-button" type="submit">
                저장
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {endingRoutine ? (
        <div className="modal-backdrop" onClick={() => setEndingRoutine(null)}>
          <div
            className="confirm-modal routine-end-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>루틴 종료</h2>
            <p>
              {selectedDate}부로 <strong>{endingRoutine.title}</strong> 루틴을 종료하시겠습니까?
            </p>
            <div className="form-actions">
              <button className="ghost-button" type="button" onClick={() => setEndingRoutine(null)}>
                취소
              </button>
              <button className="primary-button danger-button" type="button" onClick={handleEndRoutine}>
                종료
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
