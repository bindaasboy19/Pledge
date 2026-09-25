import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Search, ArrowRight, Shield, Award } from 'lucide-react';
import { verifyCertificate } from '../services/verificationService';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export function CertificateVerifyPage({ initialCertificateId = '' }) {
  const [certInput, setCertInput] = useState(initialCertificateId);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const performVerification = async (idToVerify) => {
    const cleanId = (idToVerify || '').trim();
    if (!cleanId) return;

    setIsLoading(true);
    setResult(null);

    const res = await verifyCertificate(cleanId);
    setResult(res);
    setIsLoading(false);
  };

  useEffect(() => {
    if (initialCertificateId) {
      setCertInput(initialCertificateId);
      performVerification(initialCertificateId);
    }
  }, [initialCertificateId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (certInput.trim()) {
      // Update browser URL without reloading so the URL can be copied/shared
      const cleanId = certInput.trim();
      const newPath = `/certificate/verify/${encodeURIComponent(cleanId)}`;
      window.history.pushState({}, '', newPath);
      performVerification(cleanId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      <Header currentStage="INTRO" onReset={() => (window.location.href = '/')} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-28 pb-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-[#0B1F4D] uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
            Official Certificate Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4D] tracking-tight">
            Verify Cyber Security Pledge
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Confirm the authenticity of Certificate of Commitment issued by Naksh Foundation.
          </p>
        </div>

        {/* Verification Input Box */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder="e.g. NF/CSP/26000001"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-transparent focus:border-blue-500 focus:bg-white bg-slate-50 focus:outline-none transition-colors font-mono"
                aria-label="Certificate ID"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !certInput.trim()}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <span>Checking...</span>
              ) : (
                <>
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Verification Results Card */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {result.verified ? (
              // -------------------------------------------------------------
              // VERIFIED CARD (Privacy-Preserving)
              // -------------------------------------------------------------
              <div className="bg-white rounded-2xl border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/5 p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-9 h-9" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Certificate Verified
                </div>

                <h2 className="text-xl font-bold text-[#0B1F4D] mb-1">
                  Valid Official Certificate
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  This certificate is valid and was issued by <strong>Naksh Foundation</strong>.
                </p>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 text-left mb-6 space-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-xs text-slate-500 font-medium">Certificate ID</span>
                    <span className="text-sm font-mono font-bold text-[#0B1F4D]">
                      {result.certificateId}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-xs text-slate-500 font-medium">Issuing Authority</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {result.issuer || 'Naksh Foundation'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-xs text-slate-500 font-medium">Verification Status</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      ✓ Verified
                    </span>
                  </div>

                  {result.issueDate && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-slate-500 font-medium">Issue Date</span>
                      <span className="text-sm text-slate-700">{result.issueDate}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-6 flex items-center justify-center gap-2">
                  <Award className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span>National Cyber Security Awareness Month • Official Record</span>
                </div>

                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#0B1F4D] hover:bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  Take the Cyber Security Pledge
                </a>
              </div>
            ) : (
              // -------------------------------------------------------------
              // UNVERIFIED CARD
              // -------------------------------------------------------------
              <div className="bg-white rounded-2xl border-2 border-amber-500/20 shadow-lg shadow-amber-500/5 p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-9 h-9" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-wider mb-2">
                  Certificate Not Verified
                </div>

                <h2 className="text-xl font-bold text-[#0B1F4D] mb-1">
                  Record Not Found
                </h2>
                <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
                  The certificate ID could not be verified against Naksh Foundation's official records. Please check the ID and try again.
                </p>

                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#0B1F4D] hover:bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  Take the Cyber Security Pledge
                </a>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CertificateVerifyPage;
