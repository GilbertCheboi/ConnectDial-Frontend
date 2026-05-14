/**
 * CommentsScreen.js - Display and manage post comments
 * ─────────────────────────────────────────────────────────────────────
 * FIXES in this version:
 * ✅ FIX #3: Emoji picker bar above comment input
 * ✅ FIX #3: postAuthorId was incorrectly set to postId — now correctly
 *            passed from fetched post data (post?.author_details?.id)
 * ✅ FIX #3: Data flattening hardened for both paginated & plain arrays
 * ✅ All existing features preserved (infinite scroll, edit, delete, etc.)
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useContext, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import CommentItem from '../components/CommentItem';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import api from '../api/client';

// ─────────────────────────────────────────────────────────────────────
// FIX #3: Emoji picker — common sports & reaction emojis
// ─────────────────────────────────────────────────────────────────────
const EMOJI_LIST = [
  '⚽', '🏀', '🏈', '🎾', '🏒', '🏆', '🥇', '🔥',
  '👏', '😂', '😍', '🤩', '😮', '😢', '😡', '💪',
  '❤️', '👍', '👎', '🙌', '🎉', '💯', '🤣', '😎',
];

export default function CommentsScreen({ route, navigation }) {
  const { postId } = route.params;
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        primary: '#1E90FF',
        subText: '#94A3B8',
        background: '#0D1F2D',
        text: '#F8FAFC',
        border: '#1E293B',
        card: '#112634',
      },
    },
  };

  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ─────────────────────────────────────────────────────────────────────
  // FIX #3: Fetch the post so we have the real author ID
  // ─────────────────────────────────────────────────────────────────────
  const { data: postData } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await api.get(`api/posts/${postId}/`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const postAuthorId = postData?.author_details?.id;

  // ─────────────────────────────────────────────────────────────────────
  // FETCH COMMENTS WITH PAGINATION
  // ─────────────────────────────────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam = 0 }) => {
      const url = `api/posts/${postId}/comments/?limit=20&offset=${pageParam}`;
      console.log('📝 Fetching comments from:', url);
      const response = await api.get(url);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Handle both paginated {count, results} and plain array responses
      if (lastPage?.count !== undefined) {
        const nextOffset = allPages.length * 20;
        return nextOffset < lastPage.count ? nextOffset : undefined;
      }
      // Plain array — no more pages
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  // ─────────────────────────────────────────────────────────────────────
  // AUTO-FETCH COMMENTS WHEN SCREEN OPENS
  // ─────────────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      console.log('💬 Comments screen focused - fetching comments');
      refetch();
    }, [refetch])
  );

  // ─────────────────────────────────────────────────────────────────────
  // FIX #3: Harden data flattening — handles both paginated and plain arrays
  // ─────────────────────────────────────────────────────────────────────
  const comments = data?.pages?.flatMap(page => {
    if (Array.isArray(page)) return page;
    if (Array.isArray(page?.results)) return page.results;
    return [];
  }) || [];

  // ─────────────────────────────────────────────────────────────────────
  // SUBMIT COMMENT (NEW OR EDIT)
  // ─────────────────────────────────────────────────────────────────────
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingComment) {
        await api.patch(`api/posts/comments/${editingComment.id}/`, {
          content: commentText,
        });
        console.log('✏️ Comment edited:', editingComment.id);
      } else {
        await api.post(`api/posts/${postId}/comments/`, {
          content: commentText,
        });
        console.log('➕ New comment posted to post:', postId);
      }

      setCommentText('');
      setEditingComment(null);
      setShowEmojiPicker(false);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      // Also invalidate the post so comment count updates in feed
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err) {
      console.error('❌ Error submitting comment:', err);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPress = (comment) => {
    setEditingComment(comment);
    setCommentText(comment.content);
    setShowEmojiPicker(false);
  };

  const handleDeleteSuccess = (commentId) => {
    console.log('🗑️ Comment deleted:', commentId);
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log('📜 Loading more comments');
      fetchNextPage();
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // FIX #3: Insert emoji at cursor (appends to end for simplicity)
  // ─────────────────────────────────────────────────────────────────────
  const handleEmojiSelect = (emoji) => {
    setCommentText(prev => prev + emoji);
  };

  // ─────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading && comments.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Comments</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────────────────
  if (error && comments.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Comments</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.subText} />
          <Text style={[styles.errorText, { color: theme.colors.subText, marginTop: 12 }]}>
            Failed to load comments
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // MAIN COMMENTS VIEW
  // ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Comments {comments.length > 0 && `(${comments.length})`}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* COMMENTS LIST */}
      <FlatList
        data={comments}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <CommentItem
            comment={item}
            // FIX #3: Use actual post author ID, not postId
            postAuthorId={postAuthorId}
            onDeleteSuccess={handleDeleteSuccess}
            onEditPress={handleEditPress}
          />
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="comment-outline" size={48} color={theme.colors.subText} />
            <Text style={[styles.emptyText, { color: theme.colors.subText, marginTop: 12 }]}>
              No comments yet. Be the first!
            </Text>
          </View>
        }
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        scrollEnabled={true}
      />

      {/* COMMENT INPUT FOOTER */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={[styles.inputContainer, { borderTopColor: theme.colors.border }]}>

          {/* Editing indicator */}
          {editingComment && (
            <View style={[styles.editingIndicator, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.editingText, { color: theme.colors.primary }]}>
                ✏️ Editing comment
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingComment(null);
                  setCommentText('');
                }}
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ─────────────────────────────────────────────────────────
              FIX #3: Emoji picker panel — shows when emoji btn tapped
              ───────────────────────────────────────────────────────── */}
          {showEmojiPicker && (
            <View style={[styles.emojiPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScroll}>
                {EMOJI_LIST.map((emoji, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.emojiBtn}
                    onPress={() => handleEmojiSelect(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputRow}>
            {/* Emoji toggle button */}
            <TouchableOpacity
              style={styles.emojiToggleBtn}
              onPress={() => setShowEmojiPicker(v => !v)}
            >
              <Text style={styles.emojiToggleText}>
                {showEmojiPicker ? '⌨️' : '😊'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.border,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Write a comment..."
              placeholderTextColor={theme.colors.subText}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              editable={!isSubmitting}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: isSubmitting || !commentText.trim() ? 0.5 : 1,
                },
              ]}
              onPress={handleSubmitComment}
              disabled={isSubmitting || !commentText.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons
                  name={editingComment ? 'check' : 'send'}
                  size={20}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.charCount, { color: theme.colors.subText }]}>
            {commentText.length}/500
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, fontWeight: '500' },
  loadingFooter: { paddingVertical: 20, alignItems: 'center' },
  inputContainer: { borderTopWidth: 0.5, paddingHorizontal: 12, paddingVertical: 12 },
  editingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  editingText: { fontSize: 12, fontWeight: '600' },

  // Emoji panel
  emojiPanel: {
    borderWidth: 0.5,
    borderRadius: 10,
    marginBottom: 8,
    paddingVertical: 6,
  },
  emojiScroll: { paddingHorizontal: 8 },
  emojiBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  emojiText: { fontSize: 22 },

  // Input row
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  emojiToggleBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  emojiToggleText: { fontSize: 22 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  charCount: { fontSize: 11, marginTop: 6, textAlign: 'right', fontWeight: '500' },
});