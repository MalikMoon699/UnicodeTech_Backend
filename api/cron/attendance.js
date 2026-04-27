import admin from "../../utils/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    const db = admin.firestore();

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    const day = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "long",
    });

    const isWeekend = day === "Saturday" || day === "Sunday";

    console.log("Running cron for:", today, "Day:", day);

    await db.collection("cron_logs").add({
      type: "attendance-cron",
      time: admin.firestore.FieldValue.serverTimestamp(),
      date: today,
    });

    const usersSnap = await db
      .collection("UserIndex")
      .where("role", "!=", "admin")
      .where("status", "==", "active")
      .get();

    const users = [];

    usersSnap.forEach((doc) => {
      const data = doc.data();

      users.push({
        userId: data.docId,
        role: data.role,
      });
    });

    const leaveSnap = await db
      .collection("leaveRequests")
      .where("leaveDateKeys", "array-contains", today)
      .get();

    const leaveMap = new Map();

    for (const docSnap of leaveSnap.docs) {
      const leave = docSnap.data();

      const isApproved =
        leave.isAutoApproved === true || leave.status === "approved";

      if (!isApproved) continue;

      for (const userId of leave.users || []) {
        leaveMap.set(userId, {
          reason: leave.reason || "",
          type: leave.type || "user",
        });
      }
    }

    for (const user of users) {
      const userId = user.userId;

      const ref = db.collection("Attendance").doc(`${userId}_${today}`);
      const existing = await ref.get();

      if (existing.exists) {
        console.log(`Skipping existing attendance for ${userId}`);
        continue;
      }

      const leave = leaveMap.get(userId);

      if (isWeekend) {
        await ref.set({
          userId,
          date: today,
          checkIn: null,
          checkOut: null,
          hours: null,
          late: false,
          lateReason: null,
          status: "weekend",
          type: "leave",
          leaveReason: "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Weekend marked for ${userId}`);
        continue;
      }

      if (leave) {
        if (leave.type === "boss") {
          await ref.set({
            userId,
            date: today,
            checkIn: null,
            checkOut: null,
            hours: null,
            late: false,
            lateReason: null,
            status: "byboss",
            type: "leave",
            leaveReason: leave.reason,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`Boss leave marked for ${userId}`);
        } else {
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
            leaveReason: leave.reason,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`User leave marked for ${userId}`);
        }

        continue;
      }

      await ref.set({
        userId,
        date: today,
        checkIn: null,
        checkOut: null,
        hours: null,
        late: false,
        lateReason: null,
        status: "absent",
        type: "absent",
        leaveReason: "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Absent marked for ${userId}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}
