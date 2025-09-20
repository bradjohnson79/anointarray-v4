"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [cookiesOk, setCookiesOk] = useState(true);
  useEffect(() => {
    try {
      // Probe basic cookie support (required for login/session)
      document.cookie = `aa_cookie_test=1; path=/; SameSite=Lax`;
      const ck = (typeof document !== 'undefined' ? document.cookie : '') || '';
      setCookiesOk(/aa_cookie_test=1/.test(ck));
      if (localStorage.getItem("aa_cookie_consent") !== "1") setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="text-sm text-gray-300">
          {cookiesOk ? (
            <>
              We use cookies (necessary for login) and to improve your experience. By clicking Agree, you consent to this use.
            </>
          ) : (
            <>
              Cookies appear to be disabled in your browser. Login and checkout will not work until cookies are enabled.
            </>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => {
              try {
                localStorage.setItem("aa_cookie_consent", "1");
                const oneYear = 60*60*24*365;
                document.cookie = `aa_cookie_consent=1; path=/; SameSite=Lax; max-age=${oneYear}`;
              } catch {}
              setShow(false);
            }}
            className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm"
          >
            Agree
          </button>
          <button onClick={() => setShow(false)} className="px-3 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
