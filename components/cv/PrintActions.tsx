"use client";

// Small client island: the print page is otherwise fully server-rendered.
export default function PrintActions() {
  return (
    <div className="cvpr-bar" data-print-hide="true">
      <button className="cvpr-btn" onClick={() => window.print()}>
        ⤓ Save as PDF
      </button>
      <button className="cvpr-btn ghost" onClick={() => history.back()}>
        ← Back
      </button>
    </div>
  );
}
