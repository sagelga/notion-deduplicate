"use client";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <div className="dashboard-header">
      <div>
        <h1 className="dashboard-title">{title}</h1>
        <p className="dashboard-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}