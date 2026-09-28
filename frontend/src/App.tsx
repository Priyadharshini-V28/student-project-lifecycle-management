import React, { useState, useEffect } from 'react';
import { apiClient } from './services/api';
import { ApiResponse, HealthCheckData } from './types';
import { 
  Server, 
  Database, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  GraduationCap, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  BookOpen 
} from 'lucide-react';

export const App: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<HealthCheckData>>('/health');
      if (res.data.success && res.data.data) {
        setHealthData(res.data.data);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to connect to backend server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                SPLM Platform
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Student Project Lifecycle Management
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
              Stage 1: Foundation
            </span>
            <button
              onClick={checkHealth}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              <span>Verify API</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-500/20 rounded-full border border-sky-400/30 text-sky-200 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              <span>3rd Year B.Tech AI & Data Science Capstone</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Student Project Lifecycle Management Platform
            </h2>
            <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
              A full-stack, enterprise-grade academic platform coordinating student project formulation, faculty review iterations, milestone gates, rubric scoring, and defense-ready governance.
            </p>
          </div>
        </div>

        {/* Live Service Status Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-sky-600" />
              <span>System Health & Connectivity</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Live REST API Ping: /api/health
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Backend Service Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Express API Backend
                </span>
                <Server className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                {isLoading ? (
                  <div className="flex items-center space-x-2 text-slate-400 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pinging server...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center space-x-1.5 text-rose-600 font-semibold text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Offline: {error}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-emerald-600 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Online & Healthy</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Uptime: {healthData?.uptimeSeconds}s | v{healthData?.version}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* PostgreSQL Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  PostgreSQL Relational DB
                </span>
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Configured (Stage 2)</span>
                </div>
                <p className="text-xs text-slate-500">
                  17 Normalized Tables DDL Ready
                </p>
              </div>
            </div>

            {/* Redis Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Redis In-Memory Cache
                </span>
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Session & Cache Store</span>
                </div>
                <p className="text-xs text-slate-500">
                  Authoritative Token & TTL Cache
                </p>
              </div>
            </div>

            {/* Security Guard Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Security Headers
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Helmet & CORS Active</span>
                </div>
                <p className="text-xs text-slate-500">
                  Strict Zod Env Validation
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stage 1 Completed Architecture Overview */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">
              Stage 1 Deliverables & Technical Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
                Backend Architecture (Node.js + Express + TypeScript)
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Modular directory structure: config, controllers, routes, services, middleware, db</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Fail-fast environment variable validation with <code>zod</code> in <code>src/config/env.ts</code></span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Centralized error handling middleware with <code>ApiError</code> operational classes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Graceful server termination handling <code>SIGTERM</code> and <code>SIGINT</code></span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
                Frontend Architecture (React 18 + Vite + TypeScript)
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Vite development bundler with reverse proxy configured for <code>/api</code></span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Tailwind CSS design system with custom slate/primary color schemes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Configured Axios HTTP client with request/response error interceptors</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Strict TypeScript typings for API responses and system models</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          Student Project Lifecycle Management Platform • Stage 1 Foundation Complete • Ready for Stage 2 (PostgreSQL Schema)
        </div>
      </footer>
    </div>
  );
};

export default App;
