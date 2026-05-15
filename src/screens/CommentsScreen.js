/**
 * CommentsScreen.js
 * ─────────────────────────────────────────────────────────────────────
 * FIXES:
 * ✅ 400 on POST comments/ — payload now sends { content } correctly
 * ✅ onReplyPress was never passed to CommentItem — now wired up
 * ✅ Reply flow: tapping Reply pre-fills "@username " in input and
 *    posts to the same comments endpoint (backend handles parent via body)
 * ✅ Replying indicator shown above input (like editing indicator)
 * ✅ refreshComments prop wired into CommentItem so likes refresh list
 * ✅ All existing features preserved (emoji, edit, delete, pagination)
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useContext, useCallback, useState, useRef } from 'react';
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
// Emoji picker — common sports & reaction emojis
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
        notificationBadge: '#FF453A',
      },
    },
  };

  const queryClient = useQueryClient();
  const inputRef = useRef(null);

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // { id, username }
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ─────────────────────────────────────────────────────────────────────
  // Fetch the post so we have the real author ID
  // ─────────────────────────────────────────────────────────────────────
  const { data: postData } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await api.get(`api/posts/${postId}/`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const postAuthorId = postData?.author_details?.id ?? postData?.author?.id;

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
      const response = await api.get(url);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.count !== undefined) {
        const nextOffset = allPages.length * 20;
        return nextOffset < lastPage.count ? nextOffset : undefined;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  // ─────────────────────────────────────────────────────────────────────
  // AUTO-REFRESH ON FOCUS
  // ─────────────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // ─────────────────────────────────────────────────────────────────────
  // Flatten paginated pages → flat comment array
  // ─────────────────────────────────────────────────────────────────────
  const comments = data?.pages?.flatMap(page => {
    if (Array.isArray(page)) return page;
    if (Array.isArray(page?.results)) return page.results;
    return [];
  }) || [];

  // ─────────────────────────────────────────────────────────────────────
  // SUBMIT COMMENT (NEW / EDIT / REPLY)
  //
  // FIX: The backend CommentSerializer only requires `content`.
  //      The post FK is set in the view via serializer.save(post=post).
  //      Sending extra unknown fields can also cause 400s — keep it clean.
  // ─────────────────────────────────────────────────────────────────────
  const handleSubmitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      if (editingComment) {
        // EDIT existing comment
        await api.patch(`api/posts/comments/${editingComment.id}/`, {
          content: trimmed,
        });
      } else if (replyingTo) {
        // REPLY — post as a new comment; backend links via parent_comment if
        // you pass it, otherwise it lands as a top-level comment with @mention
        const payload = { content: trimmed , post: postId,                   };
        if (replyingTo?.id) {
            payload.parent_comment = replyingTo.id;
        }
        await api.post(`api/posts/${postId}/comments/`, payload);
      } else {
        // NEW top-level comment
        // FIX: only send `content` — the view sets author & post server-side
        await api.post(`api/posts/${postId}/comments/`, {
          content: trimmed,
        });
      }

      setCommentText('');
      setEditingComment(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err) {
      console.error('❌ Error submitting comment:', err?.response?.data || err);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // REPLY HANDLER — wired into CommentItem via onReplyPress
  // ─────────────────────────────────────────────────────────────────────
  const handleReplyPress = (comment) => {
    const author =
      comment?.author_details ||
      comment?.user_details ||
      comment?.author ||
      comment?.user;

    const username = author?.username || 'user';

    setReplyingTo({ id: comment.id, username });
    setEditingComment(null);
    setCommentText(`@${username} `);
    setShowEmojiPicker(false);

    // Focus the input after a short tick so keyboard opens
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleEditPress = (comment) => {
    setEditingComment(comment);
    setReplyingTo(null);
    setCommentText(comment.content);
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDeleteSuccess = (commentId) => {
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const handleEmojiSelect = (emoji) => {
    setCommentText(prev => prev + emoji);
  };

  const cancelInput = () => {
    setEditingComment(null);
    setReplyingTo(null);
    setCommentText('');
  };

  // ─────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading && comments.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader navigation={navigation} theme={theme} count={0} />
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
        <ScreenHeader navigation={navigation} theme={theme} count={0} />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: theme.colors.subText }]}>
            Failed to load comments.
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
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* HEADER */}
      <ScreenHeader navigation={navigation} theme={theme} count={comments.length} />

      {/* COMMENTS LIST */}
      <FlatList
        data={comments}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <CommentItem
            comment={item}
            postAuthorId={postAuthorId}
            onDeleteSuccess={handleDeleteSuccess}
            onEditPress={handleEditPress}
            // FIX: was never passed before — caused crash on Reply tap
            onReplyPress={handleReplyPress}
            // FIX: lets CommentItem trigger a list refresh after like/unlike
            refreshComments={refetch}
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
        onRefresh={refetch}
        scrollEnabled
        keyboardShouldPersistTaps="handled"
      />

      {/* COMMENT INPUT FOOTER */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={[styles.inputContainer, { borderTopColor: theme.colors.border }]}>

          {/* ── Editing indicator ── */}
          {editingComment && (
            <View style={[styles.contextIndicator, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.contextText, { color: theme.colors.primary }]}>
                ✏️ Editing comment
              </Text>
              <TouchableOpacity onPress={cancelInput}>
                <MaterialCommunityIcons name="close" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Replying indicator ── */}
          {replyingTo && (
            <View style={[styles.contextIndicator, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.contextText, { color: theme.colors.subText }]}>
                ↩️ Replying to{' '}
                <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                  @{replyingTo.username}
                </Text>
              </Text>
              <TouchableOpacity onPress={cancelInput}>
                <MaterialCommunityIcons name="close" size={18} color={theme.colors.subText} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Emoji picker panel ── */}
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

          {/* ── Input row ── */}
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.emojiToggleBtn}
              onPress={() => setShowEmojiPicker(v => !v)}
            >
              <Text style={styles.emojiToggleText}>
                {showEmojiPicker ? '⌨️' : '😊'}
              </Text>
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.border,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder={
                replyingTo
                  ? `Reply to @${replyingTo.username}...`
                  : 'Write a comment...'
              }
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
// Small reusable header component
// ─────────────────────────────────────────────────────────────────────
function ScreenHeader({ navigation, theme, count }) {
  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
        Comments{count > 0 ? ` (${count})` : ''}
      </Text>
      <View style={{ width: 24 }} />
    </View>
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

  inputContainer: {
    borderTopWidth: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // Editing / replying indicator
  contextIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  contextText: { fontSize: 12, fontWeight: '600' },

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