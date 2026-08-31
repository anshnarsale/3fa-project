import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setUser(response.data);
      } catch (err) {
        sessionStorage.removeItem('userId');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/dashboard/logout');
    } finally {
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('isAuthenticated');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Loading your secure dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Dashboard</p>
            <h1 className="mt-3 text-3xl font-bold">Welcome</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Log out
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-2 text-lg font-semibold text-cyan-300">{user?.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-sm text-slate-400">Last login</p>
            <p className="mt-2 text-lg font-semibold text-cyan-300">
              {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Not available'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-sm text-slate-400">Account created</p>
            <p className="mt-2 text-lg font-semibold text-cyan-300">
              {user?.accountCreated ? new Date(user.accountCreated).toLocaleString() : 'Not available'}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Security status</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-emerald-200">
            {Object.entries(user?.factorsVerified || {}).map(([name, enabled]) => (
              <span
                key={name}
                className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1"
              >
                {name}: {enabled ? 'Verified' : 'Pending'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;