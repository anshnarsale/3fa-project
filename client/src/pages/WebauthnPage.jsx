import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import api from '../api/axios';

function WebauthnPage() {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem('userId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      navigate('/');
    }
  }, [navigate, userId]);

  const handleRegisterPasskey = async () => {
    if (!userId) {
      navigate('/');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let authenticationResponse;

      try {
        const authenticationOptionsResponse = await api.post('/auth/webauthn/auth/options', { userId });
        authenticationResponse = await startAuthentication({
          optionsJSON: authenticationOptionsResponse.data
        });
      } catch (authError) {
        const isNoPasskey = authError.response?.status === 400 && authError.response?.data?.error === 'No passkey registered for this user';

        if (!isNoPasskey) {
          throw authError;
        }

        const registrationOptionsResponse = await api.post('/auth/webauthn/register/options', { userId });
        const registrationResponse = await startRegistration({
          optionsJSON: registrationOptionsResponse.data
        });

        await api.post('/auth/webauthn/register/verify', {
          userId,
          response: registrationResponse
        });

        const authOptionsAfterRegister = await api.post('/auth/webauthn/auth/options', { userId });
        authenticationResponse = await startAuthentication({
          optionsJSON: authOptionsAfterRegister.data
        });
      }

      const finalResponse = await api.post('/auth/webauthn/auth/verify', {
        userId,
        response: authenticationResponse
      });

      if (finalResponse.data?.authenticated) {
        sessionStorage.setItem('isAuthenticated', 'true');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'WebAuthn setup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Step 3 of 3</p>
          <h1 className="mt-3 text-3xl font-bold">Secure your account</h1>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <div>
            <h2 className="text-xl font-semibold">Register a passkey</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Use a device authenticator or browser passkey to complete the final factor and finish sign-in.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleRegisterPasskey}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Registering passkey...' : 'Continue with passkey'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WebauthnPage;