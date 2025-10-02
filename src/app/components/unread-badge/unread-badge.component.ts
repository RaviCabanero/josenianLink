import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-unread-badge',
  template: `
    <div class="unread-badge" *ngIf="unreadCount > 0">
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </div>
  `,
  styles: [`
    .unread-badge {
      position: absolute;
      top: 8px;
      right: 12px;
      background: #ef4444;
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: bold;
      min-width: 16px;
      text-align: center;
      z-index: 10;
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class UnreadBadgeComponent implements OnInit, OnDestroy {
  unreadCount: number = 0;
  private subscription?: Subscription;
  private currentUserId: string = '';

  async ngOnInit() {
    try {
      const authService = inject(AuthService);
      const chatService = inject(ChatService);
      
      const user = await authService.getCurrentUser();
      this.currentUserId = user?.uid || '';
      
      if (this.currentUserId) {
        this.subscription = chatService.getUserUnreadCount(this.currentUserId)
          .subscribe((count: number) => {
            this.unreadCount = count;
          });
      }
    } catch (error) {
      console.error('Error initializing unread badge:', error);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}