"use client";

import { useFormStatus } from "react-dom";

type AuthSubmitButtonProps = {
  children: string;
  className: string;
  pendingText: string;
};

export function AuthSubmitButton({ children, className, pendingText }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-live="polite">
      {pending ? (
        <>
          <span className="button-spinner" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
