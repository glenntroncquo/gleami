import {
  mapServiceColorToEventColor as mapServiceColorToEventColorUtil,
  getEventColorCSS as getEventColorCSSUtil,
} from "./service-colors";

export const mapServiceColorToEventColor = mapServiceColorToEventColorUtil;
export const getEventColorCSS = getEventColorCSSUtil;

export const getServiceColorCSS = (
  serviceColor: string | null,
  serviceName?: string
): string => {
  const eventColor = mapServiceColorToEventColorUtil(
    serviceColor,
    serviceName
  );
  return getEventColorCSSUtil(eventColor);
};
