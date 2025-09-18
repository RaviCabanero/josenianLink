import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import { AuthService } from '../services/auth.service';
import { PushNotificationService } from '../services/push-notification.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  async clickLink(post: any) {
    if (!this.userProfile) {
      await this.presentToast('Please log in to react', 'warning');
      return;
    }
    const userEmail = this.userProfile.email;
    const clickedBy: string[] = post.clickedBy || [];
    const doc = this.firestore.collection('posts').doc(post.id);
    if (clickedBy.includes(userEmail)) {
      // User already clicked, remove their click
      await doc.update({
        linkClicks: (post.linkClicks || 0) - 1,
        clickedBy: clickedBy.filter(e => e !== userEmail)
      });
    } else {
      // Add user click
      await doc.update({
        linkClicks: (post.linkClicks || 0) + 1,
        clickedBy: [...clickedBy, userEmail]
      });
    }
  }
  navigateToSettings() {
    this.router.navigate(['/settings']);
  }
  newPost: string = '';
  posts$!: Observable<any[]>;
  userProfile: any = null;
  loading: boolean = false;
  showPostInput: boolean = false;
  unreadNotifications: number = 0;
  unreadMessages: number = 5;

  private firestore = inject(AngularFirestore);
  private authService = inject(AuthService);
  private pushNotificationService = inject(PushNotificationService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  ngOnInit() {
    this.loadUserProfile();
    this.loadPosts();
  }

  loadUserProfile() {
    this.authService.checkUserRole().subscribe((result: any) => {
      this.userProfile = result?.userProfile ?? null;
      // Get the current user to get the UID
      this.authService.getCurrentUser().then(user => {
        if (user && this.userProfile) {
          this.userProfile.uid = user.uid; // Add UID to profile
          this.loadNotificationCount();
        }
      });
    });
  }

  loadPosts() {
    try {
      this.posts$ = this.firestore
        .collection('posts', ref => ref.orderBy('timestamp', 'desc'))
        .valueChanges({ idField: 'id' });
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback to loading posts without ordering to avoid index issues
      this.posts$ = this.firestore
        .collection('posts')
        .valueChanges({ idField: 'id' });
    }
  }

  focusPostInput() {
    this.showPostInput = true;
  }

  async submitPost() {
    const content = this.newPost.trim();
    if (!content) {
      await this.presentToast('Please enter a post message', 'warning');
      return;
    }
    if (!this.userProfile) {
      await this.presentToast('Please log in to post', 'danger');
      return;
    }

    this.loading = true;
    try {
      // Get current user ID
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        await this.presentToast('Authentication required to post', 'danger');
        return;
      }

      const post = {
        content,
        authorId: currentUser.uid, // Add authorId for proper post management
        authorName: this.userProfile.fullName || 'Anonymous',
        authorEmail: this.userProfile.email || '',
        authorAvatar: this.userProfile.photoURL || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: [] as string[],
        comments: []
      };

      const docRef = await this.firestore.collection('posts').add(post);

      // Send notification about new post
      await this.pushNotificationService.sendFreedomWallNotification(
        docRef.id,
        this.userProfile.fullName || 'Anonymous',
        content
      );

      this.newPost = '';
      this.showPostInput = false;
      await this.presentToast('Post shared successfully!', 'success');
    } catch (error) {
      console.error('Error posting message:', error);
      await this.presentToast('Failed to post message. Please try again.', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async likePost(post: any) {
    if (!this.userProfile) {
      await this.presentToast('Please log in to like posts', 'warning');
      return;
    }
    try {
      const userEmail = this.userProfile.email;
      const likedBy: string[] = post.likedBy || [];
      const doc = this.firestore.collection('posts').doc(post.id);

      if (likedBy.includes(userEmail)) {
        await doc.update({
          likes: (post.likes || 0) - 1,
          likedBy: likedBy.filter(e => e !== userEmail)
        });
      } else {
        await doc.update({
          likes: (post.likes || 0) + 1,
          likedBy: [...likedBy, userEmail]
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
      await this.presentToast('Failed to update like. Please try again.', 'danger');
    }
  }

  async deletePost(postId: string) {
    if (!postId) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await this.firestore.collection('posts').doc(postId).delete();
      await this.presentToast('Post deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting post:', error);
      await this.presentToast('Failed to delete post', 'danger');
    }
  }

  async canDeletePost(post: any): Promise<boolean> {
    if (!this.userProfile) return false;

    const email = this.userProfile?.email || '';
    const currentUser = await this.authService.getCurrentUser();

    return !!(currentUser && (
      currentUser.uid === post.authorId || // Check by user ID (more reliable)
      email === post.authorEmail || // Fallback to email check
      this.authService.isAdmin?.(email) === true
    ));
  }

  // Synchronous version for template use
  canDeletePostSync(post: any): boolean {
    const email = this.userProfile?.email || '';
    return !!this.userProfile && (
      email === post.authorEmail ||
      this.authService.isAdmin?.(email) === true
    );
  }

  isPostLiked(post: any): boolean {
    const email = this.userProfile?.email;
    const likedBy: string[] = post.likedBy || [];
    return !!email && likedBy.includes(email);
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    const d: Date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  trackById(_index: number, post: any): string {
    return post.id;
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }

  loadNotificationCount() {
    if (this.userProfile?.uid) {
      console.log('Loading notification count for user:', this.userProfile.uid);
      this.pushNotificationService.getUnreadNotificationCount(this.userProfile.uid)
        .subscribe(count => {
          console.log('Notification count received:', count);
          this.unreadNotifications = count;
        });
    } else {
      console.log('No user profile found for notification count');
    }
  }

  navigateToNotifications() {
    console.log('Navigating to notifications page...');
    console.log('Current user profile:', this.userProfile);
    this.router.navigate(['/notifications']).then(success => {
      console.log('Navigation result:', success);
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // Test method to create a sample notification
  async createTestNotification() {
    if (this.userProfile?.uid) {
      await this.pushNotificationService.sendIdRequestNotification(
        this.userProfile.uid,
        this.userProfile.displayName || 'Test User',
        'approved',
        'USJR-2024-TU1234'
      );
      console.log('Test notification created');
    }
  }

  navigateTo(route: string) {
    this.router.navigate([`/${route}`]);
  }

  logout() {
    this.authService.logout();
  }
}
