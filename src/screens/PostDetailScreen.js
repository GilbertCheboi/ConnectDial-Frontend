import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api/client';
import PostCard from '../components/PostCard';
import CommentItem from '../components/CommentItem';

export default function PostDetailScreen({ route }) {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);

  // Mentions State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Replace with real user search API call in production
  const mockUsers = [
    { id: 1, handle: 'gilly', name: 'Gilly' },
    { id: 2, handle: 'messi10', name: 'Leo Messi' },
    { id: 3, handle: 'cr7', name: 'Ronaldo' },
  ];

  useEffect(() => {
    fetchData();
  }, [postId]);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`api/posts/${postId}/`),
        api.get(`api/posts/${postId}/comments/`),
      ]);
      setPost(pRes.data);
      setComments(cRes.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = text => {
    setNewComment(text);
    const lastWord = text.split(' ').pop();
    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1).toLowerCase();
      const filtered = mockUsers.filter(u => u.handle.includes(query));
      setFilteredUsers(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectUser = user => {
    const words = newComment.split(' ');
    words.pop();
    setNewComment([...words, `@${user.handle} `].join(' '));
    setShowSuggestions(false);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingComment) {
        const res = await api.patch(
          `api/posts/comments/${editingComment.id}/`,
          {
            content: newComment,
          },
        );
        setComments(prev =>
          prev.map(c => (c.id === editingComment.id ? res.data : c)),
        );
        setEditingComment(null);
      } else {
        const res = await api.post(`api/posts/${postId}/comments/`, {
          content: newComment,
        });
        setComments(prev => [res.data, ...prev]);
        setPost(prev => ({
          ...prev,
          comments_count: (prev.comments_count || 0) + 1,
        }));
      }
      setNewComment('');
    } catch (e) {
      console.log(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={95}
      >
        <FlatList
          data={comments}
          keyExtractor={item => item.id.toString()}
          ListHeaderComponent={() => post && <PostCard post={post} />}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              postAuthorId={post?.author_details?.id}
              onDeleteSuccess={id =>
                setComments(prev => prev.filter(c => c.id !== id))
              }
              onEditPress={c => {
                setEditingComment(c);
                setNewComment(c.content);
              }}
            />
          )}
        />

        {/* 🚀 MENTION SUGGESTIONS OVERLAY */}
        {showSuggestions && (
          <View style={styles.suggestions}>
            {filteredUsers.map(user => (
              <TouchableOpacity
                key={user.id}
                style={styles.sugItem}
                onPress={() => selectUser(user)}
              >
                <Text style={styles.sugText}>@{user.handle}</Text>
                <Text style={styles.sugSubText}>{user.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            value={newComment}
            onChangeText={handleInputChange}
            placeholder="Write a comment..."
            placeholderTextColor="#94A3B8"
            multiline
          />
          <TouchableOpacity onPress={handleSendComment} style={styles.sendBtn}>
            <MaterialCommunityIcons
              name={editingComment ? 'check' : 'send'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1F2D',
  },
  suggestions: {
    backgroundColor: '#1A2A3D',
    borderTopWidth: 1,
    borderTopColor: '#1E90FF40',
  },
  sugItem: {
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sugText: { color: '#1E90FF', fontWeight: 'bold' },
  sugSubText: { color: '#94A3B8', fontSize: 12 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1A2A3D',
  },
  input: {
    flex: 1,
    backgroundColor: '#0D1F2D',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#1E90FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
