import React, { createContext, useState, useContext } from 'react';

const FollowContext = createContext();

export const FollowProvider = ({ children }) => {
  // A Set of user IDs that the logged-in user follows
  const [followingIds, setFollowingIds] = useState(new Set());

  // ✅ FIX: Merges incoming ids into the existing set instead of replacing it.
  // This prevents the Following tab and Global tab from wiping each other's data
  // when both call setInitialFollowing on load.
  const setInitialFollowing = ids => {
    setFollowingIds(prev => {
      const merged = new Set(prev);
      ids.forEach(id => merged.add(id));
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
        newSet.delete(-userId); // remove any unfollow sentinel
      } else {
        newSet.delete(userId);
        newSet.add(-userId);   // sentinel: explicitly unfollowed this session
      }
      return newSet;
    });
  };

  return (
    <FollowContext.Provider
      value={{ followingIds, updateFollowStatus, setInitialFollowing }}
    >
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => useContext(FollowContext);