// Signature study panel: micro-fine double border enclosing the content.
// Use this instead of a plain card for every "study panel" surface.
export default function StudyPanel({ className = "", as: Tag = "div", children, ...props }) {
  return (
    <Tag className={`study-panel ${className}`} {...props}>
      {children}
    </Tag>
  );
}