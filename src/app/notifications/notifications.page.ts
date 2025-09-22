import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PushNotificationService, NotificationData } from '../services/push-notification.service';
import { AuthService } from '../services/auth.service';
import { AlumniIdModalComponent } from '../components/alumni-id-modal/alumni-id-modal.component';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class NotificationsPage implements OnInit, OnDestroy {
  notifications: NotificationData[] = [];
  loading: boolean = true;
  currentUser: any = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private pushNotificationService: PushNotificationService,
    private authService: AuthService,
    private router: Router,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    console.log('NotificationsPage: ngOnInit called');
    await this.loadCurrentUser();
    console.log('NotificationsPage: Current user loaded:', this.currentUser);
    this.loadNotifications();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadCurrentUser() {
    try {
      this.currentUser = await this.authService.getCurrentUser();
      console.log('NotificationsPage: Firebase user:', this.currentUser);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  loadNotifications() {
    console.log('NotificationsPage: loadNotifications called');
    if (!this.currentUser?.uid) {
      console.log('NotificationsPage: No user UID found');
      this.loading = false;
      return;
    }

    console.log('NotificationsPage: Loading notifications for user:', this.currentUser.uid);
    const notificationsSub = this.pushNotificationService
      .getUserNotifications(this.currentUser.uid)
      .subscribe({
        next: (notifications) => {
          console.log('NotificationsPage: Notifications received:', notifications);
          this.notifications = notifications;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.loading = false;
        }
      });

    this.subscriptions.push(notificationsSub);
  }

  async markAsRead(notification: NotificationData) {
    if (notification.id && !notification.read) {
      await this.pushNotificationService.markAsRead(notification.id);
      notification.read = true;
    }
  }

  async markAllAsRead() {
    if (this.currentUser?.uid) {
      await this.pushNotificationService.markAllAsRead(this.currentUser.uid);
      this.notifications.forEach(notification => {
        notification.read = true;
      });
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'id_request_approved':
        return 'checkmark-circle';
      case 'id_request_rejected':
        return 'close-circle';
      case 'freedom_wall_post':
        return 'chatbubble';
      default:
        return 'notifications';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'id_request_approved':
        return 'success';
      case 'id_request_rejected':
        return 'danger';
      case 'freedom_wall_post':
        return 'primary';
      default:
        return 'medium';
    }
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  async onNotificationClick(notification: NotificationData) {
    this.markAsRead(notification);

    // Navigate based on notification type
    switch (notification.type) {
      case 'freedom_wall_post':
        this.router.navigate(['/home']);
        break;
      case 'id_request_approved':
        // Show Alumni ID modal
        await this.showAlumniIdModal(notification);
        break;
      case 'id_request_rejected':
        // Navigate to profile or ID status page
        this.router.navigate(['/profile']);
        break;
      default:
        break;
    }
  }

  async showAlumniIdModal(notification: NotificationData) {
    const modal = await this.modalController.create({
      component: AlumniIdModalComponent,
      componentProps: {
        alumniId: notification.data?.alumniId || 'USJR-2024-RA0001',
        userName: notification.data?.userName || this.currentUser?.displayName || 'Alumni',
        userEmail: this.currentUser?.email || '',
        userPhoto: this.currentUser?.photoURL || ''
      },
      cssClass: 'alumni-id-modal'
    });

    await modal.present();
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  refreshNotifications() {
    this.loading = true;
    this.loadNotifications();
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getNotificationTypeLabel(type: string): string {
    switch (type) {
      case 'alumni_id_approved':
        return 'Alumni ID';
      case 'freedom_wall_post':
        return 'Freedom Wall';
      case 'event_reminder':
        return 'Event';
      case 'system':
        return 'System';
      default:
        return 'Notification';
    }
  }

  trackByNotificationId(index: number, notification: NotificationData): string {
    return notification.id || index.toString();
  }

  hasUnreadNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }
}
