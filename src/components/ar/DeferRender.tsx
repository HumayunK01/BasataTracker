import { useEffect, useRef, useState } from "react";

interface DeferRenderProps {
  /** Reserved height so layout doesn't shift before the content mounts. */
  minHeight: number | string;
  /** Distance (CSS margin syntax) ahead of the viewport at which to mount. */
  rootMargin?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Mounts `children` only once the wrapper scrolls within `rootMargin` of the
 * viewport, then keeps it mounted. Heavy subtrees (e.g. Recharts SVGs) stay
 * un-rendered while offscreen, so scrolling doesn't repaint them.
 */
export function DeferRender({ minHeight, rootMargin = "600px", id, className, children }: DeferRenderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} id={id} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
