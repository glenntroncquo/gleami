"use client";

export default function AccountUnavailablePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6 text-center text-[#101114]">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Your account could not be opened</h1>
        <p className="mt-3 text-[#737989]">
          Your salons could not be loaded. Nothing new was created. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 h-12 rounded-full bg-[#071D43] px-6 font-semibold text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
