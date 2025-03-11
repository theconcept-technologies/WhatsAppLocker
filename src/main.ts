import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, Notification } from "electron";
import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import os from "os";
import { loadSettings, saveSettings } from "./settings";

// Load environment variables
dotenv.config();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "defaultAdminPass";
const PASSWORD_FILE = path.join(app.getPath("userData"), "password.txt");

let mainWindow: BrowserWindow | null;
let settingsWindow: BrowserWindow | null;
let passwordWindow: BrowserWindow | null;
let tray: Tray | null = null;
let lastActivityTime = Date.now();
let settings = loadSettings(); // ✅ Load settings
let whatsappUnlocked = false; // Track if WhatsApp was unlocked

app.setLoginItemSettings({
	openAtLogin: app.isPackaged,
	openAsHidden: app.isPackaged,  // Runs minimized to the system tray
	path: app.getPath("exe") // Uses the installed .exe location
});

// Start Electron App
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	app.quit(); // If another instance is already running, quit this one
} else {
	app.on("second-instance", () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
			mainWindow.show();
		}
	});

	app.whenReady().then(() => {
		mainWindow = new BrowserWindow({
			width: 700,
			height: 600,
			icon: path.join(app.getAppPath(), "assets/icon.png"),
			webPreferences: {
				nodeIntegration: true, // ✅ Disable unnecessary features
				contextIsolation: false, // ✅ Increase security & reduce memory //TODO CHECK
				backgroundThrottling: true, // ✅ Reduce CPU when inactive
				devTools: false, // ✅ Disable DevTools in production
			}
		});

		if (!isUserPasswordSet()) {
			mainWindow.loadFile(path.join(__dirname, "../views/set-password.html"));
		} else {
			mainWindow.loadFile(path.join(__dirname, "../views/index.html"));
		}

		createTray(); // Create taskbar icon

		// ✅ Hide window when minimized
		// @ts-ignore
		mainWindow.on("minimize", (event: Electron.Event) => {
			event.preventDefault();
			if (mainWindow) {
				mainWindow.webContents.setBackgroundThrottling(true);
				mainWindow.hide();
			}
		});

		mainWindow.on("restore", () => {
			if (mainWindow) mainWindow.webContents.setBackgroundThrottling(false);
		});

		// ✅ Hide window when closed (keep app running in tray)
		mainWindow.on("close", (event: Electron.Event) => {
			event.preventDefault();
			mainWindow?.hide();
		});

		// Start monitoring WhatsApp usage
		monitorWhatsApp();

		// Monitor inactivity & require password if inactive
		setInterval(checkInactivity, 10000); // Check every 10 seconds

		// Handle window events (minimized, hidden, restored)
		// mainWindow.on("minimize", lockApp);
		// mainWindow.on("hide", lockApp);
		mainWindow.on("show", () => {
			lastActivityTime = Date.now(); // Reset inactivity timer
		});

		// mainWindow.webContents.on("before-input-event", () => {
		// 	lastActivityTime = Date.now(); // Reset inactivity timer on user interaction
		// });

		mainWindow.webContents.on("did-finish-load", () => {
			mainWindow?.webContents.executeJavaScript(`
        document.addEventListener("keydown", () => {
            window.electronAPI.resetActivity();
        });

        document.addEventListener("mousedown", () => {
            window.electronAPI.resetActivity();
        });

        document.addEventListener("touchstart", () => {
            window.electronAPI.resetActivity();
        });
    `);
		});

		mainWindow.setMenuBarVisibility(false);
		mainWindow.setAutoHideMenuBar(true);

		Menu.setApplicationMenu(null);
	});
}

app.on("browser-window-blur", () => {
	if (mainWindow) mainWindow.webContents.clearHistory();
});

// ✅ Fix: Close WhatsApp when WhatsAppLocker exits
app.on("window-all-closed", () => {
	if (whatsappUnlocked) {
		console.log("WhatsAppLocker closed - Closing WhatsApp...");
		closeWhatsApp();
	}
	app.quit();
});

// ✅ Fix: Close WhatsApp when quitting from the tray
app.on("before-quit", () => {
	if (whatsappUnlocked) {
		console.log("Exiting WhatsAppLocker - Closing WhatsApp...");
		closeWhatsApp();
	}
});

// Create a system tray (taskbar) icon
function createTray() {
	tray = new Tray(path.join(app.getAppPath(), "assets/icon.png"));
	const contextMenu = Menu.buildFromTemplate([
		{ label: "Open WhatsApp Locker", click: () => mainWindow?.show() },
		{ label: "Settings", click: () => openSettings() },
		{ label: "Lock", click: () => lockApp() },
		{ type: "separator" },
		{ label: "Exit", click: () => quitApp() }
		// { label: "Exit", click: () => openPasswordPrompt() }
	]);

	tray.setToolTip("WhatsApp Locker");
	tray.setContextMenu(contextMenu);

	tray.on("click", () => {
		if (mainWindow?.isVisible()) {
			mainWindow.hide();
		} else {
			mainWindow?.show();
		}
	});
}

function openPasswordPrompt() {
	if (passwordWindow) return; // Prevent multiple windows

	passwordWindow = new BrowserWindow({
		width: 500,
		height: 400,
		modal: true,
		parent: mainWindow || undefined,
		resizable: false,
		alwaysOnTop: true,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false, // ✅ Increase security & reduce memory //TODO CHECK
			backgroundThrottling: true, // ✅ Reduce CPU when inactive
			devTools: false, // ✅ Disable DevTools in production
		}
	});

	passwordWindow.loadFile("../views/password-prompt.html");
	passwordWindow.on("closed", () => {
		passwordWindow = null;
	});
}

ipcMain.on("submit-password", (event, password) => {
	const savedPassword = readUserPassword();

	if (password === savedPassword) {
		event.reply("password-success");
		passwordWindow?.close();
		quitApp();
	} else {
		event.reply("password-failed");
	}
});

// ✅ Force Quit the App Completely
function quitApp() {
	closeWhatsApp();
	if (process.platform === "win32") {
		tray?.destroy();
	}
	BrowserWindow.getAllWindows().forEach((win) => win.destroy());
	app.quit();
}

// function getLogFilePath(): string {
// 	const logDir = path.join(os.homedir(), "whatsapp-locker-logs");
// 	if (!fs.existsSync(logDir)) {
// 		fs.mkdirSync(logDir); // Create log directory if it doesn't exist
// 	}
//
// 	const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
// 	return path.join(logDir, `whatsapp-locker-${today}.log`);
// }
//
// // ✅ Function to write logs to the daily log file
// function logMessage(message: string) {
// 	const timestamp = new Date().toISOString();
// 	const logFile = getLogFilePath();
// 	fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`, { encoding: "utf8" });
// }

// ✅ Fix: Add `openSettings()` function
function openSettings() {
	if (settingsWindow) {
		settingsWindow.focus();
		return;
	}

	settingsWindow = new BrowserWindow({
		width: 800,
		height: 600,
		icon: path.join(app.getAppPath(), "assets/icon.png"),
		webPreferences: {
			nodeIntegration: true,
			// contextIsolation: false
			// nodeIntegration: false, // ✅ Disable unnecessary features
			contextIsolation: false, // ✅ Increase security & reduce memory
			backgroundThrottling: true, // ✅ Reduce CPU when inactive
			devTools: false, // ✅ Disable DevTools in production
		}
	});

	settingsWindow.loadFile(path.join(__dirname, "../views/settings.html"));

	settingsWindow.on("closed", () => {
		settingsWindow = null;
	});
}

// Check if user password is set
function isUserPasswordSet(): boolean {
	return fs.existsSync(PASSWORD_FILE) && fs.readFileSync(PASSWORD_FILE, "utf8").trim().length > 0;
}

// Check if the user is inactive and lock WhatsApp after 5 minutes
function checkInactivity() {
	if (whatsappUnlocked) {
		const timeSinceLastActivity = Date.now() - lastActivityTime;

		// Show warning notification 30 seconds before closing
		if (timeSinceLastActivity >= settings.inactivityTimeout - settings.notificationWarningTime && timeSinceLastActivity < settings.inactivityTimeout && settings.showNotifications) {
			showNotification("WhatsApp will be locked in 30 seconds due to inactivity.");
		}

		// Close WhatsApp after full inactivity time
		if (timeSinceLastActivity > settings.inactivityTimeout) {
			closeWhatsApp();
			whatsappUnlocked = false;
			lockApp();
		}
	}
}

// Show a system notification
function showNotification(message: string) {
	new Notification({ title: "WhatsApp Locker", body: message }).show();
}

// Lock the app and show login screen again
function lockApp() {
	if (mainWindow) {
		mainWindow.loadFile(path.join(__dirname, "../views/index.html"));
	}
	closeWhatsApp();
	whatsappUnlocked = false;
}

// Secure password check before opening WhatsApp
ipcMain.on("unlock-whatsapp", (event, password) => {
	const savedPassword = readUserPassword();
	if (password === savedPassword) {
		event.reply("unlock-success");
		openWhatsApp();
		whatsappUnlocked = true;
		lastActivityTime = Date.now();
	} else {
		event.reply("unlock-failed");
	}
});

ipcMain.on("get-settings", (event) => {
	event.reply("settings-loaded", settings);
});

ipcMain.on("update-settings", (event, newSettings) => {
	settings = { ...settings, ...newSettings }; // ✅ Merge changes
	saveSettings(settings); // ✅ Save to file
	event.reply("settings-updated", settings);
});


ipcMain.on("logout", (event) => {
	lockApp();
	closeWhatsApp();
	whatsappUnlocked = false;
	event.reply("logout-success");
});

ipcMain.on("set-password", (event, password) => {
	if (password.length > 0) {
		saveUserPassword(password);
		event.reply("password-set-success");
		mainWindow?.loadFile(path.join(__dirname, "../views/index.html"));
	} else {
		event.reply("password-set-failed");
	}
});

// Open Settings Window
ipcMain.on("open-settings", () => {
	if (settingsWindow) {
		settingsWindow.focus();
		return;
	}

	settingsWindow = new BrowserWindow({
		width: 900,
		height: 800,
		icon: path.join(app.getAppPath(), "assets/icon.png"),
		webPreferences: {
			nodeIntegration: true, // ✅ Disable unnecessary features
			contextIsolation: false, // ✅ Increase security & reduce memory
			backgroundThrottling: true, // ✅ Reduce CPU when inactive
			devTools: false, // ✅ Disable DevTools in production
		}
	});

	settingsWindow.loadFile(path.join(__dirname, "../views/settings.html"));

	settingsWindow.on("closed", () => {
		settingsWindow = null;
	});
});

// Handle Password Change (Only if Admin Password is Correct)
ipcMain.on("change-password", (event, adminPass, newPassword) => {
	if (adminPass === ADMIN_PASSWORD) {
		saveUserPassword(newPassword);
		event.reply("password-change-success");
	} else {
		event.reply("password-change-failed");
	}
});

function findWhatsAppPath(): string | null {
	if (os.platform() === "win32") {
		try {
			// ✅ 1. Dynamically find the correct UWP package for WhatsApp
			const uwpAppId = execSync(
					`powershell -Command "& {Get-AppxPackage *WhatsApp* | Select-Object -ExpandProperty PackageFamilyName}"`,
					{ encoding: "utf8" }
			).trim();

			if (uwpAppId) {
				return uwpAppId;
			}
		} catch (error) {
			console.log("Could not find WhatsApp UWP dynamically.");
		}

		// ✅ 2. Check Standard WhatsApp Installations (Standalone .exe)
		const possiblePaths = [
			"C:\\Program Files\\WindowsApps\\WhatsApp.exe",
			"C:\\Program Files\\WhatsApp\\WhatsApp.exe",
			"C:\\Program Files (x86)\\WhatsApp\\WhatsApp.exe"
		];
		for (const p of possiblePaths) {
			if (fs.existsSync(p)) {
				return p;
			}
		}

		// ✅ 3. Check Windows Registry for WhatsApp Installation Path
		try {
			const registryPath = execSync(
					'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\WhatsApp" /v InstallLocation'
			)
			.toString()
			.split("\r\n")
			.find((line) => line.includes("InstallLocation"));

			if (registryPath) {
				const installPath = registryPath.split("REG_SZ")[1]?.trim();
				if (installPath) {
					return path.join(installPath, "WhatsApp.exe");
				}
			}
		} catch (error) {
			console.log("Could not retrieve WhatsApp path from registry.");
		}
	} else if (os.platform() === "darwin") {
		// ✅ macOS: Check common paths
		const macPaths = [
			"/Applications/WhatsApp.app/Contents/MacOS/WhatsApp",
			path.join(os.homedir(), "Applications", "WhatsApp.app", "Contents", "MacOS", "WhatsApp")
		];
		for (const p of macPaths) {
			if (fs.existsSync(p)) {
				return p;
			}
		}
	}

	return null;
}


// Open WhatsApp securely
function openWhatsApp() {
	try {
		const whatsappPath = findWhatsAppPath();

		if (!whatsappPath) {
			dialog.showErrorBox("Error", "WhatsApp could not be found on this device.");
			return;
		}

		if (os.platform() === "win32") {
			if (whatsappPath.includes("WhatsAppDesktop")) {
				// ✅ Run the exact PowerShell command that works manually
				const command = `powershell -Command "Start-Process explorer.exe -ArgumentList 'shell:AppsFolder\\${whatsappPath}!App'"`;

				exec(command, (error) => {
					if (error) {
						dialog.showErrorBox("Error", `Failed to open WhatsApp UWP: ${error.message}`);
					}
				});
			} else {
				exec(`"${whatsappPath}"`, (error) => {
					if (error) {
						dialog.showErrorBox("Error", "Failed to open WhatsApp.");
					}
				});
			}
		} else if (os.platform() === "darwin") {
			exec(`open -a "${whatsappPath}"`);
		}
	} catch (error: any) {
		dialog.showErrorBox("Error", "Error opening WhatsApp Path ("+ findWhatsAppPath() + "): Error: " + error.toString());
	}
}

// Monitor WhatsApp usage
function monitorWhatsApp() {
	console.log("🚀 Monitoring WhatsApp process...");
	setInterval(() => {
		const isRunning = isWhatsAppRunning();
		if (isRunning && !whatsappUnlocked) {
			console.log("Unauthorized WhatsApp usage detected! Closing app...");
			closeWhatsApp();
			mainWindow?.focus();
			mainWindow?.show();
		}
	}, 2000); // Check every 2 seconds

	// const processWatcher = exec(
	// 		`powershell -Command "& {while ($true) {if (Get-Process | Where-Object { $_.ProcessName -eq 'WhatsApp' }) {Stop-Process -Name 'WhatsApp' -Force; Start-Sleep -Seconds 1}}}"`
	// );
	//
	// processWatcher.stdout?.on("data", (data) => {
	// 	logMessage("📢 WhatsApp process detected and closed:" + data.trim());
	// });
	//
	// processWatcher.stderr?.on("data", (err) => {
	// 	console.error("❌ Error monitoring WhatsApp process:", err);
	// });
	//
	// processWatcher.on("close", (code) => {
	// 	console.log("⏹️ Process monitoring stopped with code:", code);
	// });
}

// Check if WhatsApp is running
function isWhatsAppRunning(): boolean {
	try {
		if (os.platform() === "win32") {
			const taskList = execSync("tasklist").toString();
			return taskList.includes("WhatsApp.exe");
		} else if (os.platform() === "darwin") {
			const processList = execSync("ps aux").toString();
			return processList.includes("WhatsApp");
		}
	} catch (error) {
		console.error("Error checking WhatsApp status:", error);
	}
	return false;
}

// Close WhatsApp if it is running
function closeWhatsApp() {
	try {
		if (os.platform() === "win32") {
			exec("taskkill /F /IM WhatsApp.exe");
		} else if (os.platform() === "darwin") {
			exec("osascript -e 'quit app \"WhatsApp\"'");
		}
	} catch (error) {
		console.error("Error closing WhatsApp:", error);
	}
}

// Function to save the user password securely
function saveUserPassword(password: string) {
	fs.writeFileSync(PASSWORD_FILE, password, { encoding: "utf8" });
}

// Function to read the saved user password
function readUserPassword(): string {
	if (fs.existsSync(PASSWORD_FILE)) {
		return fs.readFileSync(PASSWORD_FILE, "utf8").trim();
	}
	return "defaultUserPass";
}