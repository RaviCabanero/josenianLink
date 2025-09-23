import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

export interface NotificationData {
  id?: string;
  title: string;
  body: string;
  type: 'id_request_approved' | 'id_request_rejected' | 'freedom_wall_post' | 'general';
  userId: string;
  data?: any;
  timestamp: any;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private notificationCountSubject = new BehaviorSubject<number>(0);
  public notificationCount$ = this.notificationCountSubject.asObservable();

  constructor(
    private firestore: AngularFirestore,
    private afMessaging: AngularFireMessaging,
    private toastController: ToastController
  ) {
    this.initializeNotifications();
  }

  async initializeNotifications() {
    try {
      // Request permission for notifications
      await this.requestPermission();
      
      // Listen for foreground messages
      this.afMessaging.messages.subscribe((payload: any) => {
        console.log('Foreground message received:', payload);
        this.showToastNotification(payload.notification?.title, payload.notification?.body);
      });

    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async requestPermission(): Promise<string | null> {
    try {
      const token = await this.afMessaging.requestToken.toPromise();
      console.log('FCM Token:', token);
      return token || null;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Send notification for ID request approval/rejection
  async sendIdRequestNotification(
    userId: string,
    userName: string,
    status: 'approved' | 'rejected',
    alumniId?: string
  ): Promise<void> {
    const notification: NotificationData = {
      title: status === 'approved' ? '✅ Alumni ID Request Approved!' : '❌ Alumni ID Request Rejected',
      body: status === 'approved'
        ? `Congratulations ${userName}! Your Alumni ID request has been approved. Your Alumni ID is: ${alumniId || 'USJR-' + Date.now()}`
        : `Hello ${userName}, your Alumni ID request has been rejected. Please contact the alumni office for more information.`,
      type: status === 'approved' ? 'id_request_approved' : 'id_request_rejected',
      userId: userId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false,
      data: {
        status: status,
        userName: userName,
        alumniId: status === 'approved' ? (alumniId || 'USJR-' + Date.now()) : null
      }
    };

    try {
      // Store notification in Firestore
      await this.firestore.collection('notifications').add(notification);
      
      // Show toast notification if user is currently active
      await this.showToastNotification(
        notification.title,
        notification.body
      );

      console.log(`ID request ${status} notification sent to user:`, userId);
    } catch (error) {
      console.error('Error sending ID request notification:', error);
    }
  }

  // Send notification for new Freedom Wall post
  async sendFreedomWallNotification(
    postId: string,
    authorName: string,
    postContent: string
  ): Promise<void> {
    const notification: NotificationData = {
      title: '📝 New Freedom Wall Post',
      body: `${authorName} shared: "${postContent.substring(0, 50)}${postContent.length > 50 ? '...' : ''}"`,
      type: 'freedom_wall_post',
      userId: 'all', // Broadcast to all users
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false,
      data: {
        postId: postId,
        authorName: authorName,
        postContent: postContent
      }
    };

    try {
      // Store notification in Firestore
      await this.firestore.collection('notifications').add(notification);
      
      // Show toast notification
      await this.showToastNotification(
        notification.title,
        notification.body
      );

      console.log('Freedom Wall notification sent for post:', postId);
    } catch (error) {
      console.error('Error sending Freedom Wall notification:', error);
    }
  }

  // Get notifications for a specific user
  getUserNotifications(userId: string): Observable<NotificationData[]> {
    // Use a simpler query to avoid composite index requirement
    return this.firestore
      .collection<NotificationData>('notifications', ref =>
        ref.where('userId', '==', userId)
           .orderBy('timestamp', 'desc')
           .limit(50)
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map(userNotifications => {
          // Also get global notifications (userId: 'all') and merge them
          return userNotifications; // For now, just return user-specific notifications
        })
      );
  }

  // Get unread notification count for a user
  getUnreadNotificationCount(userId: string): Observable<number> {
    return this.firestore
      .collection<NotificationData>('notifications', ref =>
        ref.where('userId', '==', userId)
           .where('read', '==', false)
      )
      .valueChanges()
      .pipe(
        map((notifications: NotificationData[]) => {
          const count = notifications.length;
          this.notificationCountSubject.next(count);
          return count;
        })
      );
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.firestore.collection('notifications').doc(notificationId).update({
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notifications = await this.firestore
        .collection('notifications', ref =>
          ref.where('userId', '==', userId)
             .where('read', '==', false)
        )
        .get()
        .toPromise();

      const batch = this.firestore.firestore.batch();
      notifications?.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
      this.notificationCountSubject.next(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Show toast notification
  private async showToastNotification(title: string, message: string): Promise<void> {
    const toast = await this.toastController.create({
      header: title,
      message: message,
      duration: 4000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  // Send general notification
  async sendGeneralNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    const notification: NotificationData = {
      title: title,
      body: body,
      type: 'general',
      userId: userId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false,
      data: data
    };

    try {
      await this.firestore.collection('notifications').add(notification);
      await this.showToastNotification(title, body);
    } catch (error) {
      console.error('Error sending general notification:', error);
    }
  }
}
