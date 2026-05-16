import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './authStore';
import client from '../api/client';

const STORAGE_KEYS = {
  FOLLOWING_IDS: userId => `FOLLOWING_IDS_${userId}`,
};

const FollowContext = createContext();

export const FollowProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [followingIds, setFollowingIds] = useState(new Set());

  const persistFollowingIds = useCallback(async idsSet => {
    if (!user?.id) return;
    const ids = [...idsSet].filter(id => typeof id === 'number');
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWING_IDS(user.id), JSON.stringify(ids));
    } catch (error) {
      console.error('❌ Failed to persist following ids:', error);
    }
  }, [user?.id]);

  const setInitialFollowing = ids => {
    setFollowingIds(prev => {
      const merged = new Set(prev);
      ids
        .filter(id => typeof id === 'number')
        .forEach(id => merged.add(id));
      return merged;
    });
  };

  const updateFollowStatus = (userId, isFollowing) => {
    const resolvedId = Number(userId);
    if (Number.isNaN(resolvedId)) return;

    setFollowingIds(prev => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.add(resolvedId);
        newSet.delete(-resolvedId);
      } else {
        newSet.delete(resolvedId);
        newSet.add(-resolvedId);
      }
      persistFollowingIds(newSet);
      return newSet;
    });
  };

  // Load persisted data (including negative sentinels)
  useEffect(() => {
    if (!user?.id) {
      setFollowingIds(new Set());
      return;
    }

    const loadPersistedFollowing = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.FOLLOWING_IDS(user.id));
        if (!stored) return;

        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFollowingIds(new Set(parsed.filter(id => typeof id === 'number')));
          console.log('✅ Loaded persisted following ids for user', user.id, parsed.length);
        }
      } catch (error) {
        console.error('❌ Failed to load persisted following ids:', error);
      }
    };

    loadPersistedFollowing();
  }, [user?.id]);

  // Fetch from server and merge while respecting local unfollows
  useEffect(() => {
    if (!user?.id) return;

    const fetchFollowingList = async () => {
      try {
        let next = `auth/users/${user.id}/following/?page_size=100`;
        const fetchedIds = [];

        while (next) {
          const res = await client.get(next);
          const data = res.data;
          const pageItems = Array.isArray(data) ? data : data.results || [];

          pageItems.forEach(item => {
            const id = item.user_id || item.id;
            if (typeof id === 'number') fetchedIds.push(id);
          });

          next = data.next || null;
        }

        // ✅ FIXED: Merge server data but respect explicit unfollows (-id)
        setFollowingIds(prev => {
          const newSet = new Set(prev);

          fetchedIds.forEach(id => {
            const negativeId = -id;
            // Only add positive ID if user didn't explicitly unfollow this session
            if (!newSet.has(negativeId)) {
              newSet.add(id);
              newSet.delete(negativeId);
            }
          });

          persistFollowingIds(newSet);
          console.log('✅ Merged server following list with', fetchedIds.length, 'items');
          return newSet;
        });
      } catch (error) {
        console.error('❌ Failed to initialize following list:', error);
      }
    };

    fetchFollowingList();
  }, [user?.id]);

  return (
    <FollowContext.Provider
      value={{ followingIds, updateFollowStatus, setInitialFollowing }}
    >
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => useContext(FollowContext);