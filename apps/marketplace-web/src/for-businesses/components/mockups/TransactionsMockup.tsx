import React from 'react';
import { Badge } from '../ui/Badge';
import { transactionSummary, transactions } from '../../data/payments';

export function TransactionsMockup() {
  return (
    <div role="img" aria-label="Gleami transactions overview for today with payment statuses" className="w-full bg-white text-ink">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <p className="text-[15px] font-semibold">Transactions</p>
          <p className="text-[11px] text-muted">Today · Tuesday 29 September</p>
        </div>
        <span className="rounded-lg px-2.5 py-1 text-[11px] font-medium ring-1 ring-line">Export</span>
      </div>
      <div className="grid grid-cols-3 border-b border-line">
        {transactionSummary.map((s, i) =>
        <div key={s.label} className={`px-5 py-4 ${i > 0 ? 'border-l border-line' : ''}`}>
            <p className="text-[11px] text-muted">{s.label}</p>
            <p className={`mt-1 font-semibold tracking-tight ${i === 0 ? 'text-[22px]' : 'text-[16px]'}`}>{s.value}</p>
          </div>
        )}
      </div>
      <ul className="px-5 py-2">
        {transactions.map((t) =>
        <li key={`${t.time}-${t.client}`} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
            <span className="w-10 text-[11px] text-muted">{t.time}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{t.client}</p>
              <p className="truncate text-[11px] text-muted">{t.item}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[13px] font-medium ${t.status === 'Refunded' ? 'text-muted line-through' : ''}`}>{t.amount}</span>
              <Badge tone={t.tone} dot>
                {t.status}
              </Badge>
            </div>
          </li>
        )}
      </ul>
    </div>);

}