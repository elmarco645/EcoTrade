import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AtSign, Loader2, Eye, EyeOff, Check, X, Phone, Calendar, MapPin, Plus, Trash2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import LocationSelector from '../components/LocationSelector';

interface Address {
  isDefault: boolean;
  county: string;
  subcounty: string;
  ward: string;
  street: string;
}

export default function Register({ setUser }: { setUser: (user: any) => void }) {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([
    { isDefault: true, county: '', subcounty: '', ward: '', street: '' }
  ]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showLoginInstead, setShowLoginInstead] = useState(false);
  const navigate = useNavigate();

  const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (siteKey && !captchaToken) {
      setError('Please complete the CAPTCHA');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setShowLoginInstead(false);

    // Validate DOB
    const dobRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!dobRegex.test(dob)) {
      setError('Invalid Date of Birth format (DD/MM/YYYY)');
      setLoading(false);
      return;
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD for database
    const [d, m, y] = dob.split('/');
    const formattedDob = `${y}-${m}-${d}`;

    // Validate default address
    const defaultAddr = addresses.find(a => a.isDefault);
    if (!defaultAddr || !defaultAddr.county || !defaultAddr.subcounty || !defaultAddr.ward || !defaultAddr.street) {
      setError('Please provide a complete default address');
      setLoading(false);
      return;
    }

    const locationString = `${defaultAddr.county}, ${defaultAddr.subcounty}`;

    // Format phone
    const formatPhone = (p: string) => {
      if (p.startsWith('07')) return '+254' + p.slice(1);
      if (p.startsWith('01')) return '+254' + p.slice(1);
      if (p.startsWith('7')) return '+254' + p;
      if (p.startsWith('1')) return '+254' + p;
      return p;
    };

    const formattedPhone = formatPhone(phone);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      // 2. Save user profile to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase().trim(),
        dob: formattedDob,
        phone: formattedPhone,
        whatsapp: formattedPhone,
        addresses,
        location: locationString,
        role: 'buyer',
        wallet_balance: 1000, // Initial balance
        rating: 0,
        is_seller_verified: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // 3. Send verification email
      let emailSent = false;
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}/verify-email`,
          handleCodeInApp: true,
        };
        await sendEmailVerification(firebaseUser, actionCodeSettings);
        emailSent = true;
      } catch (emailErr: any) {
        console.error('Email verification error:', emailErr);
        // Don't block registration, but inform the user
      }

      // 3. IMPORTANT: Sign out immediately as requested
      await auth.signOut();

      // 4. Redirect to verification screen
      if (emailSent) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        setError('Account created, but we couldn\'t send the verification email. Please try logging in to resend it.');
      }
      
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Registration method is not enabled. Please contact support or check Firebase Console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
        setShowLoginInstead(true);
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthColor = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength];
  const strengthText = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl font-bold">
            E
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Create Account</h2>
          <p className="mt-2 text-slate-500">Join EcoTrade and start trading sustainably</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
              <p>{error}</p>
              {showLoginInstead && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/login?email=${encodeURIComponent(email)}`)}
                    className="w-full rounded-lg bg-red-100 py-2 text-center text-xs font-bold text-red-700 transition-all hover:bg-red-200"
                  >
                    Login Instead
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/auth/forgot-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setSuccess('Password reset email sent! Please check your inbox.');
                          setError('');
                          setShowLoginInstead(false);
                        } else {
                          setError(data.error);
                        }
                      } catch (err) {
                        setError('Failed to send reset email.');
                      }
                    }}
                    className="w-full rounded-lg bg-white border border-red-200 py-2 text-center text-xs font-bold text-red-600 transition-all hover:bg-red-50"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-600">
              {success}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="DOB (DD/MM/YYYY)"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (WhatsApp)"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-700 ml-1">Addresses</h3>
              {addresses.map((addr, index) => (
                <div key={index} className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 ml-1">
                      {addr.isDefault ? 'Default Address' : `Address ${index + 1}`}
                    </span>
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => setAddresses(addresses.filter((_, i) => i !== index))}
                        className="rounded-full p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <LocationSelector
                    initialLocation={addr}
                    onChange={(loc) => {
                      const newAddrs = [...addresses];
                      newAddrs[index] = { ...newAddrs[index], ...loc };
                      setAddresses(newAddrs);
                    }}
                  />

                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={addr.street}
                      onChange={(e) => {
                        const newAddrs = [...addresses];
                        newAddrs[index].street = e.target.value;
                        setAddresses(newAddrs);
                      }}
                      placeholder="Street Address"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setAddresses([...addresses, { isDefault: false, county: '', subcounty: '', ward: '', street: '' }])}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Add Another Address
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            {password && (
              <div className="space-y-2 px-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Password Strength: {strengthText}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${strengthColor}`}
                    style={{ width: `${(strength / 4) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className={`flex items-center gap-1.5 text-[10px] ${password.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {password.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${/[A-Z]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {/[A-Z]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Uppercase
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${/[0-9]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {/[0-9]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Number
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {/[^A-Za-z0-9]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Special char
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className={`h-14 w-full rounded-2xl border bg-slate-50 pl-12 pr-4 outline-none transition-all focus:bg-white focus:ring-4 ${
                  confirmPassword && password !== confirmPassword 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-50' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'
                }`}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs font-medium text-red-500 ml-2">Passwords do not match</p>
            )}

            {siteKey ? (
              <div className="flex justify-center py-2">
                <ReCAPTCHA
                  sitekey={siteKey}
                  onChange={(token) => setCaptchaToken(token)}
                />
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-600 border border-amber-100">
                reCAPTCHA is not configured. Please add VITE_RECAPTCHA_SITE_KEY to your environment variables.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
