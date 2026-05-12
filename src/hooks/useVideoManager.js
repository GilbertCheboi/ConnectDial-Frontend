/**
 * hooks/useVideoManager.js – Custom hooks for video handling
 * Features:
 * • Video metadata parsing
 * • Streaming URL generation
 * • Quality selection logic
 * • Progress tracking
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/client';

/**
 * Hook: Track video playback progress
 */
export const useVideoProgress = (postId) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlaybackStatusUpdate = useCallback((status) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
    }
  }, []);

  return {
    progress,
    duration,
    isPlaying,
    handlePlaybackStatusUpdate,
  };
};

/**
 * Hook: Manage video quality
 */
export const useVideoQuality = () => {
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [availableQualities, setAvailableQualities] = useState(['720p']);

  const QUALITY_BITRATES = {
    '360p': { bitrate: '500k', resolution: '640x360' },
    '720p': { bitrate: '2500k', resolution: '1280x720' },
    '1080p': { bitrate: '5000k', resolution: '1920x1080' },
  };

  const getQualityUrl = useCallback((baseUrl, quality) => {
    if (!baseUrl) return null;

    // If using HLS playlist, add quality parameter
    if (baseUrl.includes('.m3u8')) {
      return `${baseUrl}?quality=${quality}`;
    }

    // For direct video files, append quality suffix
    const qualityMap = {
      '360p': '_360p.mp4',
      '720p': '_720p.mp4',
      '1080p': '_1080p.mp4',
    };

    return baseUrl.replace('.mp4', qualityMap[quality]);
  }, []);

  return {
    selectedQuality,
    setSelectedQuality,
    availableQualities,
    setAvailableQualities,
    getQualityUrl,
    QUALITY_BITRATES,
  };
};

/**
 * Hook: Manage video speed settings
 */
export const useVideoSpeed = () => {
  const [speed, setSpeed] = useState(1);

  const AVAILABLE_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const handleSpeedChange = useCallback((newSpeed) => {
    if (AVAILABLE_SPEEDS.includes(newSpeed)) {
      setSpeed(newSpeed);
      return true;
    }
    return false;
  }, []);

  return {
    speed,
    setSpeed,
    handleSpeedChange,
    AVAILABLE_SPEEDS,
  };
};

/**
 * Hook: Manage video upload with progress
 */
export const useVideoUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const abortControllerRef = useRef(new AbortController());

  const startUpload = useCallback(async (file, leagueId, options = {}) => {
    const {
      chunkSize = 1024 * 1024, // 1MB default
      onProgress = null,
      trimStart = 0,
      trimEnd = null,
      songId = null,
    } = options;

    try {
      setIsUploading(true);
      setUploadError(null);

      const fileSize = file.size;
      const chunks = Math.ceil(fileSize / chunkSize);
      setTotalChunks(chunks);

      // Step 1: Initialize
      const initResponse = await api.post('/api/posts/upload/init/', {
        league_id: leagueId,
        total_chunks: chunks,
        is_short: options.isShort || false,
      });

      const uploadId = initResponse.data.upload_id;
      const postId = initResponse.data.post_id;

      // Step 2: Upload chunks
      const fileData = await readFileAsArrayBuffer(file);
      for (let i = 0; i < chunks; i++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, fileData.byteLength);
        const chunk = fileData.slice(start, end);

        const formData = new FormData();
        formData.append('upload_id', uploadId);
        formData.append('chunk_index', i);
        formData.append('chunk', new Blob([chunk], { type: 'video/mp4' }), `chunk_${i}`);

        try {
          await api.post('/api/posts/upload/chunk/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            signal: abortControllerRef.current.signal,
          });

          const newUploaded = i + 1;
          setUploadedChunks(newUploaded);
          setUploadProgress((newUploaded / chunks) * 100);

          if (onProgress) {
            onProgress({ uploaded: newUploaded, total: chunks });
          }
        } catch (err) {
          if (err.message !== 'Upload cancelled') {
            // Retry logic for transient failures
            console.error(`Chunk ${i} failed:`, err);
            i--; // Retry same chunk
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }

      // Step 3: Finalize
      const finalizeResponse = await api.post('/api/posts/upload/finalize/', {
        upload_id: uploadId,
        song_id: songId,
        trim_start: trimStart,
        trim_end: trimEnd || null,
      });

      setIsUploading(false);
      return {
        success: true,
        uploadId,
        postId,
        status: finalizeResponse.data.status,
      };
    } catch (err) {
      if (err.message !== 'Upload cancelled') {
        setUploadError(err.message || 'Upload failed');
      }
      setIsUploading(false);
      return { success: false, error: err.message };
    }
  }, []);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current.abort();
    setIsUploading(false);
  }, []);

  const resetUpload = useCallback(() => {
    setUploadProgress(0);
    setUploadedChunks(0);
    setTotalChunks(0);
    setUploadError(null);
    abortControllerRef.current = new AbortController();
  }, []);

  return {
    uploadProgress,
    uploadedChunks,
    totalChunks,
    isUploading,
    uploadError,
    startUpload,
    cancelUpload,
    resetUpload,
  };
};

/**
 * Hook: Manage song selection
 */
export const useSongLibrary = () => {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  const searchSongs = useCallback(async (query) => {
    if (!query.trim()) {
      setSongs([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/api/songs/search/?q=${encodeURIComponent(query)}`);
      setSongs(response.data || []);
    } catch (err) {
      console.error('Song search error:', err);
      setSongs([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback((query) => {
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchSongs(query);
    }, 500);
  }, [searchSongs]);

  return {
    songs,
    selectedSong,
    setSelectedSong,
    isSearching,
    searchSongs: debouncedSearch,
  };
};

/**
 * Hook: Track video view
 */
export const useVideoView = () => {
  const [viewTracked, setViewTracked] = useState(new Set());
  const trackViewRef = useRef(false);

  const trackView = useCallback(async (postId) => {
    if (!viewTracked.has(postId) && !trackViewRef.current) {
      trackViewRef.current = true;
      try {
        await api.post(`/api/posts/${postId}/view/`);
        setViewTracked((prev) => new Set([...prev, postId]));
      } catch (err) {
        console.error('View tracking error:', err);
      }
      trackViewRef.current = false;
    }
  }, [viewTracked]);

  return {
    trackView,
    hasTrackedView: (postId) => viewTracked.has(postId),
  };
};

/**
 * Hook: Manage like state
 */
export const useVideoLike = (initialLiked = false, initialCount = 0) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const toggleLike = useCallback(async (postId) => {
    setIsLoading(true);
    try {
      const response = await api.post(`/api/posts/${postId}/like/`);
      setIsLiked(response.data.liked);
      setLikesCount(response.data.likes_count);
      return { liked: response.data.liked, count: response.data.likes_count };
    } catch (err) {
      console.error('Like error:', err);
      return { error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLiked,
    likesCount,
    isLoading,
    toggleLike,
  };
};

/**
 * Hook: Network detection
 */
export const useNetworkQuality = () => {
  const [networkQuality, setNetworkQuality] = useState('4g');

  useEffect(() => {
    // This is a placeholder; in real app, use NetInfo or similar
    // For now, default to 4g
    setNetworkQuality('4g');
  }, []);

  const getRecommendedQuality = useCallback(() => {
    const qualityMap = {
      'slow-2g': '360p',
      '2g': '360p',
      '3g': '720p',
      '4g': '1080p',
    };
    return qualityMap[networkQuality] || '720p';
  }, [networkQuality]);

  return {
    networkQuality,
    getRecommendedQuality,
  };
};

/**
 * Helper: Read file as ArrayBuffer
 */
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Hook: Video trimming
 */
export const useVideoTrimming = (initialDuration = 0) => {
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(initialDuration);

  const handleStartChange = useCallback((value) => {
    if (value < trimEnd) {
      setTrimStart(value);
    }
  }, [trimEnd]);

  const handleEndChange = useCallback((value) => {
    if (value > trimStart) {
      setTrimEnd(value);
    }
  }, [trimStart]);

  const getTrimDuration = useCallback(() => {
    return trimEnd - trimStart;
  }, [trimStart, trimEnd]);

  const resetTrim = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(initialDuration);
  }, [initialDuration]);

  return {
    trimStart,
    trimEnd,
    handleStartChange,
    handleEndChange,
    getTrimDuration,
    resetTrim,
  };
};

// Export all hooks
export default {
  useVideoProgress,
  useVideoQuality,
  useVideoSpeed,
  useVideoUpload,
  useSongLibrary,
  useVideoView,
  useVideoLike,
  useNetworkQuality,
  useVideoTrimming,
};