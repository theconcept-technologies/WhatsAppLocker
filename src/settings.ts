import fs from "fs";
import path from "path";
import { app } from "electron";

// ✅ Define default settings
const defaultSettings = {
	showNotifications: true, // ✅ Default: Notifications enabled
	inactivityTimeout: 5 * 60 * 1000, // ✅ Default: 5 minutes (300,000ms)
	notificationWarningTime: 10 * 1000, // 10 seconds before closing
};

const settingsPath = path.join(app.getPath("userData"), "settings.json");

export function loadSettings(): typeof defaultSettings {
	try {
		if (fs.existsSync(settingsPath)) {
			const settingsData = fs.readFileSync(settingsPath, "utf8");
			return JSON.parse(settingsData);
		}
	} catch (error) {
		console.error("⚠️ Error loading settings:", error);
	}
	return defaultSettings;
}

export function saveSettings(settings: typeof defaultSettings) {
	try {
		fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
	} catch (error) {
		console.error("⚠️ Error saving settings:", error);
	}
}