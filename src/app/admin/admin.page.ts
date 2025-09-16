import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import firebase from 'firebase/compat/app';

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [IonicModule, RouterModule, CommonModule, FormsModule]
})
export class AdminPage implements OnInit {
  adminProfile: any = null;
  adminName: string = 'Administrator';
  alumniList: any[] = [];
  filteredAlumniList: any[] = [];
  loading: boolean = false;

  // Tab management
  activeTab: string = 'alumni';

  // User detail modal properties
  isUserDetailModalOpen: boolean = false;
  selectedUser: any = null;
  selectedUserJobs: any[] = [];
  loadingUserJobs: boolean = false;

  // Edit Role Modal
  isEditRoleModalOpen: boolean = false;
  editingUser: any = null;
  editingUserRole: string = '';
  roleSaving: boolean = false;

  // Freedom Wall properties
  newPost: string = '';
  posts$!: Observable<any[]>;
  showPostInput: boolean = false;
  postLoading: boolean = false;
  
  private afAuth = inject(AngularFireAuth);
  private router = inject(Router);
  private authService = inject(AuthService);
  private firestore = inject(AngularFirestore);

  constructor() {}

  ngOnInit() {
    this.authService.checkUserRole().subscribe(result => {
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
          uid: user.uid,
          role: user.role || 'user'
        }));
        this.filteredAlumniList = [...this.alumniList];
        this.loading = false;
      });
    } catch (error) {
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
        this.alumniList = this.alumniList.filter(u => u.uid !== userUid);
        this.filteredAlumniList = this.filteredAlumniList.filter(u => u.uid !== userUid);
      } catch (error) {
        // handle error
      }
    }
  }

  // Edit Role Modal logic
  openEditRoleModal(user: any) {
    this.editingUser = user;
    this.editingUserRole = user.role || 'user';
    this.isEditRoleModalOpen = true;
  }

  closeEditRoleModal() {
    this.isEditRoleModalOpen = false;
    this.editingUser = null;
    this.editingUserRole = '';
  }

  async saveUserRole() {
    if (!this.editingUser) return;
    this.roleSaving = true;
    try {
      await this.firestore.collection('users').doc(this.editingUser.uid).update({
        role: this.editingUserRole
      });
      // Update local list for instant UI feedback
      this.editingUser.role = this.editingUserRole;
      this.closeEditRoleModal();
    } catch (error) {
      // handle error
    } finally {
      this.roleSaving = false;
    }
  }

  // View user details including employment history
  async viewUserDetails(user: any) {
    this.selectedUser = user;
    this.isUserDetailModalOpen = true;
    this.loadingUserJobs = true;
    this.selectedUserJobs = [];

    try {
      this.authService.getEmploymentHistoryByUserId(user.uid).subscribe(jobs => {
        this.selectedUserJobs = jobs || [];
        this.loadingUserJobs = false;
      }, error => {
        this.loadingUserJobs = false;
      });
    } catch (error) {
      this.loadingUserJobs = false;
    }
  }

  closeUserDetailModal() {
    this.isUserDetailModalOpen = false;
    this.selectedUser = null;
    this.selectedUserJobs = [];
  }

  getCurrentJobs(): any[] {
    return this.selectedUserJobs.filter(job => job.type === 'current');
  }

  getPastJobs(): any[] {
    return this.selectedUserJobs.filter(job => job.type === 'past');
  }

  editUser(user: any) {
    // Implement edit functionality here
  }

  trackByUid(index: number, user: any): string {
    return user.uid;
  }

  ionViewDidEnter() {
    
  }

  // Freedom Wall methods
  loadPosts() {
    try {
      this.posts$ = this.firestore
        .collection('posts', ref => ref.orderBy('timestamp', 'desc'))
        .valueChanges({ idField: 'id' });
    } catch (error) {
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
    if (!content) return;
    if (!this.adminProfile) return;

    this.postLoading = true;
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) return;

      const post = {
        content,
        authorId: currentUser.uid,
        authorName: this.adminProfile.fullName || 'Administrator',
        authorEmail: this.adminProfile.email || '',
        authorAvatar: this.adminProfile.photoURL || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: [] as string[],
        comments: []
      };
      await this.firestore.collection('posts').add(post);
      this.newPost = '';
      this.showPostInput = false;
    } catch (error) {
      // handle error
    } finally {
      this.postLoading = false;
    }
  }

  async likePost(post: any) {
    if (!this.adminProfile) return;
    // Implement like logic here
  }

  async deletePost(postId: string) {
    if (!postId) return;
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await this.firestore.collection('posts').doc(postId).delete();
    } catch (error) {
      // handle error
    }
  }

  canDeletePostSync(post: any): boolean {
    const email = this.adminProfile?.email || '';
    return !!this.adminProfile && (
      email === post.authorEmail ||
      this.authService.isAdmin?.(email) === true
    );
  }

  isPostLiked(post: any): boolean {
    const email = this.adminProfile?.email;
    const likedBy: string[] = post.likedBy || [];
    return !!email && likedBy.includes(email);
  }

  getTimeAgo(timestamp: any): string {
    if (!timestamp) return '';
    const d: Date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString();
  }

  trackById(_index: number, post: any): string {
    return post.id;
  }

  async logout() {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      // handle error
    }
  }
}