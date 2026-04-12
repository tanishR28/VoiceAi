"use client";

import { AlertTriangle, AlertCircle, Info, XCircle } from "lucide-react";

const iconMap = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
};

const titleMap = {
  critical: "Critical Alert",
  high: "High Priority Alert",
  medium: "Warning",
  low: "Information",
};

export default function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div id="alert-banners">
      {alerts.map((alert, i) => {
        const Icon = iconMap[alert.severity] || Info;
        return (
          <div
            key={i}
            className={`alert-banner ${alert.severity}`}
            id={`alert-${i}`}
          >
            <div className="alert-icon">
              <Icon size={20} />
            </div>
            <div className="alert-content">
              <div className="alert-title">
                {titleMap[alert.severity] || "Alert"}
                {alert.biomarker && (
                  <span style={{ opacity: 0.7, fontWeight: 400 }}>
                    {" "}
                    — {alert.biomarker}
                  </span>
                )}
              </div>
              <div className="alert-message">{alert.message}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
