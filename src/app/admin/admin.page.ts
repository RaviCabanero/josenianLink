import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import firebase from 'firebase/compat/app';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [IonicModule, RouterModule, CommonModule, FormsModule]
})
export class AdminPage implements OnInit {
  filteredAlumniList: any[] = [];
  loading: boolean = false;

  alumniList: any[] = [];
  adminProfile: any = null;
  adminName: string = 'Administrator';

  // Tab management
  activeTab: string = 'alumni';

  // User detail modal properties
  isUserDetailModalOpen: boolean = false;
  selectedUser: any = null;
  selectedUserJobs: any[] = [];
  loadingUserJobs: boolean = false;

  // Freedom Wall properties (similar to home page)
  newPost: string = '';
  posts$!: Observable<any[]>;
  showPostInput: boolean = false;
  postLoading: boolean = false;

  focusPostInput() {
    this.showPostInput = true;
  }

  submitPost() {
    // Implement post submission logic here
    this.showPostInput = false;
    this.newPost = '';
  }

  loadPosts() {
    // Implement loading posts logic here
    this.posts$ = new Observable<any[]>();
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

  canDeletePostSync(post: any): boolean {
    const email = this.adminProfile?.email || '';
    return !!this.adminProfile && (
      email === post.authorEmail ||
      this.authService.isAdmin?.(email) === true
    );
  }

  deletePost(postId: string) {
    // Implement delete post logic here
    console.log('Delete post', postId);
  }

  likePost(post: any) {
    // Implement like post logic here
    console.log('Like post', post);
  }

  isPostLiked(post: any): boolean {
    // Implement logic to check if post is liked
    return false;
  }

  trackById(_index: number, post: any): string {
    return post.id;
  }

  private afAuth = inject(AngularFireAuth);
  private router = inject(Router);
  private authService = inject(AuthService);
  private firestore = inject(AngularFirestore);

  constructor() {}

  ngOnInit() {
    this.authService.checkUserRole().subscribe(result => {
      console.log('Admin page - User role check:', result);
      this.adminProfile = result.userProfile;
      this.adminName = result.userProfile?.fullName || 'Administrator';
    });

    // Load all users
    this.loadAllUsers();

    // Load posts for Freedom Wall
    this.loadPosts();
  }

  // Tab switching
  switchTab(tab: string) {
    this.activeTab = tab;
    console.log('Switched to tab:', tab);
  }

  async loadAllUsers() {
    this.loading = true;
    try {
      this.firestore.collection('users').valueChanges({ idField: 'uid' }).subscribe(users => {
        this.alumniList = users.map((user: any) => ({
          id: user.idNumber || 'N/A',
          name: user.fullName || 'Unknown User',
          email: user.email || 'No email',
          year: user.yearGraduated || 'N/A',
          program: user.program || 'N/A',
          contact: user.contactNumber || 'N/A',
          address: user.address || 'N/A',
          photo: user.photoURL || 'https://via.placeholder.com/40x40/cccccc/ffffff?text=👤',
          verified: user.verified || false,
          uid: user.uid
        }));
        this.filteredAlumniList = [...this.alumniList];
        this.loading = false;
        console.log('Loaded users:', this.alumniList);
      });
    } catch (error) {
      console.error('Error loading users:', error);
      this.loading = false;
    }
  }

  searchUsers(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm && searchTerm.trim() !== '') {
      this.filteredAlumniList = this.alumniList.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.id.toLowerCase().includes(searchTerm) ||
        user.program.toLowerCase().includes(searchTerm)
      );
    } else {
      this.filteredAlumniList = [...this.alumniList];
    }
  }

  async deleteUser(userUid: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await this.firestore.collection('users').doc(userUid).delete();
        console.log('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  // View user details including employment history
  async viewUserDetails(user: any) {
    console.log('Viewing user details:', user);
    this.selectedUser = user;
    this.isUserDetailModalOpen = true;
    this.loadingUserJobs = true;
    this.selectedUserJobs = [];
    try {
      // Get user's employment history
      this.authService.getEmploymentHistoryByUserId(user.uid).subscribe(jobs => {
        console.log('Loaded employment history for user:', jobs);
        this.selectedUserJobs = jobs;
        this.loadingUserJobs = false;
      }, error => {
        console.error('Error loading user employment history:', error);
        this.loadingUserJobs = false;
      });
    } catch (error) {
      console.error('Error viewing user details:', error);
      this.loadingUserJobs = false;
    }
  }

  // Close user detail modal
  closeUserDetailModal() {
    this.isUserDetailModalOpen = false;
    this.selectedUser = null;
    this.selectedUserJobs = [];
  }

  // Get current jobs for display
  getCurrentJobs(): any[] {
    return this.selectedUserJobs.filter(job => job.type === 'current');
  }

  // Get past jobs for display
  getPastJobs(): any[] {
    return this.selectedUserJobs.filter(job => job.type === 'past');
  }

  editUser(user: any) {
    console.log('Edit user:', user);
    // Implement edit functionality here
  }

  trackByUid(index: number, user: any): string {
    return user.uid;
  }

  ionViewDidEnter() {
    console.log('Admin page loaded');
  }

  // ...existing code...
}
