type EnvironmentBrandProps = {
  className?: string;
};

function isDevelopmentEnvironment() {
  return process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "development" ||
    process.env.NODE_ENV === "development";
}

export function EnvironmentBrand({ className }: EnvironmentBrandProps) {
  return (
    <span className={`environment-brand ${className ?? ""}`.trim()}>
      <span>OshiTodo</span>
      {isDevelopmentEnvironment() ? <small>DEV</small> : null}
    </span>
  );
}
