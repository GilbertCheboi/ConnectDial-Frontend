import React, { createContext, useState, useContext } from 'react';

const FollowContext = createContext();

export const FollowProvider = ({ children }) => {
  // A Set of user IDs that the logged-in user follows
  const [followingIds, setFollowingIds] = useState(new Set());

  const setInitialFollowing = ids => setFollowingIds(new Set(ids));

  const updateFollowStatus = (userId, isFollowing) => {
    setFollowingIds(prev => {
      const newSet = new Set(prev);
      if (isFollowing) newSet.add(userId);
      else newSet.delete(userId);
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
