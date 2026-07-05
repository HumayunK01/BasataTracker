export function DeferRender({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return <div id={id} className={"cv-auto" + (className ? " " + className : "")}>{children}</div>;
}
