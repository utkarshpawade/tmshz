export default function AnalyticsPage() {
  return (
    <div
      data-screen-label="05 Analytics"
      className="screen"
      style={{ padding: 16, display: "grid", placeItems: "center" }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div className="t-hero" style={{ marginBottom: 12 }}>Analytics</div>
        <div className="t-meta">
          Long-form trends, MAPE accuracy, sensor-health rollups. Open in a wider dashboard.
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 18 }}>Open analytics</button>
      </div>
    </div>
  );
}
