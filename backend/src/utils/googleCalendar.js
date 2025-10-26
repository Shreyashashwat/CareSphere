import { google } from "googleapis";

export async function addMedicineToGoogleCalendar(calendarData, medicine, doseTime) {
  console.log("Using tokens:", calendarData.accessToken, calendarData.refreshToken, calendarData.expiryDate);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: calendarData.accessToken,
    refresh_token: calendarData.refreshToken,
    expiry_date: calendarData.expiryDate?.getTime(),
  });

  const calendar = google.calendar({ version: "v3", auth });

  const start = new Date(doseTime);
  const end = new Date(start.getTime() + 15 * 60 * 1000); // 15 min event

  const event = {
    summary: `${medicine.medicineName} 💊`,
    description: `Take ${medicine.dosage}`,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] },
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return response.data.id; // Google Calendar eventId
}
