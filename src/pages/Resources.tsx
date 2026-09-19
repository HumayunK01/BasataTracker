import { Navigate, useParams } from "react-router-dom";

// ponytail: doc ids live in code; to link a new reference doc, add a slug here
// and a sidebar entry pointing at /resources/<slug>.
const DOCS: Record<string, { title: string; url: string }> = {
  "cheat-sheet": {
    title: "Cheat Sheet",
    url: "https://docs.google.com/document/d/1kxOL1qi77tZFXEtyHxikl3f7ebaus4rgQI66OtrobYw/preview",
  },
  "test-patients": {
    title: "Labeling Guide",
    url: "https://docs.google.com/document/d/1-ukEpMxL1YvdE4w7DNwhA3xRyGcimeH8ScGjqa03Pr0/preview",
  },
};

export default function Resources() {
  const { docId } = useParams<{ docId: string }>();
  const doc = docId ? DOCS[docId] : undefined;
  if (!doc) return <Navigate to="/console" replace />;
  return (
    <div className="flex-1 flex flex-col min-h-0 p-2 sm:p-4">
      <iframe
        aria-label={doc.title}
        src={doc.url}
        className="flex-1 w-full rounded-md border border-border bg-background"
      />
    </div>
  );
}