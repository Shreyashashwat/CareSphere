from langchain_core.tools import tool
from agent.utils.api_client import api_get, api_post
from datetime import datetime, timezone


def make_appointment_tools(token: str):

    @tool
    def get_available_doctors(dummy_input: str = "") -> str:
        """
        Get the list of all available doctors the user can book an appointment with.
        Always call this FIRST before book_appointment so you know which doctors exist
        and can show their names and IDs to help the user pick one.
        No input needed — pass an empty string.
        """
        try:
            result = api_get("/api/v1/doctors", token)
            doctors = result.get("data", [])

            if not doctors:
                return "No doctors are currently available in the system."

            lines = []
            for d in doctors:
                lines.append(
                    f"- Dr. {d.get('username')} | "
                    f"Email: {d.get('email')} | "
                    f"Doctor ID: {d.get('_id')}"
                )
            return "Available doctors:\n" + "\n".join(lines)

        except Exception as e:
            return f"Error fetching doctors: {str(e)}"

    @tool
    def get_all_appointments(dummy_input: str = "") -> str:
        """
        Get all of the user's appointments — past and upcoming.
        Call this when the user asks to see all their appointments
        or their appointment history.
        No input needed — pass an empty string.
        """
        try:
            result = api_get("/api/v1/doctor-request/getappointments", token)
            appointments = result.get("data", [])

            if not appointments:
                return "You have no appointments on record."

            lines = []
            for a in appointments:
                doctor = a.get("doctorId", {})
                doc_name = doctor.get("username", "Unknown doctor") if isinstance(doctor, dict) else "Unknown doctor"
                lines.append(
                    f"- {a.get('appointmentDate', 'Unknown date')} | "
                    f"Dr. {doc_name} | "
                    f"Reason: {a.get('problem', 'Not specified')} | "
                    f"Status: {a.get('status', 'Unknown')}"
                )
            return "Your appointments:\n" + "\n".join(lines)

        except Exception as e:
            return f"Error fetching appointments: {str(e)}"

    @tool
    def get_upcoming_appointment(dummy_input: str = "") -> str:
        """
        Get the user's next upcoming appointment.
        Call this when the user asks when their next appointment is
        or whether they have any upcoming appointments.
        No input needed — pass an empty string.
        """
        try:
            result = api_get("/api/v1/doctor-request/getappointments", token)
            appointments = result.get("data", [])

            now = datetime.now(timezone.utc)
            upcoming = [
                a for a in appointments
                if a.get("appointmentDate") and
                datetime.fromisoformat(a["appointmentDate"].replace("Z", "+00:00")) > now
            ]

            if not upcoming:
                return "You have no upcoming appointments scheduled."

            apt = upcoming[0]
            doctor = apt.get("doctorId", {})
            doc_name = doctor.get("username", "your doctor") if isinstance(doctor, dict) else "your doctor"

            return (
                f"Your next appointment:\n"
                f"  📅 Date: {apt.get('appointmentDate')}\n"
                f"  👨‍⚕️ Doctor: Dr. {doc_name}\n"
                f"  📋 Reason: {apt.get('problem', 'Not specified')}\n"
                f"  Status: {apt.get('status')}"
            )

        except Exception as e:
            return f"Error fetching upcoming appointment: {str(e)}"

    @tool
    def book_appointment(doctorId: str, appointmentDate: str, problem: str) -> str:
        """
        Book an appointment with a doctor on behalf of the user.
        Always call get_available_doctors first to get the correct doctorId.
        Args:
            doctorId: the doctor's MongoDB ID from get_available_doctors
            appointmentDate: ISO datetime string e.g. "2026-03-20T10:00:00"
            problem: reason for visit e.g. "chest pain", "routine checkup"
        Only call this when the user has confirmed the details.
        """
        if not doctorId or not appointmentDate or not problem:
            return "Missing required fields: doctorId, appointmentDate, and problem are all required."

        try:
            result = api_post(
                "/api/v1/doctor-request/createAppointment",
                token,
                {
                    "doctorId":        doctorId,
                    "appointmentDate": appointmentDate,
                    "problem":         problem,
                }
            )
            appt = result.get("data", {})
            return (
                f"✅ Appointment booked successfully!\n"
                f"  📅 Date: {appt.get('appointmentDate', appointmentDate)}\n"
                f"  📋 Reason: {appt.get('problem', problem)}\n"
                f"  Status: PENDING — waiting for doctor confirmation."
            )
        except Exception as e:
            return f"Error booking appointment: {str(e)}"

    return [get_available_doctors, get_all_appointments, get_upcoming_appointment, book_appointment]
