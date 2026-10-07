import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.3, ease: easeOut, delay }}>
      
      {children}
    </motion.div>);

}