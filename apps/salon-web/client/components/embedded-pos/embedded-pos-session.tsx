"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { EmbeddedPosPanel } from "./embedded-pos-panel";
import { useEmbeddedPos } from "./use-embedded-pos";
import type {
  EmbeddedPosClientDisplay,
  EmbeddedPosServiceInput,
  OrderDialogData,
} from "./types";

export type EmbeddedPosSessionProps = {
  companyId: string | null;
  appointmentId: string;
  clientId?: string | null;
  clientEmail?: string | null;
  clientDisplayName?: EmbeddedPosClientDisplay;
  mode: "checkout" | "order";
  services?: EmbeddedPosServiceInput[];
  order?: OrderDialogData;
  onSaleComplete?: () => void;
  onHistoryRefresh?: () => void | Promise<void>;
  onRequestClose?: () => void;
};

export function EmbeddedPosSession({
  companyId,
  appointmentId,
  clientId,
  clientEmail = null,
  clientDisplayName = null,
  mode,
  services = [],
  order,
  onSaleComplete,
  onHistoryRefresh,
  onRequestClose,
}: EmbeddedPosSessionProps) {
  const openedRef = useRef(false);

  const pos = useEmbeddedPos({
    companyId,
    appointmentId,
    clientId,
    clientEmail,
    clientDisplayName,
    skipAppointmentOrderSync: true,
    onSaleComplete: () => {
      onSaleComplete?.();
      onRequestClose?.();
    },
    onHistoryRefresh,
  });

  useLayoutEffect(() => {
    return () => {
      pos.terminate();
    };
  }, [pos.terminate]);

  useEffect(() => {
    if (openedRef.current) {
      return;
    }
    openedRef.current = true;

    if (mode === "checkout") {
      void pos.openAppointmentCheckout(appointmentId, services);
      return;
    }

    if (mode === "order" && order) {
      void pos.openOrderDetailPanel(order);
    }
  }, [
    appointmentId,
    mode,
    order,
    pos.openAppointmentCheckout,
    pos.openOrderDetailPanel,
    services,
  ]);

  return <EmbeddedPosPanel pos={pos} />;
}
