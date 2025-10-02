import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service';
import { ChatService } from '../services/chat.service';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

export interface ChatPreview {
  id: string;
  otherUser: any;
  lastMessage: any;
  unreadCount: number;
  participants: string[];
}

@Component({
  selector: 'app-messages',
  templateUrl: './messages.page.html',
  styleUrls: ['./messages.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class MessagesPage implements OnInit, OnDestroy {
  currentUserId: string = '';
  activeTab: string = 'chats';
  searchQuery: string = '';
  userSearchQuery: string = '';
  
  chats: ChatPreview[] = [];
  filteredChats: ChatPreview[] = [];
  onlineUsers: any[] = [];
  filteredOnlineUsers: any[] = [];
  searchResults: any[] = [];
  
  loadingChats: boolean = false;
  showNewChatModal: boolean = false;
  
  private subscriptions: Subscription[] = [];
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private firestore = inject(AngularFirestore);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);

  constructor() {}

  async ngOnInit() {
    await this.initializeComponent();
    this.loadChats();
    this.loadOnlineUsers();
    this.handleQueryParams();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async initializeComponent() {
    try {
      const user = await this.authService.getCurrentUser();
      this.currentUserId = user?.uid || '';
    } catch (error) {
      console.error('Error initializing messages component:', error);
    }
  }

  private handleQueryParams() {
    // Handle direct navigation to chat with specific user
    this.route.queryParams.subscribe(params => {
      if (params['userId']) {
        this.startChatWithUserId(params['userId']);
      }
    });
  }

  async loadChats() {
    if (!this.currentUserId) return;
    
    this.loadingChats = true;
    
    try {
      const chatsSubscription = this.chatService.getUserChats(this.currentUserId)
        .subscribe(
          (chats: ChatPreview[]) => {
            this.chats = chats;
            this.filterChats();
            this.loadingChats = false;
          },
          (error: any) => {
            console.error('Error loading chats:', error);
            this.loadingChats = false;
          }
        );
      
      this.subscriptions.push(chatsSubscription);
    } catch (error) {
      console.error('Error setting up chats subscription:', error);
      this.loadingChats = false;
    }
  }

  async loadOnlineUsers() {
    try {
      const onlineSubscription = this.firestore.collection('users', ref => 
        ref.where('isOnline', '==', true)
           .where('uid', '!=', this.currentUserId)
      ).valueChanges().subscribe(
        users => {
          this.onlineUsers = users as any[];
          this.filterOnlineUsers();
        },
        error => {
          console.error('Error loading online users:', error);
        }
      );
      
      this.subscriptions.push(onlineSubscription);
    } catch (error) {
      console.error('Error setting up online users subscription:', error);
    }
  }

  onTabChange() {
    if (this.activeTab === 'online') {
      this.loadOnlineUsers();
    }
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value;
    if (this.activeTab === 'chats') {
      this.filterChats();
    } else {
      this.filterOnlineUsers();
    }
  }

  filterChats() {
    if (!this.searchQuery.trim()) {
      this.filteredChats = [...this.chats];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredChats = this.chats.filter(chat => 
        chat.otherUser?.fullName?.toLowerCase().includes(query) ||
        chat.otherUser?.name?.toLowerCase().includes(query) ||
        chat.lastMessage?.text?.toLowerCase().includes(query)
      );
    }
  }

  filterOnlineUsers() {
    if (!this.searchQuery.trim()) {
      this.filteredOnlineUsers = [...this.onlineUsers];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredOnlineUsers = this.onlineUsers.filter(user => 
        user.fullName?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.program?.toLowerCase().includes(query)
      );
    }
  }

  async searchUsers(event: any) {
    const query = event.detail.value;
    this.userSearchQuery = query;
    
    if (!query.trim()) {
      this.searchResults = [];
      return;
    }

    try {
      const searchQuery = query.toLowerCase();
      
      // Search in users collection
      const usersSnapshot = await this.firestore.collection('users', ref => 
        ref.where('uid', '!=', this.currentUserId)
           .limit(20)
      ).get().toPromise();

      const users = usersSnapshot?.docs.map(doc => doc.data()) || [];
      
      // Filter results based on name
      this.searchResults = users.filter((user: any) => 
        user.fullName?.toLowerCase().includes(searchQuery) ||
        user.name?.toLowerCase().includes(searchQuery) ||
        user.email?.toLowerCase().includes(searchQuery) ||
        user.program?.toLowerCase().includes(searchQuery)
      );
      
    } catch (error) {
      console.error('Error searching users:', error);
      this.searchResults = [];
    }
  }

  async openChat(chat: ChatPreview) {
    // Mark messages as read
    await this.chatService.markChatAsRead(chat.id, this.currentUserId);
    
    // Navigate to chat conversation
    this.router.navigate(['/chat', chat.id], {
      queryParams: {
        otherUserId: chat.otherUser.uid,
        otherUserName: chat.otherUser.fullName || chat.otherUser.name
      }
    });
  }

  async startChatWithUser(user: any) {
    try {
      const chatId = await this.chatService.createOrGetChat(this.currentUserId, user.uid);
      
      this.router.navigate(['/chat', chatId], {
        queryParams: {
          otherUserId: user.uid,
          otherUserName: user.fullName || user.name
        }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  }

  private async startChatWithUserId(userId: string) {
    try {
      // Get user info first
      const userDoc = await this.firestore.collection('users').doc(userId).get().toPromise();
      if (userDoc && userDoc.exists) {
        const userData = userDoc.data();
        await this.startChatWithUser(userData);
      }
    } catch (error) {
      console.error('Error starting chat with user ID:', error);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.some(user => user.uid === userId);
  }

  getTotalUnreadCount(): number {
    return this.chats.reduce((total, chat) => total + chat.unreadCount, 0);
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString();
  }

  onImageError(event: any) {
    event.target.src = 'assets/default-avatar.png';
  }
}