import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: { limit: 50 }
      });
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: true
  });

  // Update unread count when data changes
  useEffect(() => {
    if (notificationsData?.unreadCount !== undefined) {
      setUnreadCount(notificationsData.unreadCount);
    }
  }, [notificationsData]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const value = {
    notifications: notificationsData?.notifications || [],
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
