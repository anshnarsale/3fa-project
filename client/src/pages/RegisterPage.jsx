import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    security_question: '',
    security_answer: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/register', form);
      setSuccess('Account created successfully. Redirecting to login...');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Create account</p>
          <h1 className="mt-3 text-3xl font-bold">Register</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label htmlFor="security_question" className="mb-2 block text-sm font-medium text-slate-300">
              Security question
            </label>
            <input
              id="security_question"
              name="security_question"
              type="text"
              value={form.security_question}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="Example: What is your mother's maiden name?"
            />
          </div>

          <div>
            <label htmlFor="security_answer" className="mb-2 block text-sm font-medium text-slate-300">
              Security answer
            </label>
            <input
              id="security_answer"
              name="security_answer"
              type="text"
              value={form.security_answer}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="Your answer"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/" className="font-medium text-cyan-400 hover:text-cyan-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;