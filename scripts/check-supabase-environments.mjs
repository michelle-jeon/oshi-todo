import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  { name: "development", file: ".env.development.local" },
  { name: "production", file: ".env.production.local" }
];

function readEnv(file) {
  if (!fs.existsSync(file)) return null;

  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      })
  );
}

function projectRef(url) {
  const match = url?.match(/^https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

const results = targets.map((target) => {
  const env = readEnv(path.join(root, target.file));
  const ref = projectRef(env?.NEXT_PUBLIC_SUPABASE_URL);
  const complete = Boolean(
    ref &&
    (env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    env?.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );

  return { ...target, ref, complete };
});

const legacyLocalEnvExists = fs.existsSync(path.join(root, ".env.local"));

if (legacyLocalEnvExists) {
  console.error("오류: .env.local이 환경별 파일보다 우선 적용됩니다. 분리 완료 후 제거해 주세요.");
}

for (const result of results) {
  console.log(
    `${result.name}: ${result.complete ? `설정됨 (${result.ref})` : `${result.file} 설정 필요`}`
  );
}

if (legacyLocalEnvExists || !results.every((result) => result.complete)) {
  process.exitCode = 1;
} else if (results[0].ref === results[1].ref) {
  console.error("오류: development와 production이 같은 Supabase 프로젝트를 가리킵니다.");
  process.exitCode = 1;
} else {
  console.log("확인 완료: development와 production Supabase 프로젝트가 분리되어 있습니다.");
}
