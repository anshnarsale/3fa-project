import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function OtpPage() {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem('userId');

  const [qrCode, setQrCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    const setupTotp = async () => {
      try {
        const response = await api.post('/auth/totp/setup', { userId });
        setQrCode(response.data.qrCode);
        setManualKey(response.data.manualEntryKey);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load your authenticator setup.');
      } finally {
        setLoading(false);
      }
    };

    setupTotp();
  }, [navigate, userId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/auth/totp/verify', { userId, token });
      navigate('/webauthn');
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Step 2 of 3</p>
          <h1 className="mt-3 text-3xl font-bold">Verify your authenticator</h1>
        </div>

        {loading ? (
          <div className="py-6 text-center text-slate-300">Loading your one-time password setup...</div>
        ) : (
          <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                {qrCode ? (
                  <img src={qrCode} alt="Authenticator QR code" className="mx-auto h-52 w-52 rounded-xl bg-white p-2" />
                ) : (
                  <div className="text-center text-slate-400">QR code unavailable</div>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-300">Manual setup key</p>
                <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-cyan-300 break-all">
                  {manualKey || 'Not available'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="otp" className="mb-2 block text-sm font-medium text-slate-300">
                  Enter 6-digit code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  value={token}
                  onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-center text-2xl tracking-[0.5em] text-slate-100 outline-none transition focus:border-cyan-400"
                  placeholder="123456"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || token.length !== 6}
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Verifying...' : 'Verify code'}
              </button>

              <div className="text-center text-sm text-slate-400">
                <Link to="/" className="font-medium text-cyan-400 hover:text-cyan-300">
                  Back to login
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default OtpPage;