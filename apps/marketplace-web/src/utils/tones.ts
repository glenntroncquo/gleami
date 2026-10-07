export type Tone = 'rose' | 'sage' | 'sand' | 'sky' | 'lilac' | 'neutral';

type ToneSet = {
  soft: string;
  solid: string;
  text: string;
  dot: string;
  border: string;
  bar: string;
};

export const toneClasses: Record<Tone, ToneSet> = {
  rose: {
    soft: 'bg-rose-50',
    solid: 'bg-rose-100',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    border: 'border-rose-400',
    bar: 'bg-rose-400'
  },
  sage: {
    soft: 'bg-sage-50',
    solid: 'bg-sage-100',
    text: 'text-sage-700',
    dot: 'bg-sage-500',
    border: 'border-sage-400',
    bar: 'bg-sage-400'
  },
  sand: {
    soft: 'bg-sand-50',
    solid: 'bg-sand-100',
    text: 'text-sand-700',
    dot: 'bg-sand-500',
    border: 'border-sand-400',
    bar: 'bg-sand-400'
  },
  sky: {
    soft: 'bg-sky-50',
    solid: 'bg-sky-100',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
    border: 'border-sky-400',
    bar: 'bg-sky-400'
  },
  lilac: {
    soft: 'bg-lilac-50',
    solid: 'bg-lilac-100',
    text: 'text-lilac-700',
    dot: 'bg-lilac-500',
    border: 'border-lilac-400',
    bar: 'bg-lilac-400'
  },
  neutral: {
    soft: 'bg-shell',
    solid: 'bg-line',
    text: 'text-muted',
    dot: 'bg-subtle',
    border: 'border-line-strong',
    bar: 'bg-subtle'
  }
};