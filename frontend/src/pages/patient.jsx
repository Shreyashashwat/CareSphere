import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MedicineList from "../components/MedicineList";
import MedicineForm from "../components/MedicineForm";
import HistoryTable from "../components/HistoryTable";
import CalendarView from "../components/CalendarView";
import DashboardChart from "../components/DashboardChart";

import {
  getMedicines,
  fetchHistory,
  getReminders,
  getAllDoctors,
  sendDoctorRequest,
  getPatientRequests,
} from "../api";

const Patient = () => {
  const navigate = useNavigate();

  // -------------------- STATES --------------------
  const [medicines, setMedicines] = useState([]);
  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [nextReminder, setNextReminder] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [doctors, setDoctors] = useState([]);
  const [patientRequests, setPatientRequests] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [weeklyInsights, setWeeklyInsights] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username || "User";

  // -------------------- FETCHERS --------------------
  const fetchWeeklyInsights = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/weekly-insights/${user._id}`);
      const data = await res.json();
      setWeeklyInsights(data?.insights || []);
    } catch (err) {
      console.error("Failed to fetch weekly insights", err);
    }
  };

  const fetchMedicines = async () => {
    try {
      const res = await getMedicines();
      setMedicines(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to fetch medicines:", err);
    }
  };

  const fetchHistoryData = async () => {
    try {
      const res = await fetchHistory();
      const sorted = (res.data.data || []).sort((a, b) => new Date(a.time) - new Date(b.time));
      setHistory(sorted);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await getReminders();
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      data.sort((a, b) => new Date(a.time) - new Date(b.time));
      data.forEach((r) => r.status && (r.status = r.status.toLowerCase()));
      setReminders(data);
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    }
  };

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await getAllDoctors();
      setDoctors(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchPatientRequests = async () => {
    try {
      const res = await getPatientRequests();
      setPatientRequests(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to fetch patient requests:", err);
    }
  };

  // -------------------- EFFECTS --------------------
  useEffect(() => {
    fetchMedicines();
    fetchHistoryData();
    fetchReminders();
    fetchDoctors();
    fetchPatientRequests();
  }, []);

  useEffect(() => {
    if (activeTab === "insights") fetchWeeklyInsights();
  }, [activeTab]);

  useEffect(() => {
    const now = new Date();
    const upcoming = reminders
      .filter((r) => r.medicineId)
      .find((r) => new Date(r.time) >= now && r.status === "pending");
    setNextReminder(upcoming || null);
  }, [reminders]);

  // -------------------- HANDLERS --------------------
  const handleMedicineUpdate = async () => {
    await Promise.all([fetchMedicines(), fetchHistoryData(), fetchReminders()]);
    setSelectedMedicine(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSendRequest = async (doctorId) => {
    try {
      await sendDoctorRequest(doctorId);
      await fetchPatientRequests();
      alert("Request sent successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send request");
    }
  };

  const getRequestStatus = (doctorId) => {
    const req = patientRequests.find((r) => (r.doctorId?._id || r.doctorId) === doctorId);
    return req?.status || null;
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-indigo-100">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur shadow">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            Care<span className="text-blue-500">Sphere</span>
          </h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-4 py-2 rounded-full text-m font-medium transition ${
                activeTab === "home" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-indigo-100"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`px-4 py-2 rounded-full text-m font-medium transition ${
                activeTab === "insights" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-indigo-100"
              }`}
            >
              Health Insights
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-medium shadow transition-all duration-300 hover:scale-105"
          >
            Logout
          </button>
        </div>
      </header>

      {/* WELCOME SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-8 bg-indigo-600 text-white rounded-3xl mt-6">
        <h2 className="text-3xl font-bold">Welcome back, {username} 👋</h2>
        <p className="mt-2">
          Next Reminder:{" "}
          {nextReminder
            ? `${new Date(nextReminder.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — ${nextReminder.medicineId?.medicineName}`
            : "No upcoming reminders"}
        </p>
      </section>

      {activeTab === "home" ? (
        <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
          {/* DOCTOR REQUESTS */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-indigo-800">🩺 Connect with Doctors</h2>
            {loadingDoctors ? (
              <p>Loading doctors...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {doctors.map((doc) => {
                  const status = getRequestStatus(doc._id);
                  return (
                    <div key={doc._id} className="bg-white p-4 rounded-xl shadow border border-gray-100">
                      <h3 className="font-semibold text-lg">{doc.username}</h3>
                      <p className="text-sm text-gray-600 mb-4">{doc.email}</p>
                      <button
                        disabled={status === "PENDING" || status === "ACCEPTED"}
                        onClick={() => handleSendRequest(doc._id)}
                        className={`w-full py-2 rounded-lg font-medium transition ${
                          status === "ACCEPTED" ? "bg-green-100 text-green-700" : 
                          status === "PENDING" ? "bg-yellow-100 text-yellow-700" : 
                          "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {status === "ACCEPTED" ? "✓ Accepted" : status === "PENDING" ? "⏳ Pending" : "Send Request"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* MEDICINE SECTION */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-50 p-8 rounded-3xl shadow-xl border border-gray-200">
              <h2 className="text-2xl font-semibold text-indigo-700 mb-6 flex items-center gap-2">
                ➕ Add / Edit Medicine
              </h2>
              <MedicineForm onSuccess={handleMedicineUpdate} medicine={selectedMedicine} />
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-50">
              <MedicineList
                medicines={medicines}
                reminders={reminders}
                onUpdate={handleMedicineUpdate}
                onEdit={setSelectedMedicine}
              />
            </div>
          </section>

          {/* DASHBOARD CHARTS/HISTORY */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <DashboardChart key={refreshTrigger} history={history} />
            <CalendarView reminders={reminders} />
            <HistoryTable history={history} />
          </section>
        </main>
      ) : (
        /* INSIGHTS TAB */
        <section className="max-w-7xl mx-auto px-6 py-12">
          <h2 className="text-3xl font-bold text-indigo-700 mb-8 flex items-center gap-2">
            🧠 Weekly Health Insights
          </h2>
          {weeklyInsights.length === 0 ? (
            <p className="text-gray-500">No insights available yet. Please check back after weekly analysis.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weeklyInsights.map((insight, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">{insight.category}</span>
                    <span className={`text-xs font-semibold ${
                      insight.priority === "high" ? "text-red-600" : insight.priority === "medium" ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {insight.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* FOOTER */}
      <footer className="text-center mt-12 py-6 text-sm text-gray-500 border-t border-gray-200">
        © {new Date().getFullYear()} <span className="font-semibold text-indigo-600">CareSphere</span> — Built for Better Health 🩺
      </footer>
    </div>
  );
};

export default Patient;