# ⚡ Servify - Trusted Local Experts

**Servify** is a modern, responsive, and secure web application designed to connect customers with local service professionals (like Electricians, Plumbers, and Carpenters) effortlessly. Built with a robust full-stack architecture, it provides an intuitive platform for both service providers to grow their business and customers to find reliable help.

## Key Features
- 🔐 **Secure Authentication System:** Role-based login and registration for both 'Customers' and 'Partners'.
- ☁️ **Cloud Database Integration:** Fully powered by **MongoDB Atlas** and `mongoose` for robust data storage, high performance, and safe data handling.
- 🖼️ **Smart Image Uploads:** Partners can upload profile and banner photos directly from their devices. The app uses advanced HTML5 Canvas to instantly compress and convert images to Base64 before saving them, saving cloud storage space and ensuring blazing-fast load times.
- 📊 **Dedicated Dashboards:** 
  - **Client Dashboard:** A clean, filtered interface for customers to browse categories, view provider profiles, and book services instantly.
  - **Partner Dashboard:** A comprehensive onboarding and management panel for professionals to set up their profiles, manage custom pricing, and accept/complete job requests.
- 💬 **Interactive UI/UX:** Features a beautiful modern design, dynamic rating systems, category filtering, and real-time booking status updates.

## Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS with dynamic state management)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Atlas Cloud)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ay9616790-source/Service_provider.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your MongoDB Connection String:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ServifyDB
   PORT=5000
   ```

4. **Run the Backend Server:**
   ```bash
   npm start
   ```

5. **Run the Frontend:**
   Use a Live Server extension in VS Code, or simply open `index.html` in your browser.

---
*Built to help local societies manage service professionals securely and efficiently.*
