import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelMyAppointment, listMyAppointments, type MyAppointment } from '@/src/api/appointments';
import { useAuth } from '@/src/auth/auth-context';
import { useOnline } from '@/src/lib/online';

export function useMyAppointments() {
  const { user } = useAuth();
  const online = useOnline();
  return useQuery({
    queryKey: ['my-appointments', user?.id],
    queryFn: listMyAppointments,
    enabled: online && Boolean(user),
  });
}

/** Optimistically flags the appointment canceled; rolls back when the call fails. */
export function useCancelMyAppointment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['my-appointments', user?.id];

  return useMutation({
    mutationFn: (appointmentId: string) => cancelMyAppointment(appointmentId),
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MyAppointment[]>(queryKey);
      queryClient.setQueryData<MyAppointment[]>(queryKey, (current) =>
        (current ?? []).map((item) => (item.id === appointmentId ? { ...item, isCanceled: true } : item)),
      );
      return { previous };
    },
    onError: (_error, _appointmentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
