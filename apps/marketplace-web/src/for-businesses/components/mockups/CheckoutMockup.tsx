import React from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { checkoutItems, checkoutMethods, checkoutTotals } from '../../data/payments';

export function CheckoutMockup() {
  return (
    <div
      role="img"
      aria-label="Gleami checkout for a balayage appointment and a retail product, total €169"
      className="w-full bg-white text-ink">
      
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <p className="text-[16px] font-semibold tracking-tight">Checkout</p>
        <XIcon className="h-4 w-4 text-muted" />
      </div>
      <div className="grid grid-cols-[1fr_260px]">
        <div className="p-6">
          <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
            <Avatar name="Charlotte De Smet" tone="rose" size="md" />
            <div>
              <p className="text-[14px] font-semibold">Charlotte De Smet</p>
              <p className="text-[12px] text-muted">Appointment today, 10:15 with Emma</p>
            </div>
          </div>
          <ul className="mt-5">
            {checkoutItems.map((i) =>
            <li key={i.name} className="flex items-center justify-between border-b border-line py-3.5">
                <div>
                  <p className="text-[14px] font-medium">{i.name}</p>
                  <p className="text-[12px] text-muted">{i.detail}</p>
                </div>
                <p className="text-[14px] font-medium">{i.price}</p>
              </li>
            )}
          </ul>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[13px] text-muted">
            <PlusIcon className="h-4 w-4" />
            Add treatment or product
          </div>
        </div>
        <div className="flex flex-col border-l border-line bg-canvas p-6">
          <dl className="space-y-2 text-[13px]">
            {checkoutTotals.map((t) =>
            <div key={t.label} className="flex justify-between">
                <dt className="text-muted">{t.label}</dt>
                <dd>{t.value}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-[13px] font-medium">Total</span>
            <span className="text-[28px] font-semibold tracking-tight">€169.00</span>
          </div>
          <p className="mt-6 text-[11px] font-medium text-muted">Payment</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-white p-1 ring-1 ring-line text-[12px] font-medium">
            {checkoutMethods.map((m, i) =>
            <span key={m} className={`rounded-lg py-1.5 text-center ${i === 0 ? 'bg-ink text-white' : 'text-muted'}`}>
                {m}
              </span>
            )}
          </div>
          <div className="mt-auto pt-8">
            <div className="flex h-12 items-center justify-center rounded-xl bg-ink text-[14px] font-semibold text-white">
              Charge €169.00
            </div>
          </div>
        </div>
      </div>
    </div>);

}