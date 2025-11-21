import React, { useState, useMemo, useEffect } from "react";
import {
  FaUsers,
  FaUserClock,
  FaChartLine,
  FaFileExport,
  FaShieldAlt,
  FaServer,
  FaUserPlus,
  FaHistory,
  FaFileAlt,
  FaTools,
  FaClipboardCheck,
  FaBullhorn,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCertificate,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaEye,
  FaEyeSlash,
  FaNewspaper,
  FaTrash,
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import "../styles/analytics-dashboard.css";

const StatCard = ({ icon, label, value, detail, color }) => (
  <div className="stat-card">
    <div
      className="stat-icon"
      style={color ? { color: color, background: `${color}20` } : {}}
    >
      {icon}
    </div>
    <div className="stat-info">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {detail && <span className="stat-detail">{detail}</span>}
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
  <div className="chart-section skeleton-card">
    <div
      className="skeleton skeleton-line skeleton-title"
      style={{ margin: "0 auto 1rem auto", width: "50%" }}
    ></div>
    <div className="skeleton skeleton-chart-area"></div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="analytics-dashboard-container">
    <div className="stats-grid">
      {[...Array(3)].map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="charts-grid">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);

const ROLE_COLORS = {
  Admins: "#0ea5e9",
  Moderators: "#8b5cf6",
  Residents: "#10b981",
};

const AdminAnalyticsDashboard = ({
  users,
  reports,
  settings,
  certificationRequests,
  processedPosts,
  postSearchTerm,
  setPostSearchTerm,
  sortOrder,
  setSortOrder,
  filterCategory,
  setFilterCategory,
  POST_CATEGORIES,
  handleDeletePost,
  getCategoryClass,
}) => {
  const [activeTab, setActiveTab] = useState("users");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("All");
  const [selectedMunicipality, setSelectedMunicipality] = useState("All");
  // State for fetched location data
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Assuming an isLoading prop is passed from admin-home.jsx
  const isLoading = !users || !reports || !settings || !certificationRequests;
  if (isLoading) return <DashboardSkeleton />;

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSetPresetRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setEndDate(formatDateForInput(end));
    setStartDate(formatDateForInput(start));
  };

  // Fetch municipalities on component mount
  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/municipalities"
        );
        if (!response.ok) throw new Error("Failed to fetch municipalities");
        const data = await response.json();
        setMunicipalities(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchMunicipalities();
  }, []);

  // Fetch barangays when a municipality is selected
  useEffect(() => {
    if (selectedMunicipality && selectedMunicipality !== "All") {
      const municipality = municipalities.find(
        (m) => m.name === selectedMunicipality
      );
      if (!municipality) return;

      const fetchBarangays = async () => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/barangays/${municipality.id}`
          );
          if (!response.ok) throw new Error("Failed to fetch barangays");
          const data = await response.json();
          setBarangays(data);
        } catch (error) {
          console.error(error);
          setBarangays([]);
        }
      };
      fetchBarangays();
    } else {
      setBarangays([]); // Clear barangays if 'All Municipalities' is selected
    }
  }, [selectedMunicipality, municipalities]);

  const userAnalytics = useMemo(() => {
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate
      ? new Date(endDate).setHours(23, 59, 59, 999)
      : Date.now();

    // Filter out admins from all calculations
    const nonAdminUsers = users.filter((user) => user.role !== "admin");

    // Filter users by selected municipality first for total counts
    const usersInMunicipality =
      selectedMunicipality === "All"
        ? nonAdminUsers
        : nonAdminUsers.filter((u) => u.municipality === selectedMunicipality);

    // Calculate users in the selected municipality (not affected by date range)
    const usersInSelectedMunicipality =
      selectedMunicipality === "All"
        ? 0 // Don't show if "All" is selected
        : usersInMunicipality.length;

    // Determine the base user list for calculations (all or filtered by barangay)
    const baseUsers =
      selectedBarangay === "All"
        ? usersInMunicipality // Use users already filtered by municipality
        : usersInMunicipality.filter((u) => u.barangay === selectedBarangay);

    // Filter users and logs by the selected date range
    const filteredUsers = baseUsers.filter(
      (u) =>
        new Date(u.created_at).getTime() >= start &&
        new Date(u.created_at).getTime() <= end
    );

    // --- Chart Data Logic ---
    const registrationsByDay = new Map();
    filteredUsers.forEach((user) => {
      if (user.created_at) {
        const registrationDate = new Date(user.created_at).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        );
        registrationsByDay.set(
          registrationDate,
          (registrationsByDay.get(registrationDate) || 0) + 1
        );
      }
    });

    const chartStart = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const chartEnd = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(chartEnd - chartStart);
    const diffDays = Math.min(
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1,
      90
    ); // Cap at 90 days for performance

    const chartData = [];
    for (let i = 0; i < diffDays; i++) {
      const date = new Date(chartStart);
      date.setDate(chartStart.getDate() + i);
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      chartData.push({
        date: formattedDate,
        Registrations: registrationsByDay.get(formattedDate) || 0,
      });
    }

    const usersInSelectedBarangay =
      selectedBarangay === "All"
        ? users.length // Show total if 'All' is selected
        : users.filter((u) => u.barangay === selectedBarangay).length;

    const roleCounts = nonAdminUsers.reduce(
      (acc, user) => {
        const role = user.role || "resident";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { moderator: 0, resident: 0 }
    );

    const roleDistribution = [
      { name: "Moderators", value: roleCounts.moderator || 0 },
      { name: "Residents", value: roleCounts.resident || 0 },
    ].filter((role) => role.value > 0);

    return {
      totalUsers: usersInMunicipality.length,
      newUsersInRange: filteredUsers.length,
      activeUsersInRange: 0, // This needs to be recalculated from DB if needed
      registrationTrend: chartData,
      roleDistribution,
      // The card for barangay count now shows total for that barangay, not affected by date.
      usersInSelectedMunicipality,
      usersInSelectedBarangay: users.filter(
        (u) => selectedBarangay === "All" || u.barangay === selectedBarangay
      ).length,
    };
  }, [users, startDate, endDate, selectedMunicipality, selectedBarangay]);

  const reportAnalytics = useMemo(() => {
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate
      ? new Date(endDate).setHours(23, 59, 59, 999)
      : Date.now();

    // Filter reports by date range, municipality, and selected barangay
    const filteredReports = reports.filter((report) => {
      const reportDate = new Date(report.created_at).getTime();
      const matchesMunicipality =
        selectedMunicipality === "All" ||
        report.municipality === selectedMunicipality;
      const matchesBarangay =
        selectedBarangay === "All" || report.barangay === selectedBarangay;
      return (
        reportDate >= start &&
        reportDate <= end &&
        matchesMunicipality &&
        matchesBarangay
      );
    });

    const statusCounts = filteredReports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {});

    const categoryCounts = filteredReports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalInRange: filteredReports.length,
      statusCounts,
      categoryChartData: Object.entries(categoryCounts).map(
        ([name, count]) => ({ name, count })
      ),
    };
  }, [reports, startDate, endDate, selectedMunicipality, selectedBarangay]);

  const reportStatusChartData = useMemo(() => {
    return Object.entries(reportAnalytics.statusCounts)
      .map(([name, value]) => ({
        // Capitalize first letter for display
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
      .filter((entry) => entry.value > 0); // Only include statuses with data
  }, [reportAnalytics]);

  const certificateAnalytics = useMemo(() => {
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate
      ? new Date(endDate).setHours(23, 59, 59, 999)
      : Date.now();

    // Filter requests by date range, municipality, and selected barangay
    const filteredRequests = certificationRequests.filter((req) => {
      const reqDate = new Date(req.created_at).getTime();
      const matchesMunicipality =
        selectedMunicipality === "All" ||
        req.municipality === selectedMunicipality;
      const matchesBarangay =
        selectedBarangay === "All" || req.barangay === selectedBarangay;
      return (
        reqDate >= start &&
        reqDate <= end &&
        matchesMunicipality &&
        matchesBarangay
      );
    });

    const statusCounts = filteredRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});

    const typeCounts = filteredRequests.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalInRange: filteredRequests.length,
      approved: statusCounts["Approved"] || 0,
      declined: statusCounts["Declined"] || 0,
      typeChartData: Object.entries(typeCounts).map(([name, count]) => ({
        name,
        count,
      })),
    };
  }, [
    certificationRequests,
    startDate,
    endDate,
    selectedMunicipality,
    selectedBarangay,
  ]);

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      alert("No data to export.");
      return;
    }

    const replacer = (key, value) => (value === null ? "" : value);
    const header = Object.keys(data[0]);
    let csv = data.map((row) =>
      header
        .map((fieldName) => JSON.stringify(row[fieldName], replacer))
        .join(",")
    );
    csv.unshift(header.join(","));
    csv = csv.join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportUsers = () => {
    const userData = users.map(({ password, ...rest }) => rest); // Exclude passwords
    exportToCSV(userData, "user_list");
  };

  const handleExportReports = () => {
    const reportData = reports.map((r) => ({
      id: r.id,
      date: new Date(r.date).toISOString(),
      status: r.status,
      type: r.type,
      description: r.description,
    }));
    exportToCSV(reportData, "report_summary");
  };

  return (
    <div className="analytics-dashboard-container">
      <div className="dashboard-header">
        <h1>Advanced Analytics & Reporting</h1>
        <div className="date-range-filter">
          <div className="preset-buttons">
            <button onClick={() => handleSetPresetRange(7)}>Last 7 Days</button>
            <button onClick={() => handleSetPresetRange(30)}>
              Last 30 Days
            </button>
          </div>
          <FaCalendarAlt />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="analytics-tabs" style={{ justifyContent: "center" }}>
        <button
          onClick={() => setActiveTab("users")}
          className={activeTab === "users" ? "active" : ""}
        >
          <FaUsers /> User Analytics
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={activeTab === "reports" ? "active" : ""}
        >
          <FaFileAlt /> Reports Analytics
        </button>
        <button
          onClick={() => setActiveTab("certs")}
          className={activeTab === "certs" ? "active" : ""}
        >
          <FaCertificate /> Certificate Analytics
        </button>
      </div>

      <div className="analytics-tab-content">
        {activeTab === "users" && (
          <>
            <div className="analytics-filters" style={{ gap: "1rem" }}>
              <div className="filter-group">
                <select
                  value={selectedMunicipality}
                  onChange={(e) => {
                    setSelectedMunicipality(e.target.value);
                    setSelectedBarangay("All"); // Reset barangay when municipality changes
                  }}
                >
                  <option value="All">All Municipalities</option>
                  {municipalities.map((mun) => (
                    <option key={mun.id} value={mun.name}>
                      {mun.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  disabled={selectedMunicipality === "All"}
                >
                  <option value="All">All Barangays</option>
                  {barangays.map((brgy) => (
                    <option key={brgy.id} value={brgy.name}>
                      {brgy.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="stats-grid">
              <StatCard
                icon={<FaUsers />}
                label="Total Users"
                value={userAnalytics.totalUsers}
                detail="All time"
                color="#3b82f6"
              />
              <StatCard
                icon={<FaUserPlus />}
                label="New Users"
                value={userAnalytics.newUsersInRange}
                detail="in selected range"
                color="#10b981"
              />
              <StatCard
                icon={<FaUserClock />}
                label="Active Users"
                value={userAnalytics.activeUsersInRange}
                detail="in selected range"
                color="#f97316"
              />
              {selectedMunicipality !== "All" && (
                <StatCard
                  icon={<FaMapMarkerAlt />}
                  label={`Total Users in ${selectedMunicipality}`}
                  value={userAnalytics.usersInSelectedMunicipality}
                  color="#a855f7"
                />
              )}
              {selectedBarangay !== "All" && (
                <StatCard
                  icon={<FaMapMarkerAlt />}
                  label={`Total in ${selectedBarangay}`}
                  value={userAnalytics.usersInSelectedBarangay}
                  color="#8b5cf6"
                />
              )}
            </div>
            <div className="charts-grid">
              <div className="chart-section">
                <h4>User Registration Trends</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={userAnalytics.registrationTrend}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--admin-border)"
                    />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--admin-card-bg)",
                        border: "1px solid var(--admin-border)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ fontWeight: "bold" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Registrations"
                      stroke="#1877f2"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-section">
                <h4>User Role Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userAnalytics.roleDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {userAnalytics.roleDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={ROLE_COLORS[entry.name]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--admin-card-bg)",
                        border: "1px solid var(--admin-border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === "reports" && (
          <>
            <div className="analytics-filters" style={{ gap: "1rem" }}>
              <div className="filter-group">
                <select
                  value={selectedMunicipality}
                  onChange={(e) => {
                    setSelectedMunicipality(e.target.value);
                    setSelectedBarangay("All");
                  }}
                >
                  <option value="All">All Municipalities</option>
                  {municipalities.map((mun) => (
                    <option key={mun.id} value={mun.name}>
                      {mun.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  disabled={selectedMunicipality === "All"}
                >
                  <option value="All">All Barangays</option>
                  {barangays.map((brgy) => (
                    <option key={brgy.id} value={brgy.name}>
                      {brgy.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="stats-grid">
              <StatCard
                icon={<FaFileAlt />}
                label="Total Reports"
                value={reportAnalytics.totalInRange}
                detail="in selected range"
                color="#3b82f6"
              />
              <StatCard
                icon={<FaCheckCircle />}
                label="Resolved"
                value={reportAnalytics.statusCounts["done"] || 0}
                color="#22c55e"
              />
              <StatCard
                icon={<FaTimesCircle />}
                label="Declined"
                value={reportAnalytics.statusCounts["Declined"] || 0}
                color="#ef4444"
              />
              <StatCard
                icon={<FaTools />}
                label="In Progress"
                value={reportAnalytics.statusCounts["in-progress"] || 0}
                color="#8b5cf6"
              />
              <StatCard
                icon={<FaClipboardCheck />}
                label="Approved"
                value={reportAnalytics.statusCounts["approved"] || 0}
                color="#3b82f6"
              />
            </div>
            <div className="charts-grid">
              <div className="chart-section">
                <h4>Reports by Category</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={reportAnalytics.categoryChartData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--admin-border)"
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--admin-card-bg)",
                        border: "1px solid var(--admin-border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" name="Count" barSize={30}>
                      {reportAnalytics.categoryChartData.map((entry, index) => {
                        const colors = [
                          "#8884d8",
                          "#82ca9d",
                          "#ffc658",
                          "#ff8042",
                          "#0088FE",
                          "#00C49F",
                        ];
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colors[index % colors.length]}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-section">
                <h4>Report Status Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportStatusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {reportStatusChartData.map((entry, index) => {
                        const colors = {
                          Done: "#22c55e",
                          Declined: "#ef4444",
                          Submitted: "#f97316",
                          Reviewed: "#eab308",
                          "In-progress": "#8b5cf6",
                          Approved: "#16a34a",
                          Canceled: "#6b7280",
                        };
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colors[entry.name] || "#8884d8"}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--admin-card-bg)",
                        border: "1px solid var(--admin-border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === "certs" && (
          <>
            <div className="analytics-filters" style={{ gap: "1rem" }}>
              <div className="filter-group">
                <select
                  value={selectedMunicipality}
                  onChange={(e) => {
                    setSelectedMunicipality(e.target.value);
                    setSelectedBarangay("All");
                  }}
                >
                  <option value="All">All Municipalities</option>
                  {municipalities.map((mun) => (
                    <option key={mun.id} value={mun.name}>
                      {mun.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  disabled={selectedMunicipality === "All"}
                >
                  <option value="All">All Barangays</option>
                  {barangays.map((brgy) => (
                    <option key={brgy.id} value={brgy.name}>
                      {brgy.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="stats-grid">
              <StatCard
                icon={<FaCertificate />}
                label="Total Requests"
                value={certificateAnalytics.totalInRange}
                detail="in selected range"
                color="#3b82f6"
              />
              <StatCard
                icon={<FaCheckCircle />}
                label="Approved"
                value={certificateAnalytics.approved}
                color="#22c55e"
              />
              <StatCard
                icon={<FaTimesCircle />}
                label="Declined"
                value={certificateAnalytics.declined}
                color="#ef4444"
              />
            </div>
            <div className="chart-section">
              <h4>Requests by Certificate Type</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={certificateAnalytics.typeChartData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--admin-border)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--admin-card-bg)",
                      border: "1px solid var(--admin-border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Requests"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;
