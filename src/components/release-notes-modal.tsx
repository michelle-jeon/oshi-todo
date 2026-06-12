import { acknowledgeLatestRelease } from "@/app/release-actions";
import type { ReleaseNote } from "@/lib/release-notes";

type ReleaseNotesModalProps = {
  release: ReleaseNote;
};

export function ReleaseNotesModal({ release }: ReleaseNotesModalProps) {
  return (
    <div className="modal-backdrop release-notes-backdrop" role="presentation">
      <section
        className="confirm-modal release-notes-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
      >
        <div>
          <p className="release-version">v{release.version} · {release.publishedAt}</p>
          <h2 id="release-notes-title">새로운 업데이트가 있어요</h2>
          <p className="subtle">{release.title}</p>
        </div>
        <ul>
          {release.changes.map((change) => <li key={change}>{change}</li>)}
        </ul>
        <form action={acknowledgeLatestRelease}>
          <button className="primary-button" type="submit">확인했어요</button>
        </form>
      </section>
    </div>
  );
}
