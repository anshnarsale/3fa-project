import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function SecurityQuestionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = sessionStorage.getItem('userId');
  const question = location.state?.securityQuestion || 'What is your favourite childhood book?';

  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId) {
      navigate('/');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/security-question/verify', { userId, answer });
      navigate('/otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Security question verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Step 2 of 4</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Security check</h1>
          <p className="mt-2 text-sm text-slate-400">Answer your custom recovery question to continue.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Your question</label>
              <div className="rounded-2xl border border-cyan-500/30 bg-slate-800 px-4 py-4 text-base text-slate-100 shadow-inner shadow-slate-950/30">
                {question}
              </div>
            </div>

            <div>
              <label htmlFor="answer" className="mb-2 block text-sm font-medium text-slate-300">
                Your answer
              </label>
              <input
                id="answer"
                type="text"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                placeholder="Type your answer"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !answer.trim()}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>

          <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Why this matters</p>
              <p className="mt-2 text-sm leading-6 text-emerald-100">
                This extra recovery check helps protect your account even if someone knows your password.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Secure flow</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>• Password</li>
                <li>• Security question</li>
                <li>• One-time code</li>
                <li>• Passkey</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <Link to="/" className="font-medium text-cyan-400 hover:text-cyan-300">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SecurityQuestionPage;
