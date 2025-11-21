import React, { useState, useMemo } from "react";
import {
  FaFileAlt,
  FaCertificate,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaTools,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "../styles/m-analytics-dashboard.css";

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div
      className="stat-icon"
      style={{ color: color, background: "rgba(0,0,0,0.05)" }}
    >
      {icon}
    </div>
    <div className="stat-info">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div className="stat-card skeleton-card">
    <div className="skeleton skeleton-icon"></div>
    <div className="stat-info">
      <div className="skeleton skeleton-line skeleton-value"></div>
      <div className="skeleton skeleton-line skeleton-label"></div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="chart-container skeleton-card">
    <div
      className="skeleton skeleton-line skeleton-title"
      style={{ margin: "0 auto 1rem auto", width: "50%" }}
    ></div>
    <div className="skeleton skeleton-chart-area"></div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="analytics-dashboard">
    <div className="stats-grid">
      {[...Array(8)].map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="charts-grid" style={{ marginTop: "1.25rem" }}>
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);

const ChartCard = ({ title, data }) => {
  const getColor = (name) => {
    switch (name.toLowerCase()) {
      case "approved":
        return "#22c55e"; // green
      case "declined":
        return "#ef4444"; // red
      case "pending":
        return "#f97316"; // orange
      case "resolved":
        return "#3b82f6"; // blue
      case "in progress":
        return "#8b5cf6"; // violet
      case "canceled":
        return "#6b7280"; // gray
      default:
        return "#8884d8"; // default recharts color
    }
  };

  return (
    <div className="chart-container">
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 5, right: 10, left: -10, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
          <XAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="count" barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const AnalyticsDashboard = ({ reports, requests, isLoading }) => {
  const [timeRange, setTimeRange] = useState("all"); // 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'all'
  const [showStats, setShowStats] = useState(true);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // Assuming week starts on Sunday (0)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Corrected variable name

    const filterByRange = (item) => {
      const itemTime = new Date(item.created_at).getTime(); // Use created_at and convert to timestamp
      switch (timeRange) {
        case "today":
          return itemTime >= startOfToday.getTime();
        case "yesterday":
          return (
            itemTime >= startOfYesterday.getTime() &&
            itemTime < startOfToday.getTime()
          );
        case "this_week":
          return (
            itemTime >= startOfWeek.getTime() &&
            itemTime < startOfToday.getTime() + 24 * 60 * 60 * 1000
          ); // Ensure it includes today
        case "last_week":
          return (
            itemTime >= startOfLastWeek.getTime() &&
            itemTime < startOfWeek.getTime() + 24 * 60 * 60 * 1000
          ); // Ensure it includes the whole week
        case "this_month":
          return itemTime >= startOfMonth.getTime();
        case "last_month":
          return (
            itemTime >= startOfLastMonth.getTime() &&
            itemTime < startOfMonth.getTime()
          );
        case "all":
        default:
          return true;
      }
    };

    return {
      reports: reports.filter(filterByRange),
      requests: requests.filter(filterByRange),
    };
  }, [reports, requests, timeRange]);

  const reportStats = {
    total: timeRange === "all" ? reports.length : filteredData.reports.length,
    resolved: filteredData.reports.filter((r) =>
      ["done", "archived"].includes(r.status)
    ).length,
    pending: filteredData.reports.filter((r) =>
      ["submitted", "reviewed"].includes(r.status)
    ).length,
    inProgress: filteredData.reports.filter((r) => r.status === "in-progress")
      .length,
    approved: filteredData.reports.filter((r) => r.status === "approved")
      .length,
    declined: filteredData.reports.filter((r) => r.status === "declined")
      .length,
    canceled: filteredData.reports.filter((r) =>
      ["canceled", "canceled-archived"].includes(r.status)
    ).length,
  };

  const certStats = {
    total: timeRange === "all" ? requests.length : filteredData.requests.length,
    pending: filteredData.requests.filter((r) => r.status === "Pending").length,
    approved: filteredData.requests.filter((r) => r.status === "Approved")
      .length,
    declined: filteredData.requests.filter((r) => r.status === "Declined")
      .length,
    canceled: filteredData.requests.filter((r) => r.status === "Canceled")
      .length,
  };

  // Calculate stats for various time periods for the "All Time" summary view
  const summaryStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const dayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const calculateReports = (filterFn) => {
      const filtered = reports.filter((r) => filterFn(r));
      return {
        filed: filtered.length,
        resolved: filtered.filter((r) =>
          ["done", "archived"].includes(r.status)
        ).length,
        declined: filtered.filter((r) => r.status === "declined").length,
        canceled: filtered.filter((r) =>
          ["canceled", "canceled-archived"].includes(r.status)
        ).length,
      };
    };

    const calculateCerts = (filterFn) => {
      const filtered = requests.filter((r) => filterFn(r));
      return {
        requested: filtered.length,
        approved: filtered.filter((r) => r.status === "Approved").length,
        declined: filtered.filter((r) => r.status === "Declined").length,
        canceled: filtered.filter((r) => r.status === "Canceled").length,
      };
    };

    return {
      reports: {
        today: calculateReports((r) => r.date >= startOfToday.getTime()),
        yesterday: calculateReports(
          (r) =>
            new Date(r.created_at).getTime() >= startOfYesterday.getTime() &&
            new Date(r.created_at).getTime() < startOfToday.getTime()
        ),
        thisWeek: calculateReports(
          (r) => new Date(r.created_at).getTime() >= startOfWeek.getTime()
        ),
      },
      certs: {
        today: calculateCerts(
          (r) => new Date(r.created_at).getTime() >= startOfToday.getTime()
        ),
        yesterday: calculateCerts(
          (r) =>
            new Date(r.created_at).getTime() >= startOfYesterday.getTime() &&
            new Date(r.created_at).getTime() < startOfToday.getTime()
        ),
        thisWeek: calculateCerts(
          (r) => new Date(r.created_at).getTime() >= startOfWeek.getTime()
        ),
      },
    };
  }, [reports, requests]); // Added requests to dependency array

  const SummaryRow = ({ period, stats }) => (
    <div className="summary-row">
      <div className="summary-period">{period}</div>
      <div className="summary-stat">
        <span className="summary-value">{stats.filed}</span>
        <span className="summary-label">Filed</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{stats.resolved}</span>
        <span className="summary-label">Resolved</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{stats.declined}</span>
        <span className="summary-label">Declined</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{stats.canceled}</span>
        <span className="summary-label">Canceled</span>
      </div>
    </div>
  );

  const reportData = [
    { name: "Approved", count: reportStats.approved },
    { name: "Declined", count: reportStats.declined },
    { name: "Resolved", count: reportStats.resolved },
    { name: "Pending", count: reportStats.pending },
    { name: "In Progress", count: reportStats.inProgress },
    { name: "Canceled", count: reportStats.canceled },
  ];
  const certData = [
    { name: "Approved", count: certStats.approved },
    { name: "Declined", count: certStats.declined },
    { name: "Pending", count: certStats.pending },
    { name: "Canceled", count: certStats.canceled },
  ];

  const recent = (arr) =>
    [...arr]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5);

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h3>Dashboard</h3>
        <div className="dashboard-controls">
          <button
            className="toggle-stats-btn"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? <FaEyeSlash /> : <FaEye />}
            <span>{showStats ? "Hide Stats" : "Show Stats"}</span>
          </button>
          <select
            className="time-range-selector"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        {timeRange === "all" ? (
          <>
            <StatCard
              icon={<FaFileAlt />}
              label="Total Reports Filed"
              value={reportStats.total}
              color="#3b82f6"
            />
            <StatCard
              icon={<FaCheckCircle />}
              label="Resolved Reports"
              value={reportStats.resolved}
              color="#22c55e"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Declined Reports"
              value={reportStats.declined}
              color="#ef4444"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Canceled Reports"
              value={reportStats.canceled}
              color="#6b7280"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<FaFileAlt />}
              label="Reports Filed"
              value={reportStats.total}
              color="#3b82f6"
            />
            <StatCard
              icon={<FaClock />}
              label="Pending Reports"
              value={reportStats.pending}
              color="#f97316"
            />
            <StatCard
              icon={<FaCheckCircle />}
              label="Approved Reports"
              value={reportStats.approved}
              color="#16a34a"
            />
            <StatCard
              icon={<FaTools />}
              label="In Progress"
              value={reportStats.inProgress}
              color="#8b5cf6"
            />
            <StatCard
              icon={<FaCheckCircle />}
              label="Resolved Reports"
              value={reportStats.resolved}
              color="#22c55e"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Declined Reports"
              value={reportStats.declined}
              color="#ef4444"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Canceled Reports"
              value={reportStats.canceled}
              color="#6b7280"
            />
          </>
        )}
      </div>

      <div className={`stats-container ${!showStats ? "hidden" : ""}`}>
        <div className="charts-grid" style={{ overflow: "hidden" }}>
          <ChartCard title="Report Status" data={reportData} />
        </div>
      </div>

      <div className="stats-grid">
        {timeRange === "all" ? (
          <>
            <StatCard
              icon={<FaCertificate />}
              label="Total Cert. Requests"
              value={certStats.total}
              color="#3b82f6"
            />
            <StatCard
              icon={<FaCheckCircle />}
              label="Approved Certs"
              value={certStats.approved}
              color="#22c55e"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Declined Certs"
              value={certStats.declined}
              color="#ef4444"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Canceled Certs"
              value={certStats.canceled}
              color="#6b7280"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<FaCertificate />}
              label="Total Cert. Requests"
              value={certStats.total}
              color="#3b82f6"
            />
            <StatCard
              icon={<FaClock />}
              label="Pending Certs"
              value={certStats.pending}
              color="#f97316"
            />
            <StatCard
              icon={<FaCheckCircle />}
              label="Approved Certs"
              value={certStats.approved}
              color="#22c55e"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Declined Certs"
              value={certStats.declined}
              color="#ef4444"
            />
            <StatCard
              icon={<FaTimesCircle />}
              label="Canceled Certs"
              value={certStats.canceled}
              color="#6b7280"
            />
          </>
        )}
      </div>

      <div className={`stats-container ${!showStats ? "hidden" : ""}`}>
        <div className="charts-grid" style={{ overflow: "hidden" }}>
          <ChartCard title="Certificate Request Status" data={certData} />
        </div>
      </div>

      {timeRange === "all" && (
        <div className="charts-grid">
          <div className="time-summary-container">
            <h4>Reports Summary</h4>
            <SummaryRow period="Today" stats={summaryStats.reports.today} />
            <SummaryRow
              period="Yesterday"
              stats={summaryStats.reports.yesterday}
            />
            <SummaryRow
              period="This Week"
              stats={summaryStats.reports.thisWeek}
            />
          </div>
          <div className="time-summary-container">
            <h4>Certificates Summary</h4>
            <div className="summary-row">
              <div className="summary-period">Today</div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.today.requested}
                </span>
                <span className="summary-label">Requested</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.today.approved}
                </span>
                <span className="summary-label">Approved</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.today.declined}
                </span>
                <span className="summary-label">Declined</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.today.canceled}
                </span>
                <span className="summary-label">Canceled</span>
              </div>
            </div>
            <div className="summary-row">
              <div className="summary-period">Yesterday</div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.yesterday.requested}
                </span>
                <span className="summary-label">Requested</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.yesterday.approved}
                </span>
                <span className="summary-label">Approved</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.yesterday.declined}
                </span>
                <span className="summary-label">Declined</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.yesterday.canceled}
                </span>
                <span className="summary-label">Canceled</span>
              </div>
            </div>
            <div className="summary-row">
              <div className="summary-period">This Week</div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.thisWeek.requested}
                </span>
                <span className="summary-label">Requested</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.thisWeek.approved}
                </span>
                <span className="summary-label">Approved</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.thisWeek.declined}
                </span>
                <span className="summary-label">Declined</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">
                  {summaryStats.certs.thisWeek.canceled}
                </span>
                <span className="summary-label">Canceled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="recent-activity-grid">
        {[
          {
            title: "Recent Reports",
            data: recent(filteredData.reports),
            type: "report",
          },
          {
            title: "Recent Certificate Requests",
            data: recent(filteredData.requests),
            type: "request",
          },
        ].map(({ title, data, type }) => (
          <div key={title} className="recent-list-container">
            <h4>{title}</h4>
            <div className="recent-list">
              {data.length ? (
                data.map((item) => (
                  <div key={item.id} className="recent-item">
                    <div>
                      <span className="item-type">{item.type}</span>
                      {type === "request" && (
                        <span className="item-requester">
                          by {item.requester}
                        </span>
                      )}
                    </div>
                    <span className="item-status" data-status={item.status}>
                      {item.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="no-recent-data">No {type}s found.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
