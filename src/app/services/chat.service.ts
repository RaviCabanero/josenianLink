import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: any;
  type: 'text' | 'image' | 'file';
  read: boolean;
  imageUrl?: string;
  fileName?: string;
  fileUrl?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  participantData: { [key: string]: any };
  lastMessage?: Message;
  lastActivity: any;
  createdAt: any;
  unreadCounts: { [key: string]: number };
}

export interface ChatPreview {
  id: string;
  otherUser: any;
  lastMessage: any;
  unreadCount: number;
  participants: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(private firestore: AngularFirestore) {}

  /**
   * Create a new chat or get existing chat between two users
   */
  async createOrGetChat(userId1: string, userId2: string): Promise<string> {
    try {
      // Create a consistent chat ID based on user IDs
      const chatId = this.generateChatId(userId1, userId2);
      
      // Check if chat already exists
      const chatDoc = await this.firestore.collection('chats').doc(chatId).get().toPromise();
      
      if (!chatDoc?.exists) {
        // Get user data for both participants
        const [user1Doc, user2Doc] = await Promise.all([
          this.firestore.collection('users').doc(userId1).get().toPromise(),
          this.firestore.collection('users').doc(userId2).get().toPromise()
        ]);

        const user1Data = user1Doc?.data() || {};
        const user2Data = user2Doc?.data() || {};

        // Create new chat
        const newChat: Chat = {
          id: chatId,
          participants: [userId1, userId2],
          participantData: {
            [userId1]: user1Data,
            [userId2]: user2Data
          },
          lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          unreadCounts: {
            [userId1]: 0,
            [userId2]: 0
          }
        };

        await this.firestore.collection('chats').doc(chatId).set(newChat);
      }

      return chatId;
    } catch (error) {
      console.error('Error creating/getting chat:', error);
      throw error;
    }
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(
    chatId: string, 
    senderId: string, 
    text: string, 
    senderName: string,
    senderPhoto?: string,
    type: 'text' | 'image' | 'file' = 'text',
    imageUrl?: string,
    fileName?: string,
    fileUrl?: string
  ): Promise<void> {
    try {
      const message: Omit<Message, 'id'> = {
        text,
        senderId,
        senderName,
        senderPhoto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        type,
        read: false,
        imageUrl,
        fileName,
        fileUrl
      };

      // Add message to messages subcollection
      const messageRef = await this.firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(message);

      // Update chat with last message and increment unread count
      const chatRef = this.firestore.collection('chats').doc(chatId);
      const chatDoc = await chatRef.get().toPromise();
      
      if (chatDoc?.exists) {
        const chatData = chatDoc.data() as Chat;
        const otherUserId = chatData.participants.find(id => id !== senderId);
        
        const updates: any = {
          lastMessage: {
            id: messageRef.id,
            text,
            senderId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type
          },
          lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Increment unread count for the other user
        if (otherUserId) {
          updates[`unreadCounts.${otherUserId}`] = firebase.firestore.FieldValue.increment(1);
        }

        await chatRef.update(updates);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific chat
   */
  getChatMessages(chatId: string): Observable<Message[]> {
    return this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages', ref => ref.orderBy('timestamp', 'asc'))
      .valueChanges({ idField: 'id' }) as Observable<Message[]>;
  }

  /**
   * Get all chats for a user
   */
  getUserChats(userId: string): Observable<ChatPreview[]> {
    return this.firestore
      .collection('chats', ref => 
        ref.where('participants', 'array-contains', userId)
           .orderBy('lastActivity', 'desc')
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map((chats: any[]) => {
          return chats.map(chat => {
            const otherUserId = chat.participants.find((id: string) => id !== userId);
            const otherUser = chat.participantData?.[otherUserId] || {};
            
            return {
              id: chat.id,
              otherUser,
              lastMessage: chat.lastMessage,
              unreadCount: chat.unreadCounts?.[userId] || 0,
              participants: chat.participants
            } as ChatPreview;
          });
        })
      );
  }

  /**
   * Mark chat messages as read
   */
  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    try {
      const chatRef = this.firestore.collection('chats').doc(chatId);
      
      // Reset unread count for this user
      await chatRef.update({
        [`unreadCounts.${userId}`]: 0
      });

      // Mark unread messages as read
      const messagesSnapshot = await this.firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages', ref => 
          ref.where('senderId', '!=', userId)
             .where('read', '==', false)
        )
        .get()
        .toPromise();

      if (messagesSnapshot && !messagesSnapshot.empty) {
        const batch = this.firestore.firestore.batch();
        
        messagesSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
      throw error;
    }
  }

  /**
   * Get chat data
   */
  getChat(chatId: string): Observable<Chat> {
    return this.firestore
      .collection('chats')
      .doc(chatId)
      .valueChanges({ idField: 'id' }) as Observable<Chat>;
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<void> {
    try {
      // Delete all messages first
      const messagesSnapshot = await this.firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .get()
        .toPromise();

      if (messagesSnapshot && !messagesSnapshot.empty) {
        const batch = this.firestore.firestore.batch();
        messagesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // Delete the chat document
      await this.firestore.collection('chats').doc(chatId).delete();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  /**
   * Get total unread count for a user
   */
  getUserUnreadCount(userId: string): Observable<number> {
    return this.firestore
      .collection('chats', ref => 
        ref.where('participants', 'array-contains', userId)
      )
      .valueChanges()
      .pipe(
        map((chats: any[]) => {
          return chats.reduce((total, chat) => {
            return total + (chat.unreadCounts?.[userId] || 0);
          }, 0);
        })
      );
  }

  /**
   * Search for chats
   */
  searchChats(userId: string, query: string): Observable<ChatPreview[]> {
    return this.getUserChats(userId).pipe(
      map(chats => {
        const searchQuery = query.toLowerCase();
        return chats.filter(chat => 
          chat.otherUser?.fullName?.toLowerCase().includes(searchQuery) ||
          chat.otherUser?.name?.toLowerCase().includes(searchQuery) ||
          chat.lastMessage?.text?.toLowerCase().includes(searchQuery)
        );
      })
    );
  }

  /**
   * Generate consistent chat ID from two user IDs
   */
  private generateChatId(userId1: string, userId2: string): string {
    // Sort user IDs to ensure consistent chat ID regardless of order
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Update user online status
   */
  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.firestore.collection('users').doc(userId).update({
        isOnline,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }

  /**
   * Get online users
   */
  getOnlineUsers(excludeUserId?: string): Observable<any[]> {
    return this.firestore
      .collection('users', ref => {
        let query = ref.where('isOnline', '==', true);
        if (excludeUserId) {
          query = query.where('uid', '!=', excludeUserId);
        }
        return query;
      })
      .valueChanges();
  }
}