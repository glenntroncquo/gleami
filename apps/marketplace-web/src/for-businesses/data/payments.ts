import type { Tone } from '../utils/tones';

export const checkoutItems = [
{ name: 'Balayage', detail: '105 min · Emma', price: '€145.00' },
{ name: 'Repair shampoo 250 ml', detail: 'Retail · ×1', price: '€24.00' }];


export const checkoutTotals = [
{ label: 'Subtotal', value: '€169.00' },
{ label: 'Discount', value: '—' }];


export const checkoutMethods = ['Card', 'Cash', 'Split'];

export const transactionSummary = [
{ label: 'Taken today', value: '€1,284' },
{ label: 'Pending', value: '€96' },
{ label: 'Refunded', value: '€18' }];


export const transactions: {time: string;client: string;item: string;amount: string;status: string;tone: Tone;}[] = [
{ time: '12:04', client: 'Charlotte De Smet', item: 'Balayage + product', amount: '€169.00', status: 'Paid', tone: 'sage' },
{ time: '11:52', client: 'Eva Lambert', item: 'Pedicure', amount: '€48.00', status: 'Pending', tone: 'sand' },
{ time: '11:46', client: 'Elise Smets', item: 'Brow lamination', amount: '€55.00', status: 'Paid', tone: 'sage' },
{ time: '10:40', client: 'Jonas Maes', item: 'Beard oil', amount: '€18.00', status: 'Refunded', tone: 'neutral' },
{ time: '10:32', client: 'Hanne Vos', item: 'Lash lift', amount: '€65.00', status: 'Paid', tone: 'sage' },
{ time: '09:58', client: 'Lea Martens', item: 'Cut & blow-dry', amount: '€58.00', status: 'Paid', tone: 'sage' }];


export const paymentPoints = [
{ title: 'Simple checkout', body: 'Turn a finished appointment into a paid sale in a few taps.' },
{ title: 'Integrated payments', body: 'Payments are linked to the appointment and the client automatically.' },
{ title: 'Clear status', body: 'Paid, pending or refunded — always visible, never guessed.' },
{ title: 'Refunds when needed', body: 'Handle refunds from the transaction itself, with a full record.' }];