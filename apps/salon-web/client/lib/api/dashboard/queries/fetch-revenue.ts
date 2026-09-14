import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { withLocationId } from "@/lib/location";

export type MonthlyRevenue = {
  month: string;
  revenue: number;
  revenueExclVat: number;
};

export type RevenueData = {
  monthlyData: MonthlyRevenue[];
  totalRevenue: number;
  totalRevenueExclVat: number;
  growthPercentage: number;
};

export async function fetchRevenue(
  companyId: string,
  locationId?: string | null,
): Promise<{
  data: RevenueData | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();

  // Rolling 12-month range (last year up to current month)
  const now = new Date();
  const rangeStart = startOfMonth(addMonths(now, -11));
  const rangeEnd = endOfMonth(now);

  try {
    // First, get order IDs that belong to this company through order_item
    const { data: orderItemsData, error: orderItemsError } = await withLocationId(
      supabase
        .from("order_item")
        .select("order_id")
        .eq("company_id", companyId),
      locationId,
    );

    if (orderItemsError) {
      return {
        data: null,
        error: orderItemsError,
      };
    }

    const orderIds = [
      ...new Set((orderItemsData || []).map((item) => item.order_id)),
    ];

    if (orderIds.length === 0) {
      return {
        data: {
          monthlyData: [],
          totalRevenue: 0,
          totalRevenueExclVat: 0,
          growthPercentage: 0,
        },
        error: null,
      };
    }

    // Fetch all orders for this company in the rolling 24-month range
    const { data: ordersData, error: ordersError } = await supabase
      .from("order")
      .select("id, created_at, total_amount, subtotal")
      .in("id", orderIds)
      .gte("created_at", rangeStart.toISOString())
      .lte("created_at", rangeEnd.toISOString())
      .order("created_at", { ascending: true });

    if (ordersError) {
      return {
        data: null,
        error: ordersError,
      };
    }

    // Group orders by month and calculate revenue (incl/excl VAT)
    const monthlyRevenueMap = new Map<string, number>();
    const monthlyRevenueExclVatMap = new Map<string, number>();

    // Initialize rolling 12 months with 0 revenue
    for (let i = 0; i < 12; i++) {
      const date = addMonths(rangeStart, i);
      const monthKey = format(startOfMonth(date), "MMM yyyy");
      monthlyRevenueMap.set(monthKey, 0);
      monthlyRevenueExclVatMap.set(monthKey, 0);
    }

    // Aggregate revenue by month
    (ordersData || []).forEach((order) => {
      const orderDate = new Date(order.created_at);
      const monthKey = format(startOfMonth(orderDate), "MMM yyyy");
      const currentRevenue = monthlyRevenueMap.get(monthKey) || 0;
      monthlyRevenueMap.set(
        monthKey,
        currentRevenue + (order.total_amount || 0),
      );
      const currentRevenueExclVat = monthlyRevenueExclVatMap.get(monthKey) || 0;
      monthlyRevenueExclVatMap.set(
        monthKey,
        currentRevenueExclVat + (order.subtotal || 0),
      );
    });

    // Convert to array format (preserving rolling 12-month order)
    const monthlyData: MonthlyRevenue[] = [];
    for (let i = 0; i < 12; i++) {
      const date = addMonths(rangeStart, i);
      const monthKey = format(startOfMonth(date), "MMM yyyy");
      monthlyData.push({
        month: monthKey,
        revenue: monthlyRevenueMap.get(monthKey) || 0,
        revenueExclVat: monthlyRevenueExclVatMap.get(monthKey) || 0,
      });
    }

    // Calculate total revenue
    const totalRevenue = monthlyData.reduce(
      (sum, month) => sum + month.revenue,
      0,
    );

    // Subtotal is treated as revenue excluding VAT
    const totalRevenueExclVat = (ordersData || []).reduce(
      (sum, order) => sum + (order.subtotal || 0),
      0,
    );

    // Calculate growth percentage (current month vs previous month)
    let growthPercentage = 0;
    const currentMonthIndex = monthlyData.length - 1;
    if (
      currentMonthIndex > 0 &&
      monthlyData[currentMonthIndex] &&
      monthlyData[currentMonthIndex - 1]
    ) {
      const currentMonth = monthlyData[currentMonthIndex];
      const previousMonth = monthlyData[currentMonthIndex - 1];

      if (currentMonth && previousMonth && previousMonth.revenue > 0) {
        growthPercentage =
          ((currentMonth.revenue - previousMonth.revenue) /
            previousMonth.revenue) *
          100;
      }
    }

    return {
      data: {
        monthlyData,
        totalRevenue,
        totalRevenueExclVat,
        growthPercentage,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return {
      data: null,
      error: error as PostgrestError,
    };
  }
}
