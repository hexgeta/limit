import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';

const OTC_CONTRACT_ADDRESS = '0x342DF6d98d06f03a20Ae6E2c456344Bb91cE33a2' as const;
const LAST_SEEN_KEY = 'notifications_last_seen';
const READ_NOTIFICATIONS_KEY = 'notifications_read';

export interface OrderNotification {
  orderId: string;
  type: 'buy' | 'sell';
  timestamp: number;
  blockNumber: bigint;
  txHash: string;
  isNew: boolean; // Whether this notification is new since last seen
}

export function useNotifications() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get last seen timestamp from localStorage
  const getLastSeenTimestamp = useCallback(() => {
    if (typeof window === 'undefined' || !address) return 0;
    const stored = localStorage.getItem(`${LAST_SEEN_KEY}_${address}`);
    return stored ? parseInt(stored, 10) : 0;
  }, [address]);

  // Get read notification IDs from localStorage
  const getReadNotifications = useCallback((): Set<string> => {
    if (typeof window === 'undefined' || !address) return new Set();
    const stored = localStorage.getItem(`${READ_NOTIFICATIONS_KEY}_${address}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  }, [address]);

  // Save read notification IDs to localStorage
  const saveReadNotifications = useCallback((readIds: Set<string>) => {
    if (typeof window === 'undefined' || !address) return;
    localStorage.setItem(`${READ_NOTIFICATIONS_KEY}_${address}`, JSON.stringify(Array.from(readIds)));
  }, [address]);

  // Mark a single notification as read
  const markAsRead = useCallback((notificationId: string) => {
    const readIds = getReadNotifications();
    readIds.add(notificationId);
    saveReadNotifications(readIds);
    
    // Update state
    setNotifications(prev => prev.map(notif => {
      if (`${notif.txHash}-${notif.orderId}` === notificationId) {
        return { ...notif, isNew: false };
      }
      return notif;
    }));
    
    // Recalculate unread count
    setNotifications(prev => {
      const newCount = prev.filter(n => n.isNew).length;
      setUnreadCount(newCount);
      return prev;
    });
  }, [address, getReadNotifications, saveReadNotifications]);

  // Toggle read/unread status of a notification
  const toggleReadStatus = useCallback((notificationId: string) => {
    const readIds = getReadNotifications();
    const isCurrentlyRead = readIds.has(notificationId);
    
    if (isCurrentlyRead) {
      readIds.delete(notificationId);
    } else {
      readIds.add(notificationId);
    }
    saveReadNotifications(readIds);
    
    // Update state
    setNotifications(prev => prev.map(notif => {
      if (`${notif.txHash}-${notif.orderId}` === notificationId) {
        return { ...notif, isNew: !isCurrentlyRead };
      }
      return notif;
    }));
    
    // Recalculate unread count
    setNotifications(prev => {
      const newCount = prev.filter(n => n.isNew).length;
      setUnreadCount(newCount);
      return prev;
    });
  }, [address, getReadNotifications, saveReadNotifications]);

  // Mark all current notifications as seen (when opening dropdown)
  const markAsSeen = useCallback(() => {
    if (typeof window === 'undefined' || !address) return;
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(`${LAST_SEEN_KEY}_${address}`, now.toString());
  }, [address]);

  // Fetch all filled orders (order history - both buyer and seller)
  const fetchNotifications = useCallback(async () => {
    if (!address || !publicClient) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const lastSeen = getLastSeenTimestamp();
      const readIds = getReadNotifications();

      // PART 1: Query OrderExecuted events where the user is the buyer
      const buyerLogs = await publicClient.getLogs({
        address: OTC_CONTRACT_ADDRESS,
        event: parseAbiItem('event OrderExecuted(address indexed user, uint256 orderId)'),
        args: {
          user: address
        },
        fromBlock: 'earliest'
      });

      // PART 2: Query OrderExecuted events where the user is the seller
      // First, get all orders created by the user
      const orderCreatedLogs = await publicClient.getLogs({
        address: OTC_CONTRACT_ADDRESS,
        event: parseAbiItem('event OrderCreated(address indexed user, uint256 orderId)'),
        args: {
          user: address
        },
        fromBlock: 'earliest'
      });
      
      const userCreatedOrderIds = orderCreatedLogs.map(log => log.args.orderId?.toString()).filter(Boolean);
      
      // Now get all executed events and filter for user's created orders
      let sellerLogs: any[] = [];
      if (userCreatedOrderIds.length > 0) {
        const allExecutedLogs = await publicClient.getLogs({
          address: OTC_CONTRACT_ADDRESS,
          event: parseAbiItem('event OrderExecuted(address indexed user, uint256 orderId)'),
          fromBlock: 'earliest'
        });
        
        // Filter to only include events for user's created orders and exclude their own purchases
        sellerLogs = allExecutedLogs.filter(log => {
          const orderId = log.args.orderId?.toString();
          const buyer = log.args.user?.toLowerCase();
          return orderId && 
                 userCreatedOrderIds.includes(orderId) && 
                 buyer !== address.toLowerCase();
        });
      }

      // Combine buyer and seller logs
      const allLogs = [...buyerLogs, ...sellerLogs];
      
      // Get block details to extract timestamps and mark as new/read
      const logsWithTimestamps = await Promise.all(
        allLogs.map(async (log) => {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          const timestamp = Number(block.timestamp);
          const orderId = log.args.orderId?.toString() || '';
          const buyer = log.args.user?.toLowerCase();
          const notificationId = `${log.transactionHash}-${orderId}`;
          
          // Determine if this is a buy or sell transaction
          const isBuyer = buyer === address.toLowerCase();
          const type = isBuyer ? 'buy' as const : 'sell' as const;
          
          // Mark as new if: timestamp > lastSeen AND not in read list
          const isNew = timestamp > lastSeen && !readIds.has(notificationId);
          
          return {
            orderId,
            type,
            timestamp,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            isNew
          };
        })
      );

      // Sort by timestamp (newest first)
      logsWithTimestamps.sort((a, b) => b.timestamp - a.timestamp);

      // Count only new notifications
      const newCount = logsWithTimestamps.filter(n => n.isNew).length;

      setNotifications(logsWithTimestamps);
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, getLastSeenTimestamp, getReadNotifications]);

  // Fetch notifications on mount and when wallet changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [address, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsSeen,
    markAsRead,
    toggleReadStatus,
    refresh: fetchNotifications
  };
}

