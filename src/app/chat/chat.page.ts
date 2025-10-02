import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ActionSheetController, ToastController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService, Message, Chat } from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;

  chatId: string = '';
  currentUserId: string = '';
  otherUserId: string = '';
  otherUser: any = {};
  
  messages: Message[] = [];
  newMessage: string = '';
  
  loadingMessages: boolean = false;
  sendingMessage: boolean = false;
  isOtherUserOnline: boolean = false;
  
  showAttachmentOptions: boolean = false;
  showChatOptions: boolean = false;
  showImageViewer: boolean = false;
  selectedImageUrl: string = '';
  
  private subscriptions: Subscription[] = [];
  private lastMessageDate: string = '';
  
  // Action sheet buttons
  attachmentButtons = [
    {
      text: 'Photo',
      icon: 'image',
      handler: () => {
        this.selectImage();
      }
    },
    {
      text: 'File',
      icon: 'document',
      handler: () => {
        this.selectFile();
      }
    },
    {
      text: 'Cancel',
      icon: 'close',
      role: 'cancel'
    }
  ];
  
  chatOptionsButtons = [
    {
      text: 'View Profile',
      icon: 'person',
      handler: () => {
        this.viewOtherUserProfile();
      }
    },
    {
      text: 'Clear Chat',
      icon: 'trash',
      handler: () => {
        this.confirmClearChat();
      }
    },
    {
      text: 'Cancel',
      icon: 'close',
      role: 'cancel'
    }
  ];
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private firestore = inject(AngularFirestore);
  private actionSheetController = inject(ActionSheetController);
  private toastController = inject(ToastController);

  constructor() {}

  async ngOnInit() {
    await this.initializeComponent();
    this.loadMessages();
    this.trackOtherUserStatus();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.markChatAsRead();
  }

  private async initializeComponent() {
    try {
      // Get current user
      const user = await this.authService.getCurrentUser();
      this.currentUserId = user?.uid || '';

      // Get route parameters
      this.route.params.subscribe(params => {
        this.chatId = params['id'];
      });

      this.route.queryParams.subscribe(params => {
        this.otherUserId = params['otherUserId'];
        if (params['otherUserName']) {
          this.otherUser.name = params['otherUserName'];
        }
      });

      // Load other user data
      if (this.otherUserId) {
        await this.loadOtherUserData();
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  }

  private async loadOtherUserData() {
    try {
      const userDoc = await this.firestore.collection('users').doc(this.otherUserId).get().toPromise();
      if (userDoc && userDoc.exists) {
        this.otherUser = userDoc.data();
        this.isOtherUserOnline = this.otherUser.isOnline || false;
      }
    } catch (error) {
      console.error('Error loading other user data:', error);
    }
  }

  private loadMessages() {
    if (!this.chatId) return;
    
    this.loadingMessages = true;
    
    const messagesSubscription = this.chatService.getChatMessages(this.chatId)
      .subscribe(
        messages => {
          this.messages = messages;
          this.loadingMessages = false;
          this.scrollToBottom();
          
          // Mark messages as read after a short delay
          setTimeout(() => {
            this.markChatAsRead();
          }, 1000);
        },
        error => {
          console.error('Error loading messages:', error);
          this.loadingMessages = false;
        }
      );
    
    this.subscriptions.push(messagesSubscription);
  }

  private trackOtherUserStatus() {
    if (!this.otherUserId) return;
    
    const userStatusSubscription = this.firestore
      .collection('users')
      .doc(this.otherUserId)
      .valueChanges()
      .subscribe(
        (userData: any) => {
          if (userData) {
            this.otherUser = { ...this.otherUser, ...userData };
            this.isOtherUserOnline = userData.isOnline || false;
          }
        },
        error => {
          console.error('Error tracking user status:', error);
        }
      );
    
    this.subscriptions.push(userStatusSubscription);
  }

  async sendTextMessage() {
    if (!this.newMessage.trim() || this.sendingMessage) return;
    
    this.sendingMessage = true;
    
    try {
      const currentUser = await this.authService.getCurrentUser();
      const senderName = currentUser?.displayName || 'User';
      const senderPhoto = currentUser?.photoURL || '';
      
      await this.chatService.sendMessage(
        this.chatId,
        this.currentUserId,
        this.newMessage.trim(),
        senderName,
        senderPhoto
      );
      
      this.newMessage = '';
      this.scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      this.presentToast('Failed to send message', 'danger');
    } finally {
      this.sendingMessage = false;
    }
  }

  async sendImageMessage(imageUrl: string, caption: string = '') {
    this.sendingMessage = true;
    
    try {
      const currentUser = await this.authService.getCurrentUser();
      const senderName = currentUser?.displayName || 'User';
      const senderPhoto = currentUser?.photoURL || '';
      
      await this.chatService.sendMessage(
        this.chatId,
        this.currentUserId,
        caption,
        senderName,
        senderPhoto,
        'image',
        imageUrl
      );
      
      this.scrollToBottom();
    } catch (error) {
      console.error('Error sending image:', error);
      this.presentToast('Failed to send image', 'danger');
    } finally {
      this.sendingMessage = false;
    }
  }

  async sendFileMessage(fileUrl: string, fileName: string, caption: string = '') {
    this.sendingMessage = true;
    
    try {
      const currentUser = await this.authService.getCurrentUser();
      const senderName = currentUser?.displayName || 'User';
      const senderPhoto = currentUser?.photoURL || '';
      
      await this.chatService.sendMessage(
        this.chatId,
        this.currentUserId,
        caption,
        senderName,
        senderPhoto,
        'file',
        undefined,
        fileName,
        fileUrl
      );
      
      this.scrollToBottom();
    } catch (error) {
      console.error('Error sending file:', error);
      this.presentToast('Failed to send file', 'danger');
    } finally {
      this.sendingMessage = false;
    }
  }

  onEnterKey(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendTextMessage();
    }
  }

  selectImage() {
    this.imageInput.nativeElement.click();
  }

  selectFile() {
    this.fileInput.nativeElement.click();
  }

  async onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate image file
    if (!file.type.startsWith('image/')) {
      this.presentToast('Please select a valid image file', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      this.presentToast('Image size must be less than 5MB', 'warning');
      return;
    }

    try {
      // Here you would upload the image to Firebase Storage
      // For now, we'll create a mock URL
      const imageUrl = URL.createObjectURL(file);
      await this.sendImageMessage(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      this.presentToast('Failed to upload image', 'danger');
    }

    // Clear the input
    event.target.value = '';
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      this.presentToast('File size must be less than 10MB', 'warning');
      return;
    }

    try {
      // Here you would upload the file to Firebase Storage
      // For now, we'll create a mock URL
      const fileUrl = URL.createObjectURL(file);
      await this.sendFileMessage(fileUrl, file.name);
    } catch (error) {
      console.error('Error uploading file:', error);
      this.presentToast('Failed to upload file', 'danger');
    }

    // Clear the input
    event.target.value = '';
  }

  viewFullImage(imageUrl: string) {
    this.selectedImageUrl = imageUrl;
    this.showImageViewer = true;
  }

  downloadFile(fileUrl: string, fileName: string) {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewOtherUserProfile() {
    this.router.navigate(['/profile'], { 
      queryParams: { userId: this.otherUserId } 
    });
  }

  async confirmClearChat() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Clear Chat History',
      subHeader: 'This action cannot be undone',
      buttons: [
        {
          text: 'Clear for Me',
          role: 'destructive',
          handler: () => {
            this.clearChatForMe();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    
    await actionSheet.present();
  }

  async clearChatForMe() {
    try {
      // In a real implementation, you would mark messages as deleted for this user
      // rather than actually deleting them
      this.presentToast('Chat cleared', 'success');
    } catch (error) {
      console.error('Error clearing chat:', error);
      this.presentToast('Failed to clear chat', 'danger');
    }
  }

  private async markChatAsRead() {
    if (this.chatId && this.currentUserId) {
      try {
        await this.chatService.markChatAsRead(this.chatId, this.currentUserId);
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  shouldShowDateSeparator(message: Message): boolean {
    const messageDate = this.getDateString(message.timestamp);
    if (messageDate !== this.lastMessageDate) {
      this.lastMessageDate = messageDate;
      return true;
    }
    return false;
  }

  getDateSeparator(timestamp: any): string {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return 'Today';
    } else if (this.isSameDay(date, yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  getMessageTime(timestamp: any): string {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  private getDateString(timestamp: any): string {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toDateString();
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  trackByMessageId(index: number, message: Message): string {
    return message.id;
  }

  onImageError(event: any) {
    event.target.src = 'assets/default-avatar.png';
  }

  private async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}