import React, { createContext, useState, useContext, useEffect } from 'react';
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

  const persistFollowingIds = async idsSet => {
    if (!user?.id) return;
    const ids = [...idsSet].filter(id => typeof id === 'number' && id > 0);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWING_IDS(user.id), JSON.stringify(ids));
    } catch (error) {
      console.error('❌ Failed to persist following ids:', error);
    }
  };

  // ✅ FIX: Merges incoming ids into the existing set instead of replacing it.
  // This prevents the Following tab and Global tab from wiping each other's data
  // when both call setInitialFollowing on load.
  const setInitialFollowing = ids => {
    setFollowingIds(prev => {
      const merged = new Set(prev);
      ids
        .filter(id => typeof id === 'number' && id > 0)
        .forEach(id => merged.add(id));
      return merged;
    });
  };

  // updateFollowStatus(id, true)  → adds id to the set (following)
  // updateFollowStatus(id, false) → removes id, adds -id as an "explicitly
  //   unfollowed" sentinel so PostCard knows the user manually unfollowed
  //   this session (prevents falling back to stale server value).
  const updateFollowStatus = (userId, isFollowing) => {
    setFollowingIds(prev => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.add(userId);
        newSet.delete(-userId);
      } else {
        newSet.delete(userId);
        newSet.add(-userId);
      }
      persistFollowingIds(newSet);
      return newSet;
    });
  };

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
          setFollowingIds(new Set(parsed.filter(id => typeof id === 'number' && id > 0)));
          console.log('✅ Loaded persisted following ids for user', user.id, parsed.length);
        }
      } catch (error) {
        console.error('❌ Failed to load persisted following ids:', error);
      }
    };

    loadPersistedFollowing();
  }, [user?.id]);

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

        setInitialFollowing(fetchedIds);
        persistFollowingIds(new Set(fetchedIds));
        console.log('✅ FollowContext initialized with', fetchedIds.length, 'following relationships');
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