// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// import MedicineList from "../components/MedicineList";
// import MedicineForm from "../components/MedicineForm";
// import HistoryTable from "../components/HistoryTable";
// import CalendarView from "../components/CalendarView";
// import DashboardChart from "../components/DashboardChart";

// import {
//   getMedicines,
//   fetchHistory,
//   getReminders,
//   getAllDoctors,
//   sendDoctorRequest,
//   getPatientRequests,
// } from "../api";

// const Patient = () => {
//   const navigate = useNavigate();

//   // -------------------- STATES --------------------
//   const [medicines, setMedicines] = useState([]);
//   const [history, setHistory] = useState([]);
//   const [reminders, setReminders] = useState([]);
//   const [selectedMedicine, setSelectedMedicine] = useState(null);
//   const [nextReminder, setNextReminder] = useState(null);
//   const [refreshTrigger, setRefreshTrigger] = useState(0);

//   const [doctors, setDoctors] = useState([]);
//   const [patientRequests, setPatientRequests] = useState([]);
//   const [loadingDoctors, setLoadingDoctors] = useState(false);
//   const [activeTab, setActiveTab] = useState("home");
//   const [weeklyInsights, setWeeklyInsights] = useState([]);

//   const user = JSON.parse(localStorage.getItem("user"));
//   const username = user?.username || "User";

//   // -------------------- FETCHERS --------------------
//   const fetchWeeklyInsights = async () => {
//     try {
//       const res = await fetch(`http://localhost:3000/api/weekly-insights/${user._id}`);
//       const data = await res.json();
//       setWeeklyInsights(data?.insights || []);
//     } catch (err) {
//       console.error("Failed to fetch weekly insights", err);
//     }
//   };

//   const fetchMedicines = async () => {
//     try {
//       const res = await getMedicines();
//       setMedicines(Array.isArray(res.data.data) ? res.data.data : []);
//     } catch (err) {
//       console.error("Failed to fetch medicines:", err);
//     }
//   };

//   const fetchHistoryData = async () => {
//     try {
//       const res = await fetchHistory();
//       const sorted = (res.data.data || []).sort((a, b) => new Date(a.time) - new Date(b.time));
//       setHistory(sorted);
//     } catch (err) {
//       console.error("Failed to fetch history:", err);
//     }
//   };

//   const fetchReminders = async () => {
//     try {
//       const res = await getReminders();
//       const data = Array.isArray(res.data.data) ? res.data.data : [];
//       data.sort((a, b) => new Date(a.time) - new Date(b.time));
//       data.forEach((r) => r.status && (r.status = r.status.toLowerCase()));
//       setReminders(data);
//     } catch (err) {
//       console.error("Failed to fetch reminders:", err);
//     }
//   };

//   const fetchDoctors = async () => {
//     setLoadingDoctors(true);
//     try {
//       const res = await getAllDoctors();
//       setDoctors(Array.isArray(res.data.data) ? res.data.data : []);
//     } catch (err) {
//       console.error("Failed to fetch doctors:", err);
//     } finally {
//       setLoadingDoctors(false);
//     }
//   };

//   const fetchPatientRequests = async () => {
//     try {
//       const res = await getPatientRequests();
//       setPatientRequests(Array.isArray(res.data.data) ? res.data.data : []);
//     } catch (err) {
//       console.error("Failed to fetch patient requests:", err);
//     }
//   };

//   // -------------------- EFFECTS --------------------
//   useEffect(() => {
//     fetchMedicines();
//     fetchHistoryData();
//     fetchReminders();
//     fetchDoctors();
//     fetchPatientRequests();
//   }, []);

//   useEffect(() => {
//     if (activeTab === "insights") fetchWeeklyInsights();
//   }, [activeTab]);

//   useEffect(() => {
//     const now = new Date();
//     const upcoming = reminders
//       .filter((r) => r.medicineId)
//       .find((r) => new Date(r.time) >= now && r.status === "pending");
//     setNextReminder(upcoming || null);
//   }, [reminders]);

//   // -------------------- HANDLERS --------------------
//   const handleMedicineUpdate = async () => {
//     await Promise.all([fetchMedicines(), fetchHistoryData(), fetchReminders()]);
//     setSelectedMedicine(null);
//     setRefreshTrigger((prev) => prev + 1);
//   };

//   const handleSendRequest = async (doctorId) => {
//     try {
//       await sendDoctorRequest(doctorId);
//       await fetchPatientRequests();
//       alert("Request sent successfully!");
//     } catch (err) {
//       alert(err.response?.data?.message || "Failed to send request");
//     }
//   };

//   const getRequestStatus = (doctorId) => {
//     const req = patientRequests.find((r) => (r.doctorId?._id || r.doctorId) === doctorId);
//     return req?.status || null;
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("user");
//     navigate("/");
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-indigo-100">
//       {/* HEADER */}
//       <header className="sticky top-0 z-50 bg-white/70 backdrop-blur shadow">
//         <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
//           <h1 className="text-3xl font-extrabold text-indigo-700">
//             Care<span className="text-blue-500">Sphere</span>
//           </h1>
//           <div className="flex gap-4 items-center">
//             <button
//               onClick={() => setActiveTab("home")}
//               className={`px-4 py-2 rounded-full text-m font-medium transition ${
//                 activeTab === "home" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-indigo-100"
//               }`}
//             >
//               Home
//             </button>
//             <button
//               onClick={() => setActiveTab("insights")}
//               className={`px-4 py-2 rounded-full text-m font-medium transition ${
//                 activeTab === "insights" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-indigo-100"
//               }`}
//             >
//               Health Insights
//             </button>
//           </div>
//           <button
//             onClick={handleLogout}
//             className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-medium shadow transition-all duration-300 hover:scale-105"
//           >
//             Logout
//           </button>
//         </div>
//       </header>

//       {/* WELCOME SECTION */}
//       <section className="max-w-7xl mx-auto px-6 py-8 bg-indigo-600 text-white rounded-3xl mt-6">
//         <h2 className="text-3xl font-bold">Welcome back, {username} 👋</h2>
//         <p className="mt-2">
//           Next Reminder:{" "}
//           {nextReminder
//             ? `${new Date(nextReminder.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — ${nextReminder.medicineId?.medicineName}`
//             : "No upcoming reminders"}
//         </p>
//       </section>

//       {activeTab === "home" ? (
//         <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
//           {/* DOCTOR REQUESTS */}
//           <section>
//             <h2 className="text-2xl font-semibold mb-4 text-indigo-800">🩺 Connect with Doctors</h2>
//             {loadingDoctors ? (
//               <p>Loading doctors...</p>
//             ) : (
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 {doctors.map((doc) => {
//                   const status = getRequestStatus(doc._id);
//                   return (
//                     <div key={doc._id} className="bg-white p-4 rounded-xl shadow border border-gray-100">
//                       <h3 className="font-semibold text-lg">{doc.username}</h3>
//                       <p className="text-sm text-gray-600 mb-4">{doc.email}</p>
//                       <button
//                         disabled={status === "PENDING" || status === "ACCEPTED"}
//                         onClick={() => handleSendRequest(doc._id)}
//                         className={`w-full py-2 rounded-lg font-medium transition ${
//                           status === "ACCEPTED" ? "bg-green-100 text-green-700" : 
//                           status === "PENDING" ? "bg-yellow-100 text-yellow-700" : 
//                           "bg-indigo-600 text-white hover:bg-indigo-700"
//                         }`}
//                       >
//                         {status === "ACCEPTED" ? "✓ Accepted" : status === "PENDING" ? "⏳ Pending" : "Send Request"}
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </section>

//           {/* MEDICINE SECTION */}
//           <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
//             <div className="bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-50 p-8 rounded-3xl shadow-xl border border-gray-200">
//               <h2 className="text-2xl font-semibold text-indigo-700 mb-6 flex items-center gap-2">
//                 ➕ Add / Edit Medicine
//               </h2>
//               <MedicineForm onSuccess={handleMedicineUpdate} medicine={selectedMedicine} />
//             </div>
//             <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-50">
//               <MedicineList
//                 medicines={medicines}
//                 reminders={reminders}
//                 onUpdate={handleMedicineUpdate}
//                 onEdit={setSelectedMedicine}
//               />
//             </div>
//           </section>

//           {/* DASHBOARD CHARTS/HISTORY */}
//           <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//             <DashboardChart key={refreshTrigger} history={history} />
//             <CalendarView reminders={reminders} />
//             <HistoryTable history={history} />
//           </section>
//         </main>
//       ) : (
//         /* INSIGHTS TAB */
//         <section className="max-w-7xl mx-auto px-6 py-12">
//           <h2 className="text-3xl font-bold text-indigo-700 mb-8 flex items-center gap-2">
//             🧠 Weekly Health Insights
//           </h2>
//           {weeklyInsights.length === 0 ? (
//             <p className="text-gray-500">No insights available yet. Please check back after weekly analysis.</p>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {weeklyInsights.map((insight, idx) => (
//                 <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition">
//                   <div className="flex justify-between items-center mb-3">
//                     <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">{insight.category}</span>
//                     <span className={`text-xs font-semibold ${
//                       insight.priority === "high" ? "text-red-600" : insight.priority === "medium" ? "text-yellow-600" : "text-green-600"
//                     }`}>
//                       {insight.priority.toUpperCase()}
//                     </span>
//                   </div>
//                   <p className="text-gray-800 text-sm leading-relaxed">{insight.text}</p>
//                 </div>
//               ))}
//             </div>
//           )}
//         </section>
//       )}

//       {/* FOOTER */}
//       <footer className="text-center mt-12 py-6 text-sm text-gray-500 border-t border-gray-200">
//         © {new Date().getFullYear()} <span className="font-semibold text-indigo-600">CareSphere</span> — Built for Better Health 🩺
//       </footer>
//     </div>
//   );
// };

// export default Patient;

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
  createAppointment,
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

  // Appointment States
  const [showAptModal, setShowAptModal] = useState(false);
  const [aptDoctor, setAptDoctor] = useState(null);
  const [aptForm, setAptForm] = useState({ date: "", time: "", problem: "" });

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

  const handleAptSubmit = async (e) => {
    e.preventDefault();
    try {
      const appointmentDate = new Date(`${aptForm.date}T${aptForm.time}`);
      await createAppointment({
        doctorId: aptDoctor._id,
        appointmentDate,
        problem: aptForm.problem,
      });
      alert("Appointment requested successfully!");
      setShowAptModal(false);
      setAptForm({ date: "", time: "", problem: "" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to schedule appointment");
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

  // Calculate stats for quick view
  const adherenceRate = history.length > 0 
    ? Math.round((history.filter(h => h.status === 'taken').length / history.length) * 100)
    : 0;
  const todayReminders = reminders.filter(r => {
    const rDate = new Date(r.time);
    const today = new Date();
    return rDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ENHANCED HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-indigo-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">
              CareSphere
            </h1>
          </div>
          
          <div className="flex gap-2 items-center bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === "home" 
                  ? "bg-white text-indigo-700 shadow-md" 
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              🏠 Home
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === "insights" 
                  ? "bg-white text-indigo-700 shadow-md" 
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              🧠 Insights
            </button>
          </div>
          
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all duration-300 hover:scale-105"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ENHANCED WELCOME BANNER */}
      <section className="max-w-7xl mx-auto px-6 py-6 mt-6">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white rounded-3xl shadow-2xl shadow-indigo-200/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-20 -translate-x-20"></div>
          
          <div className="relative p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">👋</span>
                  <h2 className="text-3xl md:text-4xl font-black">Welcome back, {username}!</h2>
                </div>
                <p className="text-indigo-100 text-lg">Let's keep you healthy today</p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20">
                  <div className="text-sm text-indigo-100 mb-1">Adherence Rate</div>
                  <div className="text-3xl font-black">{adherenceRate}%</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20">
                  <div className="text-sm text-indigo-100 mb-1">Today's Reminders</div>
                  <div className="text-3xl font-black">{todayReminders}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <div className="text-xs text-indigo-100 uppercase tracking-wider font-bold">Next Reminder</div>
                  <div className="text-lg font-semibold">
                    {nextReminder
                      ? `${new Date(nextReminder.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} — ${nextReminder.medicineId?.medicineName}`
                      : "No upcoming reminders"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeTab === "home" ? (
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* DOCTOR NETWORK - ENHANCED */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                  <span className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                    🩺
                  </span>
                  Healthcare Network
                </h2>
                <p className="text-gray-500 text-sm mt-1 ml-13">Connect with professionals and schedule appointments</p>
              </div>
            </div>
            
            {loadingDoctors ? (
              <div className="flex justify-center p-20">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-100 border-t-indigo-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doc) => {
                  const status = getRequestStatus(doc._id);
                  return (
                    <div 
                      key={doc._id} 
                      className="group bg-white p-6 rounded-3xl shadow-md hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="flex items-start gap-4 mb-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                          👨‍⚕️
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-gray-800 mb-1">{doc.username}</h3>
                          <p className="text-sm text-gray-500">{doc.email}</p>
                        </div>
                      </div>
                      
                      {status === "ACCEPTED" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold mb-3">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Connected
                          </div>
                          <button
                            onClick={() => { setAptDoctor(doc); setShowAptModal(true); }}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
                          >
                            <span className="text-lg">📅</span>
                            Book Appointment
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={status === "PENDING"}
                          onClick={() => handleSendRequest(doc._id)}
                          className={`w-full py-3.5 rounded-2xl font-bold transition-all duration-300 ${
                            status === "PENDING" 
                              ? "bg-yellow-50 text-yellow-700 border-2 border-yellow-200 cursor-not-allowed" 
                              : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02]"
                          }`}
                        >
                          {status === "PENDING" ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                              Connection Pending
                            </span>
                          ) : (
                            "Connect with Doctor"
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* MEDICINE MANAGEMENT - ENHANCED */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                  ➕
                </div>
                <h2 className="text-2xl font-black text-gray-800">
                  {selectedMedicine ? "Edit Medication" : "Add New Medication"}
                </h2>
              </div>
              <MedicineForm onSuccess={handleMedicineUpdate} medicine={selectedMedicine} />
            </div>
            
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                  💊
                </div>
                <h2 className="text-2xl font-black text-gray-800">Current Medications</h2>
              </div>
              <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <MedicineList
                  medicines={medicines}
                  reminders={reminders}
                  onUpdate={handleMedicineUpdate}
                  onEdit={setSelectedMedicine}
                />
              </div>
            </div>
          </section>

          {/* ANALYTICS DASHBOARD - ENHANCED */}
          <section className="space-y-6">
            {/* Google Calendar - Full Row */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                  📅
                </div>
                <h3 className="font-black text-gray-800">Medication Calendar</h3>
              </div>
              <CalendarView reminders={reminders} />
            </div>
            
            {/* Chart and History - Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                    📊
                  </div>
                  <h3 className="font-black text-gray-800">Adherence Progress</h3>
                </div>
                <DashboardChart key={refreshTrigger} history={history} />
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center text-xl shadow-lg">
                    📋
                  </div>
                  <h3 className="font-black text-gray-800">Recent Activity</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <HistoryTable history={history} />
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : (
        /* HEALTH INSIGHTS - ENHANCED */
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              🧠
            </div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">
              AI Health Insights
            </h2>
          </div>
          
          {weeklyInsights.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-20 text-center shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl">
                🤖
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Analyzing Your Health Data</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Our AI is processing your medication history. Check back in a few days for personalized weekly insights.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weeklyInsights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="group bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-black uppercase tracking-wider border border-indigo-100">
                      {insight.category}
                    </span>
                    <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                      insight.priority === "high" 
                        ? "bg-red-50 text-red-600 border border-red-100" 
                        : insight.priority === "medium" 
                        ? "bg-yellow-50 text-yellow-600 border border-yellow-100" 
                        : "bg-green-50 text-green-600 border border-green-100"
                    }`}>
                      {insight.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium">{insight.text}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>💡</span>
                      <span>AI-Generated Insight</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* APPOINTMENT MODAL - ENHANCED */}
      {showAptModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl animate-in zoom-in duration-300 border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center text-2xl">
                    📅
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800">New Appointment</h2>
                    <p className="text-sm text-gray-500">
                      with <span className="text-indigo-600 font-bold">Dr. {aptDoctor?.username}</span>
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowAptModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAptSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-2 ml-1">Date</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full bg-gray-50 border-2 border-gray-200 p-3 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none text-sm font-semibold transition-all" 
                    onChange={(e) => setAptForm({...aptForm, date: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 mb-2 ml-1">Time</label>
                  <input 
                    type="time" 
                    required 
                    className="w-full bg-gray-50 border-2 border-gray-200 p-3 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none text-sm font-semibold transition-all" 
                    onChange={(e) => setAptForm({...aptForm, time: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-2 ml-1">Reason for Visit</label>
                <textarea 
                  required 
                  placeholder="Describe your symptoms or concerns..."
                  className="w-full bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none resize-none text-sm font-medium transition-all" 
                  rows="4"
                  onChange={(e) => setAptForm({...aptForm, problem: e.target.value})} 
                ></textarea>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAptModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02]"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENHANCED FOOTER */}
      <footer className="max-w-7xl mx-auto mt-16 px-6 py-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-black text-gray-700">CareSphere Digital Health</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-indigo-600 transition-colors font-medium">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors font-medium">Terms of Service</a>
            <a href="#" className="hover:text-indigo-600 transition-colors font-medium">Contact Support</a>
          </div>
          
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} All rights reserved
          </div>
        </div>
      </footer>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Patient;