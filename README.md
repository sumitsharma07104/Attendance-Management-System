# Smart Attendance

A modern, full-stack web application for managing student attendance in educational institutions.

## Features
- **Admin Dashboard**: Manage students, subjects, and view overall attendance statistics.
- **Student Dashboard**: View personal attendance records and calculated percentages.
- **Attendance Marking**: Easy-to-use interface for marking daily attendance.
- **Reporting**: Generate and filter attendance reports by subject and date.
- **Secure Auth**: JWT-based authentication system.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: SQLite (SQL-compatible, easy to run).

## Setup Instructions (VS Code)

1. **Clone/Download** the project.
2. **Open Terminal** in the project root.
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Run the Application**:
   ```bash
   npm run dev
   ```
5. **Access the App**: Open `http://localhost:3000` in your browser.

## Default Credentials
- **Admin**: 
  - Username: `admin`
  - Password: `admin123`
- **Student**: (Create one via Admin Dashboard)

## Project Structure
- `server.ts`: Main Express server and API logic.
- `src/`: React frontend source code.
- `attendance.db`: SQLite database file (generated on first run).
- `database.sql`: SQL schema for reference.
