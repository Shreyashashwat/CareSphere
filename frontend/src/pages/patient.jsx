import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MedicineList from "../components/MedicineList";
import MedicineForm from "../components/MedicineForm";
import HistoryTable from "../components/HistoryTable";
import CalendarView from "../components/CalendarView";
import DashboardChart from "../components/DashboardChart";
import CaregiverList from "../components/CaregiverList";

// Caregiver Features
import PatientsView from "../components/Caregiver/PatientsView";
import AlertsView from "../components/Caregiver/AlertsView";
import PatientDetailModal from "../components/Caregiver/PatientDetailModal";

import {
  getMedicines,
  fetchHistory,
  getReminders,
  getPendingInvites,
} from "../api";

const Patient = () => {
  const [activeTab, setActiveTab] = useState('my-health'); // 'my-health' or 'caregiving'
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [nextReminder, setNextReminder] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);

  const fetchMedicines = async () => {
    try {
      const res = await getMedicines();
      const medicinesArray = Array.isArray(res.data.data) ? res.data.data : [];
      setMedicines([...medicinesArray]);
    } catch (err) {
      console.error("Failed to fetch medicines:", err);
    }
  };

  const fetchHistoryData = async () => {
    try {
      const res = await fetchHistory();
      const historyData = res.data.data || [];
      const sortedHistory = historyData.sort(
        (a, b) => new Date(a.time) - new Date(b.time)
      );
      setHistory([...sortedHistory]);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await getReminders();
      const remindersArray = Array.isArray(res.data.data) ? res.data.data : [];

      remindersArray.sort((a, b) => new Date(a.time) - new Date(b.time));
      remindersArray.forEach(r => {
        if (r.status) r.status = r.status.toLowerCase();
      });

      setReminders([...remindersArray]);
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    }
  };

  const checkPendingInvites = async () => {
    try {
      const res = await getPendingInvites();
      const count = (res.data.data || []).length;
      setPendingInvites(count);
    } catch (err) {
      console.error("Failed to check invites:", err);
    }
  };

  useEffect(() => {
    const now = new Date();
    const upcoming = reminders
      .filter(r => r.medicineId)
      .find(r => new Date(r.time) >= now && r.status === "pending");

    setNextReminder(upcoming || null);
  }, [reminders]);

  useEffect(() => {
    fetchMedicines();
    fetchHistoryData();
    fetchReminders();
    checkPendingInvites();
  }, []);

  const handleMedicineUpdate = async () => {
    try {
      await Promise.all([fetchMedicines(), fetchHistoryData(), fetchReminders()]);
    } catch (err) {
      console.error("Failed to update medicines/reminders/history", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-indigo-100">
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-md shadow-sm border-b border-indigo-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-3xl font-extrabold text-indigo-700 tracking-wide">
            Care<span className="text-blue-500">Sphere</span> Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {/* Tab Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setActiveTab('my-health')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'my-health' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                My Health
              </button>
              <button
                onClick={() => setActiveTab('caregiving')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'caregiving' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Caregiver Hub
                {pendingInvites > 0 && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-medium transition duration-200 shadow"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Welcome Section */}
        <section className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-3xl p-8 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold mb-2">
              Welcome back,{" "}
              <span className="font-bold">
                {JSON.parse(localStorage.getItem("user"))?.username || "User"} 👋
              </span>
            </h2>
            <p className="text-white/90">
              {activeTab === 'my-health' ? "Here’s your personalized health and medicine summary." : "Manage your linked patients and their updates here."}
            </p>
          </div>
          {activeTab === 'my-health' && (
            <div className="mt-4 sm:mt-0 text-center">
              <p className="text-lg font-semibold">Next Reminder:</p>
              <p className="text-2xl font-bold">
                {nextReminder
                  ? `${new Date(nextReminder.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} — ${nextReminder.medicineId?.medicineName} 💊`
                  : "No upcoming reminders"}
              </p>
            </div>
          )}
        </section>

        {activeTab === 'my-health' ? (
          /* ================= MY HEALTH TAB ================= */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition duration-300 border border-gray-100">
                <h2 className="text-xl font-semibold text-indigo-600 mb-4 flex items-center gap-2">
                  ➕ Add / Edit Medicine
                </h2>
                <MedicineForm onSuccess={handleMedicineUpdate} medicine={selectedMedicine}
                />
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition duration-300 border border-gray-100">
                <h2 className="text-xl font-semibold text-indigo-600 mb-4 flex items-center gap-2">
                  💊 Medicine List
                </h2>
                <MedicineList
                  medicines={medicines}
                  reminders={reminders}
                  onUpdate={handleMedicineUpdate}
                  onEdit={setSelectedMedicine}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition duration-300 border border-gray-100">
                  <h2 className="text-xl font-semibold text-indigo-600 mb-4 flex items-center gap-2">
                    📊 Progress Overview
                  </h2>
                  <DashboardChart key={refreshTrigger} history={history} />
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition duration-300 border border-gray-100">
                  <h2 className="text-xl font-semibold text-indigo-600 mb-4 flex items-center gap-2">
                    📅 Calendar
                  </h2>
                  <CalendarView key={refreshTrigger} reminders={reminders} />
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition duration-300 border border-gray-100 flex-1">
                  <h2 className="text-xl font-semibold text-indigo-600 mb-4 flex items-center gap-2 text-center">
                    📘 Dose History
                  </h2>
                  <HistoryTable history={history} />
                </div>

                {/* Caregiver Hub Entry Card */}
                <div
                  onClick={() => setActiveTab('caregiving')}
                  className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-6 shadow-xl text-white cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg width="100" height="100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                  </div>

                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    🩺 Caregiver Hub
                    {pendingInvites > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">{pendingInvites} New</span>}
                  </h2>
                  <p className="text-blue-100 mb-4 text-sm">
                    Switch directly to manage the patients you care for.
                  </p>
                  <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors backdrop-blur-sm">
                    Open Hub &rarr;
                  </button>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition duration-300 border border-gray-100">
                  <CaregiverList />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ================= CAREGIVING TAB ================= */
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
              <AlertsView />
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="text-blue-600">My Patients</span>
              </h2>
              <PatientsView onPatientSelect={setSelectedPatient} />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      <footer className="text-center mt-12 py-6 text-sm text-gray-500 border-t border-gray-200">
        © {new Date().getFullYear()} CareSphere — Built for better health 🩺
      </footer>
    </div>
  );
};

export default Patient;
