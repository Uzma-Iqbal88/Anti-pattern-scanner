# 📡 SRE Code Anti-Pattern Scanner

## 1. Executive Summary & Project Overview
The **SRE Code Anti-Pattern Scanner** is a cutting-edge, interactive React web application engineered to simulate enterprise-grade Site Reliability Engineering (SRE) code quality and security scans. It actively analyzes source code (mock Python environments) to detect, highlight, and remediate critical anti-patterns that silently degrade system reliability, performance, and security.

Designed with a premium dark-mode aesthetic and real-time interactive diagnostics, this platform bridges the gap between static code analysis and actionable SRE education.

---

## 2. Core Value Proposition: Why SRE Matters
In modern distributed systems, minor code anomalies compound into massive outages. This scanner enforces proactive reliability by focusing on:
- **Resilience:** Preventing runtime failures (e.g., mutable default arguments).
- **Security:** Highlighting insecure practices (e.g., unspecified encodings).
- **Maintainability:** Enforcing strict, clean coding standards (e.g., avoiding wildcard imports).

---

## 3. Key Capabilities & Features

### 🔍 Interactive Code Inspection
- **Project File Explorer:** Seamlessly navigate across the repository ecosystem.
- **Inline Diagnostic Overlays:** Vulnerabilities are highlighted natively within the code viewer using VSCode-like warning bubbles that pinpoint the exact line, severity, and root cause.
- **Custom Syntax Highlighting:** A fast, proprietary regex-based tokenization engine ensuring smooth rendering without heavy third-party dependencies.

### 📚 Anti-Patterns Database
- A comprehensive catalog of critical anti-patterns.
- **Deep Educational Context:** Each issue outlines **Description**, **SRE Impact**, and a **Recommended Secure Fix**.
- **Refactoring Sandbox:** A dedicated side-by-side view showing the problematic code and the refactored, production-ready solution.

### 📊 Dynamic SRE Health Dashboard (Powered by Recharts)
Upon scan completion, the application reveals an animated, high-fidelity analytics dashboard:
1. **Issues Per File (Bar Chart):** A sleek gradient chart (`#8b5cf6` to `#6366f1`) mapping vulnerability distribution across the codebase.
2. **Severity Split (Donut Chart):** A percentage-based breakdown of Critical vs. Warning issues, featuring custom dark-mode tooltips and legends.
3. **Overall Health Score:** An aggregated grading algorithm that dynamically calculates a letter grade (A/B/C/D) and renders a glowing, animated progress bar.

---

## 4. Technical Architecture & Best Practices

This project demonstrates architectural excellence and scalability:

- **Clean Data-Driven Architecture:** The core data layer (`MOCK_FILES` and `ANTIPATTERNS`) is strictly decoupled from UI logic, making the platform highly extensible.
- **Componentized UI Framework:** Built using React functional components and hooks (`useState`, `useEffect`, `useRef`), ensuring predictable state management and lifecycle control.
- **Responsive Animations:** Utilizes native CSS keyframes (`animate-fade-slide`, `logo-spin`) and interactive DOM manipulations (`scrollIntoView`) for a fluid, premium user experience.

---

## 5. Technology Stack
- **Frontend Framework:** React 19
- **Build Tool:** Vite (for Lightning-fast HMR and optimized production bundling)
- **Data Visualization:** Recharts (SVG-based charting library)
- **Styling:** Vanilla CSS (Tailored dark-theme, glassmorphism UI, CSS variables)

---

## 6. Getting Started

To run this platform locally:

```bash
# 1. Clone the repository and navigate to the project directory
cd SRE_Project

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

---

*This README is structured to be seamlessly exported into presentation format, highlighting both the technical depth and the strategic business value of the SRE Scanner.*
