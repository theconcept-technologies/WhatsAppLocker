# TCT WhatsApp Locker 🔒

🚀 Secure WhatsApp with password protection! This Electron-based application locks WhatsApp Desktop behind an authentication system, ensuring that only authorized users can access it.

## 📌 Features
✅ Password-protected access to WhatsApp Desktop  
✅ Auto-lock on inactivity (configurable timeout)  
✅ Secure quit option requiring authentication  
✅ System tray support for easy background running  
✅ Works on **Windows** & **macOS**  
✅ Modern UI with Tailwind CSS

---

## 🔧 Installation

### 📥 Clone the Repository
```sh
git clone https://github.com/theconcept-technologies/TCT-WhatsApp-Locker.git
cd TCT-WhatsApp-Locker
```

### 📦 Install Dependencies
```sh
npm install
```

### 🛠️ Run the App in Development Mode
```sh
npm start
```

---

## 🏗️ Build for Production
To create the **macOS `.app`** or **Windows `.exe`**, use:

```sh
npm run build
```

### **Build for macOS**
```sh
./build-macos.sh
```

### **Build for Windows**
```sh
./build-windows.sh
```

---

## ⚙️ Configuration
- **Admin Password:** Stored in an environment variable (`.env`)
- **Settings:** Inactivity timeout and notifications can be changed in the UI

---

## 🛠️ Troubleshooting

### **❌ WhatsApp Not Opening?**
🔹 Ensure WhatsApp is installed via the Microsoft Store or `.exe` version.  
🔹 Manually test with PowerShell:
```powershell
explorer.exe shell:AppsFolder\5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App
```

### **❌ Build Issues?**
🔹 Ensure you have installed dependencies correctly:
```sh
npm install
```
🔹 If using macOS, install dependencies:
```sh
brew install imagemagick
```

---

## 📝 License
This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 💼 About theconcept technologies
TCT WhatsApp Locker is developed by [theconcept technologies](https://theconcept-technologies.com).  
📧 **Contact:** office@theconcept-technologies.com  
🌍 **Website:** [theconcept-technologies.com](https://theconcept-technologies.com)  
---