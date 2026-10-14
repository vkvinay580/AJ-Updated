export default function AdminLoading() {
  return <div className="admin-page workspace-loading" aria-busy="true" aria-label="Loading page">
    <div className="workspace-loading-bar"/>
    <div className="workspace-loading-title"/>
    <div className="workspace-loading-grid">
      <div className="workspace-loading-card"/>
      <div className="workspace-loading-card"/>
      <div className="workspace-loading-card"/>
    </div>
    <div className="workspace-loading-card workspace-loading-panel"/>
  </div>;
}
