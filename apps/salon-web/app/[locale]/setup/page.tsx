"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useAuth } from "@/providers/auth-provider";
import { loadSalonSetup, saveSalonSetup } from "@/lib/api/auth/new-onboarding";

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
    if (!loading && !user) router.replace(`/${locale}/login`);
  }, [loading, user, router, locale]);

  useEffect(() => {
    if (!user) return;
    loadSalonSetup().then(value => {
      if (!value) return;
      setName(value.business_name ?? ""); setWebsite(value.website ?? "");
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
      await saveSalonSetup(targetStep, data);
      if (targetStep === 6) router.replace(`/${locale}/calendar`);
      else setStep(targetStep + 1);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save setup"); }
    finally { setBusy(false); }
  }, [address, hours, locale, name, router, selected, software, teamSize, website]);

  if (loading || !user) return <div className="grid min-h-screen place-items-center bg-[#F7F8FC] text-[#5B6480]">Loading…</div>;
  const title = ["What’s the name of your business?", "What services do you offer?", "How big is your team?", "Where is your business located?", "Which software do you use today?", "When are you open?"][step - 1];
  const subtitle = ["This is the name clients will see. You can add legal and billing details later.", "Choose your main category and up to three related services.", "This helps us set up your calendar.", "Add your first business location. You can add more locations later.", "We can help you move your business and data over.", "Set your standard opening hours. You can change them anytime."][step - 1];
  const canContinue = !busy && !(step === 1 && !name.trim()) && !(step === 2 && selected.length === 0) && !(step === 3 && !teamSize) && !(step === 4 && (!address.street.trim() || !address.city.trim() || !address.country.trim()));
  const fieldClass = "h-[58px] rounded-[13px] border-[#D7D7D9] bg-white px-4 text-base shadow-none focus-visible:border-[#6488E8] focus-visible:ring-2 focus-visible:ring-[#6488E8]/20";
  return (
    <main className="flex min-h-screen flex-col bg-white text-[#101114]">
      <header className="sticky top-0 z-10 border-b border-[#ECEDEF] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Image src="/gleami-wordmark.svg" alt="Gleami" width={112} height={38} priority className="h-8 w-auto" />
          <div className="flex items-center gap-5">
            <div className="hidden gap-1.5 sm:flex" aria-label={`Step ${step} of 6`}>
              {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-1.5 w-8 rounded-full transition-colors ${index < step ? "bg-[#817BFA]" : "bg-[#E5E9F2]"}`} />)}
            </div>
            <span className="text-sm font-medium tabular-nums text-[#737989]">{step} <span className="text-[#B2B5BC]">/ 6</span></span>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-32 pt-8 sm:px-8 sm:pt-12">
        <div className="mb-8 flex items-center justify-between sm:hidden">
          <div className="flex gap-1.5" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-1.5 w-7 rounded-full ${index < step ? "bg-[#817BFA]" : "bg-[#E5E9F2]"}`} />)}</div>
        </div>
        {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-[#737989] transition hover:text-[#101114]"><ArrowLeft className="h-4 w-4" /> Back</button>}
        <p className="text-sm font-semibold tracking-[0.01em] text-[#737989]">Account setup</p>
        <h1 className="mt-3 max-w-[620px] text-[34px] font-semibold leading-[1.12] tracking-[-0.04em] sm:text-[42px]">{title}</h1>
        <p className="mt-4 max-w-[610px] text-base leading-7 text-[#737989] sm:text-[17px]">{subtitle}</p>

        <div className="mt-9">
          {step === 1 && <div className="space-y-6">
            <label className="block space-y-2 text-sm font-semibold">Business name<Input autoFocus value={name} onChange={event => setName(event.target.value)} className={fieldClass} /></label>
            <label className="block space-y-2 text-sm font-semibold">Website <span className="font-normal text-[#888B92]">Optional</span><Input value={website} onChange={event => setWebsite(event.target.value)} placeholder="www.yoursite.com" className={fieldClass} /></label>
          </div>}

          {step === 2 && <>
            <p className="mb-4 text-sm text-[#737989]">Choose up to four. Your first choice is your main category.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categories.map(category => {
                const index = selected.indexOf(category);
                const active = index >= 0;
                return <button key={category} type="button" aria-pressed={active} onClick={() => setSelected(previous => active ? previous.filter(item => item !== category) : previous.length < 4 ? [...previous, category] : previous)} className={`flex min-h-[68px] items-center justify-between rounded-[14px] border px-5 text-left text-[15px] font-medium transition ${active ? "border-[#817BFA] bg-[#F0F3FC] text-[#071D43]" : "border-[#E5E9F2] bg-white hover:border-[#6488E8]"}`}>
                  <span>{category}</span><span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${active ? "bg-[#817BFA] text-white" : "border border-[#D9DADD] text-transparent"}`}>{active ? index === 0 ? "Main" : index + 1 : "✓"}</span>
                </button>;
              })}
            </div>
          </>}

          {step === 3 && <div className="space-y-2.5">
            {sizes.map(size => <button key={size} type="button" aria-pressed={teamSize === size} onClick={() => setTeamSize(size)} className={`flex w-full items-center justify-between rounded-[14px] border px-5 py-[18px] text-left text-[15px] font-medium transition ${teamSize === size ? "border-[#817BFA] bg-[#F0F3FC] text-[#071D43]" : "border-[#E5E9F2] bg-white hover:border-[#6488E8]"}`}><span>{size}</span><span className={`grid h-5 w-5 place-items-center rounded-full border ${teamSize === size ? "border-[#817BFA] bg-[#817BFA] text-white" : "border-[#C9CACE] text-transparent"}`}><Check className="h-3 w-3" /></span></button>)}
          </div>}

          {step === 4 && <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-semibold sm:col-span-2">Street address<Input autoComplete="street-address" value={address.street} onChange={event => setAddress({ ...address, street: event.target.value })} className={fieldClass} /></label>
            <label className="block space-y-2 text-sm font-semibold">City<Input autoComplete="address-level2" value={address.city} onChange={event => setAddress({ ...address, city: event.target.value })} className={fieldClass} /></label>
            <label className="block space-y-2 text-sm font-semibold">Postal code<Input autoComplete="postal-code" value={address.postalCode} onChange={event => setAddress({ ...address, postalCode: event.target.value })} className={fieldClass} /></label>
            <label className="block space-y-2 text-sm font-semibold">Region <span className="font-normal text-[#888B92]">Optional</span><Input autoComplete="address-level1" value={address.state} onChange={event => setAddress({ ...address, state: event.target.value })} className={fieldClass} /></label>
            <label className="block space-y-2 text-sm font-semibold">Country<Input autoComplete="country-name" value={address.country} onChange={event => setAddress({ ...address, country: event.target.value })} className={fieldClass} /></label>
          </div>}

          {step === 5 && <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {softwareOptions.map(option => <button key={option} type="button" aria-pressed={software === option} onClick={() => setSoftware(option)} className={`min-h-[58px] rounded-[14px] border px-4 text-left text-[14px] font-medium transition ${software === option ? "border-[#817BFA] bg-[#F0F3FC] text-[#071D43]" : "border-[#E5E9F2] bg-white hover:border-[#6488E8]"}`}>{option}</button>)}
          </div>}

          {step === 6 && <div className="divide-y divide-[#ECEDEF] border-y border-[#ECEDEF]">
            {days.map(day => <div key={day} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[1fr_140px_auto_140px_auto] sm:gap-4">
              <span className="text-sm font-medium">{day}</span>
              <label className="col-start-2 row-start-1 flex items-center gap-1.5 text-xs text-[#737989] sm:col-start-5 sm:text-sm"><input type="checkbox" checked={hours[day]?.closed ?? false} onChange={event => setHours({ ...hours, [day]: { ...hours[day], closed: event.target.checked } })} className="h-4 w-4 accent-[#817BFA]" />Closed</label>
              <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:col-span-3 sm:col-start-2 sm:row-start-1 sm:gap-3">
                <Input aria-label={`${day} opening time`} type="time" disabled={hours[day]?.closed} value={hours[day]?.start ?? "10:00"} onChange={event => setHours({ ...hours, [day]: { ...hours[day], start: event.target.value } })} className="h-11 rounded-xl border-[#E1E2E5] px-2 text-sm disabled:opacity-40 sm:px-3" />
                <span className="text-center text-xs text-[#9A9CA2]">to</span>
                <Input aria-label={`${day} closing time`} type="time" disabled={hours[day]?.closed} value={hours[day]?.end ?? "19:00"} onChange={event => setHours({ ...hours, [day]: { ...hours[day], end: event.target.value } })} className="h-11 rounded-xl border-[#E1E2E5] px-2 text-sm disabled:opacity-40 sm:px-3" />
              </div>
            </div>)}
          </div>}
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-[#ECEDEF] bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-4">
          <Button type="button" onClick={() => void save(step)} disabled={!canContinue} className="h-[58px] w-full rounded-full bg-[#071D43] text-[16px] font-semibold text-white shadow-none transition hover:bg-[#102958] disabled:bg-[#E5E9F2] disabled:text-[#737989] sm:ml-auto sm:w-[280px]">
            {busy ? <LoadingDots label="Saving" /> : <>{step === 6 ? "Finish setup" : "Continue"}<ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </footer>
    </main>
  );
}
