import admin from "../../utils/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const db = admin.firestore();

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    console.log("Running cron for:", today);

    const leaveSnap = await db
      .collection("Leaves")
      .where("isAutoApproved", "==", true)
      .get();

    for (const doc of leaveSnap.docs) {
      const leave = doc.data();

      for (const d of leave.dates || []) {
        const leaveDate = new Date(d.date).toISOString().split("T")[0];

        if (leaveDate === today) {
          for (const userId of leave.users || []) {
            const ref = db.collection("Attendance").doc(`${userId}_${today}`);

            const existing = await ref.get();
            if (existing.exists) continue;

            await ref.set({
              userId,
              date: today,
              checkIn: null,
              checkOut: null,
              hours: null,
              late: false,
              lateReason: null,
              status: "leave",
              type: "leave",
              leaveReason: leave.reason || "",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`Leave marked for ${userId}`);
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}
