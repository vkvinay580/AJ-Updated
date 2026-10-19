export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-mark" aria-hidden="true" />
      <p>Preparing your view</p>
    </div>
  );
}
