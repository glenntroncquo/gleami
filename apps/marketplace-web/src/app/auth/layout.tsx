import "../globals.css";

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE">
      <body className="bg-canvas font-sans text-ink">{children}</body>
    </html>
  );
}
