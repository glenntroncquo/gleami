/** Scrollable legal pages. Root CSS keeps html/body overflow hidden for the widget. */
export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="h-dvh overflow-y-auto bg-neutral-50">{children}</div>;
}
