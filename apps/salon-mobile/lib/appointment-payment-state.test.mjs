import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appointmentPaymentStatuses, cachedPayment, checkoutBalance, paymentRevision, publishPayments } from './appointment-payment-state.ts';

const order = (id, created_at, extra = {}) => ({
  id,
  payment_status: 'unpaid',
  amount_paid: 0,
  total_amount: 50,
  created_at,
  ...extra,
});
const paidPayment = { status: 'succeeded', payment_status: 'paid', amount: 50, amount_gross: 50 };
const statuses = (items) => appointmentPaymentStatuses(['visit'], items.map(item => ({ appointment_id: 'visit', appointment_segment_id: 'segment', ...item })));

test('a collected payment marks the visit paid when the order row is still unpaid', () => {
  const result = statuses([{ order: order('new', '2026-09-22T18:00:00Z', { payment: [paidPayment] }) }]);
  assert.equal(result.visit.status, 'paid');
  assert.equal(result.visit.amountPaid, 50);
});

test('an older partial order does not keep a later full payment unpaid', () => {
  const result = statuses([
    { order: order('old', '2026-09-01T10:00:00Z', { payment_status: 'partially_paid', amount_paid: 20, payment: [{ status: 'succeeded', payment_status: 'paid', amount: 20 }] }) },
    { order: order('new', '2026-09-22T18:00:00Z', { payment: [paidPayment] }) },
  ]);
  assert.equal(result.visit.status, 'paid');
  assert.equal(result.visit.amountPaid, 50);
  assert.equal(result.visit.totalAmount, 50);
});

test('a partial collection stays partial and an unpaid visit stays unpaid', () => {
  assert.equal(statuses([{ order: order('partial', '2026-09-22T18:00:00Z', { payment: [{ status: 'succeeded', payment_status: 'paid', amount: 20 }] }) }]).visit.status, 'partial');
  assert.equal(statuses([{ order: order('open', '2026-09-22T18:00:00Z') }]).visit.status, 'unpaid');
});

test('split payments on separate orders cover one visit bill', () => {
  const result = statuses([
    { order: order('first', '2026-09-22T17:00:00Z', { payment: [{ status: 'succeeded', payment_status: 'paid', amount: 20 }] }) },
    { order: order('second', '2026-09-22T18:00:00Z', { payment: [{ status: 'succeeded', payment_status: 'paid', amount: 30 }] }) },
  ]);
  assert.equal(result.visit.status, 'paid');
  assert.equal(result.visit.amountPaid, 50);
});

test('a later refresh cannot clear a payment the checkout just confirmed', () => {
  publishPayments('company', { visit: { status: 'paid', amountPaid: 50, totalAmount: 50 } });
  publishPayments('company', { visit: { status: 'unpaid', amountPaid: null, totalAmount: null } }, paymentRevision());
  assert.equal(cachedPayment('company', 'visit').status, 'paid');
});

test('checkout charges only the remainder, including a product added later', () => {
  const orders = [order('open', '2026-09-22T18:00:00Z', { payment: [{ status: 'succeeded', payment_status: 'paid', amount_gross: 20 }] })];
  assert.deepEqual(checkoutBalance(50, orders), { bill: 50, collected: 20, remainder: 30 });
  assert.deepEqual(checkoutBalance(60, orders), { bill: 60, collected: 20, remainder: 40 });
  assert.deepEqual(checkoutBalance(50, [order('paid', '2026-09-22T18:00:00Z', { payment_status: 'paid', amount_paid: 0 })]), { bill: 50, collected: 50, remainder: 0 });
});
