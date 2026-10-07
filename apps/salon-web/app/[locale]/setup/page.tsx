"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";
import { loadSalonSetup, saveSalonSetup, type SetupDraft } from "@/lib/api/auth/new-onboarding";

const categories = ["Hair salon", "Nails", "Brows & lashes", "Beauty salon", "Medical spa", "Barber", "Massage", "Spa & sauna", "Makeup", "Tattoo"];
const sizes = ["Just me", "2–5 people", "6–10 people", "11–20 people", "20+ people"];
const softwareOptions = ["Acuity", "Booksy", "Calendly", "Goldie", "Jane", "Mindbody", "Salon Iris", "Setmore", "Square", "Timely", "Treatwell", "Vagaro", "Other", "I'm not using software"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type Hours = Record<string, { closed: boolean; start: string; end: string }>;
const defaultHours = Object.fromEntries(days.map((d, i) => [d, { closed: i === 6, start: "10:00", end: i === 5 ? "17:00" : "19:00" }])) as Hours;

export default function SalonSetupPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState("");
  const [software, setSoftware] = useState("");
  const [address, setAddress] = useState({ street: "", city: "", postalCode: "", state: "", country: "Belgium", timezone: "Europe/Brussels" });
  const [hours, setHours] = useState<Hours>(defaultHours);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${locale}/start`);
  }, [loading, user, router, locale]);

  useEffect(() => {
    if (!user) return;
    loadSalonSetup().then(value => {
      if (!value) return;
      setDraft(value); setName(value.business_name ?? ""); setWebsite(value.website ?? "");
      setSelected(value.categories ?? []); setTeamSize(value.team_size ?? "");
      setSoftware(value.current_software ?? "");
      setAddress(prev => ({ ...prev, ...(value.address ?? {}) }));
      setHours({ ...defaultHours, ...(value.opening_hours ?? {}) } as Hours);
      setStep(value.current_step ?? 1);
    }).catch(error => toast.error(error instanceof Error ? error.message : "Could not load setup"));
  }, [user]);

  const save = useCallback(async (targetStep: number) => {
    setBusy(true);
    try {
      const data = targetStep === 1 ? { businessName: name, website }
        : targetStep === 2 ? { categories: selected }
        : targetStep === 3 ? { teamSize }
        : targetStep === 4 ? { address }
        : targetStep === 5 ? { software }
        : { openingHours: hours };
      const result = await saveSalonSetup(targetStep, data);
      setDraft(result);
      if (targetStep === 5) router.replace(`/${locale}/calendar`);
      else setStep(targetStep + 1);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save setup"); }
    finally { setBusy(false); }
  }, [address, hours, locale, name, router, selected, software, teamSize, website]);

  if (loading || !user) return <div className="grid min-h-screen place-items-center bg-[#F7F8FC] text-[#5B6480]">Loading…</div>;
  const title = ["What’s the name of your business?", "What services do you offer?", "How big is your team?", "Where is your business located?", "Which software do you use today?", "When are you open?"][step - 1];
  const subtitle = ["This is the name clients will see. You can add legal and billing details later.", "Choose your main category and up to three related services.", "This helps us set up your calendar.", "Add your first business location. You can add more locations later.", "We can help you move your business and data over.", "Set your standard opening hours. You can change them anytime."][step - 1];
  return <main className="flex min-h-screen flex-col bg-[#F7F8FC] text-[#0B1C3F]">
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-10">
      <div className="flex gap-2" aria-label={`Step ${step} of 6`}>{days.slice(0, 6).map((_, i) => <span key={i} className={`h-1.5 w-10 rounded-full sm:w-16 ${i < step ? "bg-[#5B7CF0]" : "bg-[#E5E8F1]"}`} />)}</div>
      {draft?.company_id && <button onClick={() => router.push(`/${locale}/calendar`)} className="text-sm font-semibold text-[#4361DB]">Save and exit</button>}
    </header>
    <section className="mx-auto w-full max-w-5xl flex-1 px-5 pb-28 pt-8 sm:px-10 sm:pt-14">
      {step > 1 && <button onClick={() => setStep(step - 1)} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#5B6480]"><ArrowLeft className="h-4 w-4" /> Back</button>}
      <p className="text-sm font-semibold text-[#4361DB]">SET UP YOUR ACCOUNT · STEP {step} OF 6</p>
      <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-lg leading-7 text-[#5B6480]">{subtitle}</p>
      <div className="mt-10 max-w-3xl">
        {step === 1 && <div className="space-y-5"><label className="block space-y-2 text-sm font-semibold">Business name<Input autoFocus value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-xl border-[#D3D8E6] bg-white text-base focus-visible:ring-[#5B7CF0]" /></label><label className="block space-y-2 text-sm font-semibold">Website <span className="font-normal text-[#7F87A2]">Optional</span><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.yoursite.com" className="h-14 rounded-xl border-[#D3D8E6] bg-white text-base focus-visible:ring-[#5B7CF0]" /></label></div>}
        {step === 2 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{categories.map(category => { const active = selected.includes(category); return <button key={category} onClick={() => setSelected(prev => active ? prev.filter(x => x !== category) : prev.length < 4 ? [...prev, category] : prev)} className={`min-h-28 rounded-2xl border p-5 text-left font-semibold transition ${active ? "border-[#5B7CF0] bg-[#F1F4FE] text-[#14295A] shadow-[inset_0_0_0_1px_#5B7CF0]" : "border-[#E5E8F1] bg-white hover:border-[#A3B6F8]"}`}><span className="mb-4 block text-xl text-[#4361DB]">{active ? <Check className="h-5 w-5" /> : "✳"}</span>{category}</button>; })}</div>}
        {step === 3 && <div className="space-y-3">{sizes.map(size => <button key={size} onClick={() => setTeamSize(size)} className={`w-full rounded-2xl border bg-white px-6 py-5 text-left font-semibold ${teamSize === size ? "border-[#5B7CF0] bg-[#F1F4FE] shadow-[inset_0_0_0_1px_#5B7CF0]" : "border-[#E5E8F1] hover:border-[#A3B6F8]"}`}>{size}</button>)}</div>}
        {step === 4 && <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold sm:col-span-2">Street address<Input value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} className="h-14 rounded-xl border-[#D3D8E6] bg-white" /></label><label className="space-y-2 text-sm font-semibold">City<Input value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} className="h-14 rounded-xl border-[#D3D8E6] bg-white" /></label><label className="space-y-2 text-sm font-semibold">Postal code<Input value={address.postalCode} onChange={e => setAddress({ ...address, postalCode: e.target.value })} className="h-14 rounded-xl border-[#D3D8E6] bg-white" /></label><label className="space-y-2 text-sm font-semibold">Region<Input value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} className="h-14 rounded-xl border-[#D3D8E6] bg-white" /></label><label className="space-y-2 text-sm font-semibold">Country<Input value={address.country} onChange={e => setAddress({ ...address, country: e.target.value })} className="h-14 rounded-xl border-[#D3D8E6] bg-white" /></label></div>}
        {step === 5 && <div className="space-y-3">{softwareOptions.map(option => <button key={option} onClick={() => setSoftware(option)} className={`w-full rounded-2xl border bg-white px-6 py-4 text-left font-medium ${software === option ? "border-[#5B7CF0] bg-[#F1F4FE] shadow-[inset_0_0_0_1px_#5B7CF0]" : "border-[#E5E8F1] hover:border-[#A3B6F8]"}`}>{option}</button>)}</div>}
        {step === 6 && <div className="space-y-3">{days.map(day => <div key={day} className="grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-3 rounded-xl border border-[#E5E8F1] bg-white p-3 sm:p-4"><span className="text-sm font-semibold">{day}</span><label className="flex items-center gap-2 text-xs text-[#5B6480]"><input type="checkbox" checked={hours[day]?.closed ?? false} onChange={e => setHours({ ...hours, [day]: { ...hours[day], closed: e.target.checked } })} className="accent-[#5B7CF0]" />Closed</label><Input type="time" disabled={hours[day]?.closed} value={hours[day]?.start ?? "10:00"} onChange={e => setHours({ ...hours, [day]: { ...hours[day], start: e.target.value } })} className="h-11 border-[#D3D8E6]"/><Input type="time" disabled={hours[day]?.closed} value={hours[day]?.end ?? "19:00"} onChange={e => setHours({ ...hours, [day]: { ...hours[day], end: e.target.value } })} className="h-11 border-[#D3D8E6]"/></div>)}</div>}
      </div>
    </section>
    <footer className="fixed inset-x-0 bottom-0 border-t border-[#E5E8F1] bg-white/95 p-4 backdrop-blur sm:px-10"><div className="mx-auto flex max-w-5xl justify-end"><Button onClick={() => void save(step)} disabled={busy || (step === 1 && !name.trim()) || (step === 2 && selected.length === 0) || (step === 3 && !teamSize) || (step === 4 && (!address.street.trim() || !address.city.trim() || !address.country.trim()))} className="h-14 w-full rounded-full bg-[#0B1C3F] text-white hover:bg-[#14295A] sm:w-72">{busy ? "Saving…" : step === 6 ? "Finish setup" : "Continue"} <ArrowRight className="ml-2 h-4 w-4"/></Button></div></footer>
  </main>;
}
