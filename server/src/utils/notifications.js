const Notification = require("../models/Notification");
const DeviceToken = require("../models/DeviceToken");

async function sendExpoPushMessages(messages) {
  if (!messages.length) return;

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      console.error("Expo push request failed:", await response.text());
    }
  } catch (error) {
    console.error("Expo push error:", error.message);
  }
}

async function createNotification({ userId = null, role, type, title, body, data = {}, push = true }) {
  const notification = await Notification.create({
    recipientUser: userId,
    audienceRole: role,
    type,
    title,
    body,
    data
  });

  if (push) {
    const query = role === "admin" ? { role: "admin" } : { role: "member", user: userId };
    const devices = await DeviceToken.find(query).select("token").lean();
    await sendExpoPushMessages(
      devices.map((device) => ({
        to: device.token,
        title,
        body,
        data: { notificationId: notification._id.toString(), ...data },
        sound: "default",
        channelId: "important"
      }))
    );
  }

  return notification;
}

async function notifyAdmins({ type, title, body, data = {} }) {
  return createNotification({ role: "admin", type, title, body, data });
}

async function notifyMember({ userId, type, title, body, data = {} }) {
  return createNotification({ userId, role: "member", type, title, body, data });
}

async function notifyVerifiedMembers({ type, title, body, data = {}, excludeUserId = null }) {
  const User = require("../models/User");
  const users = await User.find({ role: "member", status: "verified" }).select("_id").lean();
  for (const user of users) {
    if (excludeUserId && user._id.toString() === excludeUserId.toString()) continue;
    await notifyMember({ userId: user._id, type, title, body, data });
  }
}

module.exports = { sendExpoPushMessages, createNotification, notifyAdmins, notifyMember, notifyVerifiedMembers };
