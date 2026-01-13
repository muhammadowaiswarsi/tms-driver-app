import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "react-native-elements";
import DriverLayout from "../../src/components/common/DriverLayout";
import { useAuth } from "../../src/hooks/useAuth";
import { useAllDriversByCompany } from "../../src/hooks/useDrivers";
import {
  useCreateConservation,
  useGetConversations,
  useGetMessages,
  useSendMessage,
} from "../../src/hooks/useMessaging";
import { useWebSocketMessaging } from "../../src/hooks/useWebSocketMessaging";
import { queryKeys } from "../../src/lib/react-query";
import { driverTheme } from "../../src/theme/driverTheme";

interface Conversation {
  id: string | number;
  otherParticipant: {
    name: string;
    email?: string;
  };
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface Message {
  id: string | number;
  content: string;
  sentAt: string;
  isFromMe: boolean;
}

interface User {
  id: string | number;
  name: string;
  email?: string;
}

const Messages: React.FC = () => {
  const router = useRouter();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [openNewMessageDialog, setOpenNewMessageDialog] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<FlatList>(null);
  const { authState } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: messagesResponse,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useGetMessages(selectedConversation?.id, {});

  const {
    data: conversationsResponse,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useGetConversations({
    search: searchTerm,
    limit: 100,
  });

  // WebSocket connection for real-time messaging
  const {
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage: sendWebSocketMessage,
    sendTyping,
    markMessagesAsRead,
  } = useWebSocketMessaging({
    onNewMessage: (newMessage: any) => {
      // Update messages cache
      if (selectedConversation && newMessage.conversationId === selectedConversation.id) {
        const queryKey = queryKeys.messaging.conversationMessagesList(
          selectedConversation.id,
          {}
        );
        const currentData = queryClient.getQueryData(queryKey);
        if (currentData && (currentData as any).data) {
          // Check if message already exists to avoid duplicates
          const messageExists = (currentData as any).data.some(
            (msg: any) => msg.id === newMessage.id
          );
          if (!messageExists) {
            queryClient.setQueryData(queryKey, {
              ...currentData,
              data: [
                ...(currentData as any).data,
                {
                  ...newMessage,
                  isFromMe: newMessage.senderId === authState?.userData?.id,
                },
              ],
            });
          }
        } else {
          // If no cache, refetch
          refetchMessages();
        }
      }
      // Update conversations list to show new message preview
      refetchConversations();
    },
    onMessageSent: (sentMessage: any) => {
      // Update messages cache with sent message
      if (selectedConversation && sentMessage.conversationId === selectedConversation.id) {
        const queryKey = queryKeys.messaging.conversationMessagesList(
          selectedConversation.id,
          {}
        );
        const currentData = queryClient.getQueryData(queryKey);
        if (currentData && (currentData as any).data) {
          const messageExists = (currentData as any).data.some(
            (msg: any) => msg.id === sentMessage.id
          );
          if (!messageExists) {
            queryClient.setQueryData(queryKey, {
              ...currentData,
              data: [...(currentData as any).data, { ...sentMessage, isFromMe: true }],
            });
          }
        } else {
          refetchMessages();
        }
      }
      refetchConversations();
    },
    onUserTyping: (data: { conversationId: string | number; userId: string | number; isTyping: boolean }) => {
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setTypingUsers((prev) => ({
          ...prev,
          [String(data.userId)]: data.isTyping,
        }));
        // Clear typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUsers((prev) => ({
              ...prev,
              [String(data.userId)]: false,
            }));
          }, 3000);
        }
      }
    },
    onMessagesRead: (data: { conversationId: string | number; messageIds: (string | number)[] }) => {
      // Update message status to read in cache
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        const queryKey = queryKeys.messaging.conversationMessagesList(
          selectedConversation.id,
          {}
        );
        const currentData = queryClient.getQueryData(queryKey);
        if (currentData && (currentData as any).data) {
          const updatedData = (currentData as any).data.map((msg: any) => {
            if (data.messageIds.includes(msg.id)) {
              return { ...msg, status: "READ" };
            }
            return msg;
          });
          queryClient.setQueryData(queryKey, {
            ...currentData,
            data: updatedData,
          });
        }
      }
      // Refetch conversations to update unread count
      refetchConversations();
    },
    enabled: !!authState?.isAuthenticated,
  });

  const { data: usersResponse, isLoading: usersLoading } =
    useAllDriversByCompany(
      authState?.userData?.companyId || authState?.userData?.company?.id,
      {
        search: userSearchTerm,
      }
    );

  const createConversation = useCreateConservation({
    onSuccess: (data: any) => {
      refetchConversations();
      setOpenNewMessageDialog(false);
      setSelectedUser(null);
      setUserSearchTerm("");
      if (data?.data) {
        setSelectedConversation(data.data);
      }
    },
  });

  const sendMessageMutation = useSendMessage({
    onSuccess: () => {
      refetchMessages();
      refetchConversations();
      setMessage("");
    },
  });

  const messages: Message[] = messagesResponse?.data || [];
  const conversations: Conversation[] = conversationsResponse?.data || [];
  const companyUsers: User[] = usersResponse?.data || [];

  // Refetch messages when conversation is selected (web code behavior)
  useEffect(() => {
    if (selectedConversation?.id) {
      refetchMessages();
    }
  }, [selectedConversation?.id, refetchMessages]);

  // Join conversation room when conversation is selected
  useEffect(() => {
    if (selectedConversation?.id && isConnected) {
      joinConversation(selectedConversation.id);
    }

    return () => {
      if (selectedConversation?.id && isConnected) {
        leaveConversation(selectedConversation.id);
      }
    };
  }, [
    selectedConversation?.id,
    isConnected,
    joinConversation,
    leaveConversation,
  ]);

  // Mark all unread messages as read when opening conversation and messages are loaded
  useEffect(() => {
    if (selectedConversation?.id && isConnected && messages.length > 0) {
      const unreadMessages = messages.filter(
        (msg: any) => !msg.isFromMe && msg.status !== "READ"
      );
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg: any) => msg.id);
        markMessagesAsRead(selectedConversation.id, messageIds);
      }
    }
  }, [
    selectedConversation?.id,
    isConnected,
    markMessagesAsRead,
    messages,
  ]);

  // Auto scroll to last message
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleBackClick = () => {
    if (selectedConversation) {
      setSelectedConversation(null);
    } else {
      router.push("/(tabs)/loads");
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = () => {
    if (message.trim() && selectedConversation) {
      // Use WebSocket if connected, otherwise fallback to REST API
      if (isConnected) {
        sendWebSocketMessage({
          conversationId: selectedConversation.id,
          content: message.trim(),
          type: "TEXT",
        });
        setMessage("");
      } else {
        // Fallback to REST API only if WebSocket is not connected
        sendMessageMutation.mutate({
          conversationId: selectedConversation.id,
          content: message.trim(),
          type: "TEXT",
        });
      }
    }
  };

  // Handle typing indicator
  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (selectedConversation?.id && isConnected) {
        sendTyping(selectedConversation.id, isTyping);
      }
    },
    [selectedConversation?.id, isConnected, sendTyping]
  );

  // Update typing indicator when message input changes
  useEffect(() => {
    if (!selectedConversation?.id || !isConnected) {
      return;
    }

    if (message.trim()) {
      handleTyping(true);

      // Clear typing after user stops typing for 1 second
      const timeout = setTimeout(() => {
        handleTyping(false);
      }, 1000);

      return () => {
        clearTimeout(timeout);
        handleTyping(false);
      };
    } else {
      handleTyping(false);
    }
  }, [message, selectedConversation?.id, isConnected, handleTyping]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleCreateConversation = () => {
    if (selectedUser) {
      createConversation.mutate({
        participantId: selectedUser.id,
      });
    }
  };

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "a day ago";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getInitials = (name: string) => {
    if (!name) return "?";

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    const firstInitial = parts[0].charAt(0);
    const lastInitial = parts[parts.length - 1].charAt(0);

    return (firstInitial + lastInitial).toUpperCase();
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(item.otherParticipant.name)}
          </Text>
        </View>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.otherParticipant.name}
          </Text>
          <View style={styles.conversationHeaderRight}>
            {item.lastMessageAt && (
              <Text style={styles.conversationTime}>
                {formatMessageTime(item.lastMessageAt)}
              </Text>
            )}
            {item.unreadCount && item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            {item.lastMessagePreview || "No messages yet"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isFromMe
          ? styles.messageContainerRight
          : styles.messageContainerLeft,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.isFromMe ? styles.messageBubbleRight : styles.messageBubbleLeft,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.isFromMe ? styles.messageTextRight : styles.messageTextLeft,
          ]}
        >
          {item.content}
        </Text>
        <Text
          style={[
            styles.messageTime,
            item.isFromMe ? styles.messageTimeRight : styles.messageTimeLeft,
          ]}
        >
          {formatMessageTime(item.sentAt)}
        </Text>
      </View>
    </View>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedUser?.id === item.id && styles.userItemSelected,
      ]}
      onPress={() => handleUserSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
      </View>
      <View style={styles.userContent}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
      </View>
      {selectedUser?.id === item.id && (
        <Icon
          name="check"
          type="material"
          color={driverTheme.colors.primary.main}
          size={24}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <DriverLayout
      title={
        selectedConversation
          ? `${selectedConversation.otherParticipant.name}${isConnected ? " ●" : ""}`
          : "Messages"
      }
      showBackButton
      onBackClick={handleBackClick}
      currentTab="messages"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Floating Action Button for New Message */}
        {/* {!selectedConversation && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setOpenNewMessageDialog(true)}
            activeOpacity={0.8}
          >
            <Icon name="add" type="material" color="#fff" size={28} />
          </TouchableOpacity>
        )} */}

        {/* New Message Dialog */}
        <Modal
          visible={openNewMessageDialog}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setOpenNewMessageDialog(false);
            setSelectedUser(null);
            setUserSearchTerm("");
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setOpenNewMessageDialog(false);
                  setSelectedUser(null);
                  setUserSearchTerm("");
                }}
                style={styles.modalBackButton}
              >
                <Icon name="arrow-back" type="material" size={24} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Message</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <View style={styles.modalSearchContainer}>
              <Icon
                name="search"
                type="material"
                size={20}
                color={driverTheme.colors.text.secondary}
              />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search company users..."
                value={userSearchTerm}
                onChangeText={setUserSearchTerm}
                placeholderTextColor={driverTheme.colors.text.secondary}
              />
            </View>

            {usersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={driverTheme.colors.primary.main}
                />
              </View>
            ) : companyUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : (
              <FlatList
                data={companyUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => String(item.id)}
                style={styles.usersList}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  (!selectedUser || createConversation.isPending) &&
                    styles.modalButtonDisabled,
                ]}
                onPress={handleCreateConversation}
                disabled={!selectedUser || createConversation.isPending}
              >
                {createConversation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Start Conversation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {!selectedConversation ? (
          <View style={styles.conversationsContainer}>
            {/* Search */}
            {/* <View style={styles.searchContainer}>
              <Icon
                name="search"
                type="material"
                size={20}
                color={driverTheme.colors.text.secondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor={driverTheme.colors.text.secondary}
              />
            </View> */}

            {isLoadingConversations ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={driverTheme.colors.primary.main}
                />
              </View>
            ) : conversations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon
                  name="chat-bubble-outline"
                  type="material"
                  size={64}
                  color={driverTheme.colors.text.secondary}
                />
                <Text style={styles.emptyTitle}>No messages yet</Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                renderItem={renderConversationItem}
                keyExtractor={(item) => String(item.id)}
                style={styles.conversationsList}
                contentContainerStyle={styles.conversationsListContent}
              />
            )}
          </View>
        ) : (
          // Chat View
          <View style={styles.chatContainer}>
            {/* Messages Area */}
            {isLoadingMessages ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={driverTheme.colors.primary.main}
                />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No messages yet. Start the conversation!
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  ref={messagesEndRef}
                  data={messages}
                  renderItem={renderMessageItem}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesListContent}
                  onContentSizeChange={() => {
                    messagesEndRef.current?.scrollToEnd({ animated: true });
                  }}
                />
                {/* Typing indicator */}
                {Object.entries(typingUsers).some(
                  ([_, isTyping]) => isTyping
                ) && selectedConversation && (
                  <View style={styles.typingContainer}>
                    <View style={styles.typingBubble}>
                      <Text style={styles.typingText}>
                        {selectedConversation.otherParticipant.name} is typing...
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Message Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                value={message}
                onChangeText={setMessage}
                multiline
                placeholderTextColor={driverTheme.colors.text.secondary}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!message.trim() || sendMessageMutation.isPending) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="send" type="material" color="#fff" size={20} />
                )}
              </TouchableOpacity>
            </View>
      </View>
        )}
      </KeyboardAvoidingView>
    </DriverLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: driverTheme.colors.background.default,
  },
  conversationsContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: driverTheme.colors.background.paper,
    margin: driverTheme.spacing.md,
    paddingHorizontal: driverTheme.spacing.md,
    borderRadius: driverTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
  },
  searchInput: {
    flex: 1,
    paddingVertical: driverTheme.spacing.sm,
    paddingHorizontal: driverTheme.spacing.sm,
    fontSize: 16,
    color: driverTheme.colors.text.primary,
  },
  conversationsList: {
    flex: 1,
  },
  conversationsListContent: {
    padding: driverTheme.spacing.sm,
  },
  conversationItem: {
    flexDirection: "row",
    padding: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
    backgroundColor: driverTheme.colors.background.paper,
    borderRadius: driverTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
  },
  avatarContainer: {
    marginRight: driverTheme.spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: driverTheme.colors.primary.main,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: driverTheme.spacing.xs,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
    flex: 1,
  },
  conversationHeaderRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  conversationTime: {
    fontSize: 12,
    color: driverTheme.colors.text.secondary,
    marginBottom: driverTheme.spacing.xs,
  },
  conversationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conversationPreview: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: driverTheme.colors.primary.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    backgroundColor: driverTheme.colors.background.default,
  },
  messagesListContent: {
    padding: driverTheme.spacing.md,
  },
  messageContainer: {
    marginBottom: driverTheme.spacing.sm,
  },
  messageContainerLeft: {
    alignItems: "flex-start",
  },
  messageContainerRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: driverTheme.spacing.md,
    borderRadius: driverTheme.borderRadius.md,
  },
  messageBubbleLeft: {
    backgroundColor: driverTheme.colors.background.paper,
    borderTopLeftRadius: 4,
    borderTopRightRadius: driverTheme.borderRadius.xl,
  },
  messageBubbleRight: {
    backgroundColor: driverTheme.colors.primary.main,
    borderTopLeftRadius: driverTheme.borderRadius.xl,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: driverTheme.colors.text.primary,
  },
  messageTextRight: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 11,
    marginTop: driverTheme.spacing.xs,
    opacity: 0.7,
  },
  messageTimeLeft: {
    color: driverTheme.colors.text.secondary,
  },
  messageTimeRight: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: driverTheme.colors.divider,
  },
  messageInput: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: driverTheme.spacing.sm,
    paddingHorizontal: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.grey[100],
    borderRadius: driverTheme.borderRadius.lg,
    fontSize: 16,
    color: driverTheme.colors.text.primary,
    marginRight: driverTheme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: driverTheme.colors.primary.main,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: driverTheme.colors.grey[400],
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: driverTheme.spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: driverTheme.colors.primary.main,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: driverTheme.colors.background.default,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: driverTheme.colors.divider,
  },
  modalBackButton: {
    marginRight: driverTheme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
    flex: 1,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: driverTheme.colors.background.paper,
    margin: driverTheme.spacing.md,
    paddingHorizontal: driverTheme.spacing.md,
    borderRadius: driverTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: driverTheme.spacing.sm,
    paddingHorizontal: driverTheme.spacing.sm,
    fontSize: 16,
    color: driverTheme.colors.text.primary,
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: driverTheme.spacing.md,
    marginHorizontal: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
    backgroundColor: driverTheme.colors.background.paper,
    borderRadius: driverTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: driverTheme.colors.divider,
  },
  userItemSelected: {
    backgroundColor: driverTheme.colors.primary.light,
    borderColor: driverTheme.colors.primary.main,
  },
  userContent: {
    flex: 1,
    marginLeft: driverTheme.spacing.md,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: driverTheme.colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
    marginTop: driverTheme.spacing.xs,
  },
  modalFooter: {
    padding: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: driverTheme.colors.divider,
  },
  modalButton: {
    backgroundColor: driverTheme.colors.primary.main,
    paddingVertical: driverTheme.spacing.md,
    borderRadius: driverTheme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonDisabled: {
    backgroundColor: driverTheme.colors.grey[400],
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: driverTheme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: driverTheme.colors.text.secondary,
    marginTop: driverTheme.spacing.md,
    marginBottom: driverTheme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: driverTheme.colors.text.disabled,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: driverTheme.colors.text.secondary,
    textAlign: "center",
    fontWeight: "600",
  },
  typingContainer: {
    paddingHorizontal: driverTheme.spacing.md,
    paddingBottom: driverTheme.spacing.sm,
    alignItems: "flex-start",
  },
  typingBubble: {
    backgroundColor: driverTheme.colors.background.paper,
    padding: driverTheme.spacing.md,
    borderRadius: driverTheme.borderRadius.md,
    borderTopLeftRadius: 4,
    borderTopRightRadius: driverTheme.borderRadius.xl,
    maxWidth: "75%",
  },
  typingText: {
    fontSize: 14,
    fontStyle: "italic",
    color: driverTheme.colors.text.secondary,
  },
});

export default Messages;
