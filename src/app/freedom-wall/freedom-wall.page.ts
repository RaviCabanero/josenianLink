import { Component, inject, OnInit } from '@angular/core';
import firebase from 'firebase/compat/app';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-freedom-wall',
  standalone: true,
  templateUrl: './freedom-wall.page.html',
  styleUrls: ['./freedom-wall.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class FreedomWallPage implements OnInit {
  newPost: string = '';
  posts$: Observable<any[]>;
  userProfile: any = null;
  loading: boolean = false;

  private firestore = inject(AngularFirestore);
  private authService = inject(AuthService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  constructor() {
    // Get posts ordered by timestamp (newest first)
    this.posts$ = this.firestore.collection('posts', ref => 
      ref.orderBy('timestamp', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  ngOnInit() {
    this.authService.checkUserRole().subscribe(result => {
      this.userProfile = result.userProfile;
    });
  }

  async submitPost() {
    if (!this.newPost.trim()) {
      await this.presentToast('Please enter a post message', 'warning');
      return;
    }

    if (!this.userProfile) {
      await this.presentToast('Please log in to post', 'danger');
      return;
    }

    this.loading = true;

    try {
      const isAdmin = this.authService.isAdmin?.(this.userProfile.email || '');
      const post = {
        content: this.newPost.trim(),
        authorName: isAdmin ? 'Administrator' : (this.userProfile.fullName || 'Anonymous'),
        authorEmail: this.userProfile.email || '',
        authorPhoto: this.userProfile.photoURL || this.getDefaultAvatar(),
        authorAvatar: this.userProfile.photoURL || this.getDefaultAvatar(), // For compatibility
        authorId: this.userProfile.uid || '',
        authorProgram: this.userProfile.program || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: []
      };

      await this.firestore.collection('posts').add(post);
      this.newPost = '';
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
      const likedBy = post.likedBy || [];
      
      if (likedBy.includes(userEmail)) {
        // Unlike the post
        await this.firestore.collection('posts').doc(post.id).update({
          likes: post.likes - 1,
          likedBy: likedBy.filter((email: string) => email !== userEmail)
        });
      } else {
        // Like the post
        await this.firestore.collection('posts').doc(post.id).update({
          likes: post.likes + 1,
          likedBy: [...likedBy, userEmail]
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
      await this.presentToast('Failed to update like. Please try again.', 'danger');
    }
  }

  async deletePost(postId: string) {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await this.firestore.collection('posts').doc(postId).delete();
        await this.presentToast('Post deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting post:', error);
        await this.presentToast('Failed to delete post', 'danger');
      }
    }
  }

  canDeletePost(post: any): boolean {
    return this.userProfile && 
           (this.userProfile.email === post.authorEmail || 
            this.authService.isAdmin(this.userProfile.email || ''));
  }

  isPostLiked(post: any): boolean {
    const likedBy = post.likedBy || [];
    return this.userProfile && likedBy.includes(this.userProfile.email);
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    
    const now = new Date();
    const postTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return postTime.toLocaleDateString();
  }

  trackById(index: number, post: any): string {
    return post.id;
  }

  // Get default avatar
  getDefaultAvatar(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMyYzU0M2YiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMFYyMkgxOFYyMEMxOCAxNi42ODYzIDE1LjMxMzcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
  }

  // Handle image loading errors
  onImageError(event: any): void {
    console.log('Image failed to load, using default avatar');
    event.target.src = this.getDefaultAvatar();
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color
    });
    toast.present();
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }
}
