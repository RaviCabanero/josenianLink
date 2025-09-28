import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PushNotificationService } from '../services/push-notification.service';
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
  activeTab: string = 'dashboard';

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

  // Dashboard properties (from admin-dashboard)
  notifCount: number = 0;
  totals: any = { alumni: 0, events: 0, idRequests: 0, pending: 0 };
  eventsList: any[] = [];
  idRequestsList: any[] = [];
  alumniIdRequests: any[] = [];
  loadingAlumniIdRequests: boolean = false;
  
  eventName: string = '';
  eventDate: string = '';
  eventTime: string = '';
  eventVenue: string = '';
  eventPoints: number | null = null;
  qrCodeUrl: string | null = null;
  eventDescription: string = '';

  isEventQrCodeModalOpen: boolean = false;
  editingEventId: string | null = null; // Track the event being edited

  // Registry Approval properties
  pendingRegistrations: any[] = [];
  loadingRegistryRequests: boolean = false;
  approvedToday: number = 0;
  declinedToday: number = 0;
  totalRegistryRequests: number = 0;

  private afAuth = inject(AngularFireAuth);
  private router = inject(Router);
  private authService = inject(AuthService);
  private firestore = inject(AngularFirestore);
  private pushNotificationService = inject(PushNotificationService);
  private toastController = inject(ToastController);

  constructor() {}

  ngOnInit() {
    this.authService.checkUserRole().subscribe(result => {
      if (result.isAdmin) {
        // Create proper admin profile
        this.adminProfile = {
          uid: 'admin',
          fullName: 'Administrator',
          email: result.userProfile?.email || 'admin@josenianlink.com',
          photoURL: 'assets/images/admin-avatar.png',
          role: 'admin',
          isAdmin: true
        };
        this.adminName = 'Administrator';
      } else {
        this.adminProfile = result.userProfile;
        this.adminName = result.userProfile?.fullName || 'Administrator';
      }
    });

    // Load all users
    this.loadAllUsers();

    // Load posts for Freedom Wall
    this.loadPosts();
    
    // Load dashboard data
    this.loadAlumniIdRequests();
    this.loadStats();
    this.loadEventsList();
    this.loadIdRequestsList();
  }

  // Tab switching
  switchTab(tab: string) {
    this.activeTab = tab;

    // Load data when switching to registry approval tab
    if (tab === 'registry-approval') {
      this.loadRegistryRequests();
    }
  }

  async loadAllUsers() {
    this.loading = true;
    try {
      // Load users from main users collection (since lastname subcollections are dynamic)
      this.firestore.collection('users', ref =>
        ref.where('role', '==', 'user')
           .orderBy('fullName')
      ).valueChanges({ idField: 'uid' }).subscribe(users => {
        this.alumniList = users.map((user: any) => ({
          id: user.idNumber || 'N/A',
          name: user.fullName || user.name || 'Unknown User',
          firstName: user.firstName || this.getFirstName(user.fullName || user.name || 'Unknown User'),
          lastName: user.lastName || this.getLastName(user.fullName || user.name || 'Unknown User'),
          email: user.email || 'No email',
          year: user.yearGraduated || 'N/A',
          program: user.program || 'N/A',
          contact: user.contactNumber || 'N/A',
          address: user.address || 'N/A',
          photo: user.photoURL || user.photo || 'https://via.placeholder.com/40x40/cccccc/ffffff?text=👤',
          verified: user.verified || false,
          uid: user.uid,
          role: user.role || 'user'
        }));
        this.filteredAlumniList = [...this.alumniList];
        this.loading = false;
        this.loadStats(); // Update stats after alumni are loaded
      }, error => {
        console.error('Error loading users:', error);
        this.loading = false;
      });
    } catch (error) {
      console.error('Error loading users from main users collection:', error);
      this.loading = false;
    }
  }

  // Helper methods for name parsing
  getFirstName(fullName: string): string {
    if (!fullName) return 'Unknown';
    const nameParts = fullName.trim().split(' ');
    return nameParts[0] || 'Unknown';
  }

  getLastName(fullName: string): string {
    if (!fullName) return '';
    const nameParts = fullName.trim().split(' ');
    return nameParts.slice(1).join(' ') || '';
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

  async updateUserRole(alumni: any, event: any) {
    const newRole = event.detail.value;
    const originalRole = alumni.role;

    try {
      // Update in Firestore
      await this.firestore.collection('users').doc(alumni.uid).update({
        role: newRole
      });

      // Update local data
      alumni.role = newRole;

      console.log(`Updated ${alumni.name}'s role to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      // Revert the change in UI
      alumni.role = originalRole;
      alert('Failed to update user role. Please try again.');
    }
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
        authorId: 'admin', // Use admin as authorId
        authorName: 'Administrator',
        authorEmail: this.adminProfile.email || 'admin@josenianlink.com',
        authorAvatar: this.adminProfile.photoURL || 'assets/images/admin-avatar.png',
        authorPhoto: this.adminProfile.photoURL || 'assets/images/admin-avatar.png',
        authorProgram: 'Administration',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: [] as string[],
        comments: [],
        isAdminPost: true
      };

      const docRef = await this.firestore.collection('posts').add(post);
      console.log('Admin post created:', docRef.id);

      // Send notification to ALL users about admin post
      await this.sendAdminPostNotificationToAllUsers(docRef.id, content);

      this.newPost = '';
      this.showPostInput = false;

      console.log('Admin post submitted successfully');
    } catch (error) {
      console.error('Error submitting admin post:', error);
    } finally {
      this.postLoading = false;
    }
  }

  // Send notification to all users when admin posts
  async sendAdminPostNotificationToAllUsers(postId: string, content: string) {
    try {
      // Get all users from Firestore
      const usersSnapshot = await this.firestore.collection('users').get().toPromise();

      if (usersSnapshot) {
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        }));

        // Send notification to each user
        for (const user of users) {
          if (user.id && user.id !== 'admin') { // Don't send to admin
            await this.sendNotificationToUser(user.id, postId, content);
          }
        }

        console.log(`Admin post notification sent to ${users.length} users`);
      }
    } catch (error) {
      console.error('Error sending admin post notifications:', error);
    }
  }

  // Helper method to send notification to specific user
  async sendNotificationToUser(userId: string, postId: string, content: string) {
    try {
      const notification = {
        title: '📢 Administrator Posted',
        body: `Administrator shared: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        type: 'freedom_wall_post',
        userId: userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false,
        data: {
          postId: postId,
          authorName: 'Administrator',
          postContent: content
        }
      };

      await this.firestore.collection('notifications').add(notification);
    } catch (error) {
      console.error('Error sending notification to user:', userId, error);
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

  // Dashboard methods (from admin-dashboard)
  loadAlumniIdRequests() {
    this.loadingAlumniIdRequests = true;
    this.firestore.collection('alumniIdRequests', ref => ref.orderBy('timestamp', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe(requests => {
        this.alumniIdRequests = requests;
        this.totals.idRequests = requests.length;
        this.totals.pending = requests.filter((r: any) => r.status === 'pending').length;
        this.idRequestsList = requests;
        this.loadingAlumniIdRequests = false;
        this.loadStats(); // Update stats after requests are loaded
      }, error => {
        console.error('Error loading Alumni ID requests:', error);
        this.loadingAlumniIdRequests = false;
      });
  }

  loadStats() {
    // Update stats based on loaded data
    this.totals = {
      alumni: this.alumniList.length,
      events: this.eventsList.length,
      idRequests: this.alumniIdRequests.length,
      pending: this.alumniIdRequests.filter(r => r.status === 'pending').length
    };
    this.notifCount = 3;
  }

  loadEventsList() {
    this.firestore.collection('events').valueChanges({ idField: 'id' }).subscribe(events => {
      this.eventsList = events;
    });
  }
  

  loadIdRequestsList() {
    // Use the first 5 alumni ID requests for the list
    this.idRequestsList = this.alumniIdRequests.slice(0, 5);
  }

  async approveRequest(request: any) {
    request.__busy = true;
    try {
      // Generate Alumni ID using the correct field name
      const userName = request.userName || request.name || 'User';
      const alumniId = this.generateAlumniId(userName);

      console.log('Approving request:', request);
      console.log('Generated Alumni ID:', alumniId);

      // Update request status in Firestore
      await this.firestore.collection('alumniIdRequests').doc(request.id).update({
        status: 'approved',
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        alumniId: alumniId
      });

      // Update or create user profile with alumni ID if userId exists
      if (request.userId) {
        try {
          // First try to update the existing document
          await this.firestore.collection('users').doc(request.userId).update({
            alumniId: alumniId,
            verified: true,
            verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          console.log('User document updated successfully');
        } catch (updateError: any) {
          // If document doesn't exist, create it
          if (updateError.code === 'not-found') {
            console.log('User document not found, creating new one...');
            await this.firestore.collection('users').doc(request.userId).set({
              uid: request.userId,
              email: request.userEmail || request.email,
              fullName: userName,
              name: userName,
              alumniId: alumniId,
              verified: true,
              verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              // Add other fields from the request
              studentId: request.studentId,
              graduationYear: request.graduationYear,
              program: request.program,
              contactNumber: request.contactNumber,
              address: request.address,
              photoURL: request.userPhoto || null,
              role: 'user'
            });
            console.log('User document created successfully');
          } else {
            throw updateError;
          }
        }
      }

      // Send notification to user with alumni ID
      if (request.userId) {
        await this.pushNotificationService.sendIdRequestNotification(
          request.userId,
          userName,
          'approved',
          alumniId
        );
      }

      request.status = 'approved';
      request.alumniId = alumniId;
      this.loadStats(); // Update stats after approval

      console.log('Request approved successfully');
      alert('Alumni ID request approved successfully! Alumni ID: ' + alumniId);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + (error as any).message);
    } finally {
      request.__busy = false;
    }
  }

  async rejectRequest(request: any) {
    request.__busy = true;
    try {
      // Update request status in Firestore
      await this.firestore.collection('alumniIdRequests').doc(request.id).update({
        status: 'rejected',
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Send notification to user
      await this.pushNotificationService.sendIdRequestNotification(
        request.userId,
        request.userName,
        'rejected'
      );

      request.status = 'rejected';
      this.loadStats(); // Update stats after rejection
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      request.__busy = false;
    }
  }

  // Generate Alumni ID
  private generateAlumniId(userName: string): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const namePrefix = userName.substring(0, 2).toUpperCase();
    return `USJR-${year}-${namePrefix}${randomNum}`;
  }

  // Test notification for user "ravi"
  async testNotification() {
    try {
      // Create a test notification with a sample Alumni ID for ravi
      const alumniId = this.generateAlumniId('ravi');

      // Send test notification (using a mock user ID for testing)
      await this.pushNotificationService.sendIdRequestNotification(
        'test-user-ravi',
        'ravi',
        'approved',
        alumniId
      );

      console.log('Test notification created with Alumni ID:', alumniId);
      alert(`✅ Test notification created for ravi!\nAlumni ID: ${alumniId}\n\nCheck the notifications page to see it.`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('❌ Error sending test notification');
    }
  }

  async generateEventQrCode() {
    const eventDetails = {
      title: this.eventName,
      date: this.eventDate,
      time: this.eventTime,
      venue: this.eventVenue,
      points: this.eventPoints,
      description: this.eventDescription,
      createdAt: new Date()
    };
    const encoded = encodeURIComponent(
      `Name: ${eventDetails.title}\nDate: ${eventDetails.date}\nTime: ${eventDetails.time}\nVenue: ${eventDetails.venue}\nPoints: ${eventDetails.points}\nDescription: ${eventDetails.description}`
    );
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200`;
    // Do NOT save to Firestore here
  }

  openEventQrCodeModal() {
    this.isEventQrCodeModalOpen = true;
  }

  closeEventQrCodeModal() {
    this.isEventQrCodeModalOpen = false;
  }

  async createEvent() {
    const eventDetails = {
      title: this.eventName,
      date: this.eventDate,
      time: this.eventTime,
      venue: this.eventVenue,
      points: this.eventPoints,
      description: this.eventDescription,
      createdAt: new Date()
    };

    try {
      if (this.editingEventId) {
        await this.firestore.collection('events').doc(this.editingEventId).update(eventDetails);
        this.editingEventId = null;
      } else {
        await this.firestore.collection('events').add(eventDetails);
      }
      // Clear form fields
      this.eventName = '';
      this.eventDate = '';
      this.eventTime = '';
      this.eventVenue = '';
      this.eventPoints = null;
      this.eventDescription = '';
      this.qrCodeUrl = null;
      this.loadEventsList();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.firestore.collection('events').doc(eventId).delete();
      this.loadEventsList();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }

  editEvent(event: any) {
    // Populate form fields with event data for editing
    this.eventName = event.title;
    this.eventDate = event.date;
    this.eventTime = event.time;
    this.eventVenue = event.venue;
    this.eventPoints = event.points;
    this.eventDescription = event.description;
    this.editingEventId = event.id; // Add this property to your class
    this.isEventQrCodeModalOpen = true; // Optionally open modal for editing
  }

  // Registry Approval Methods
  async loadRegistryRequests() {
    this.loadingRegistryRequests = true;
    try {
      const snapshot = await this.firestore.collection('registry-approval').get().toPromise();
      this.pendingRegistrations = snapshot?.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data
        };
      }) || [];

      this.totalRegistryRequests = this.pendingRegistrations.length;

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      this.approvedToday = 0; // Will be calculated from approved collection if needed
      this.declinedToday = 0; // Will be calculated from declined collection if needed

    } catch (error) {
      console.error('Error loading registry requests:', error);
    } finally {
      this.loadingRegistryRequests = false;
    }
  }

  async refreshRegistryRequests() {
    await this.loadRegistryRequests();
  }

  async approveRegistration(request: any) {
    try {
      request.__busy = true;

      // Move data to users collection with lastname subcollection structure
      const lastNameCollection = request.lastName?.trim() || 'Unknown';

      const userData = {
        ...request,
        verified: true,
        approvedAt: new Date(),
        approvedBy: this.adminProfile?.uid || 'admin'
      };

      // Remove the temporary id from registry-approval
      delete userData.id;

      // Save to users collection under program document with lastname as subcollection
      await this.firestore.collection('users').doc(request.program).collection(lastNameCollection).doc(request.uid).set(userData);

      // Also save to main users collection for individual user access
      await this.firestore.collection('users').doc(request.uid).set(userData);

      // Remove from registry-approval collection
      await this.firestore.collection('registry-approval').doc(request.id).delete();

      // Refresh the list
      await this.loadRegistryRequests();

      // Show success message
      const toast = await this.toastController.create({
        message: `Registration approved for ${request.fullName || request.name}`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('Error approving registration:', error);
      const toast = await this.toastController.create({
        message: 'Error approving registration',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      request.__busy = false;
    }
  }

  async declineRegistration(request: any) {
    try {
      request.__busy = true;

      // Optionally save to declined collection for record keeping
      const declinedData = {
        ...request,
        declinedAt: new Date(),
        declinedBy: this.adminProfile?.uid || 'admin'
      };

      await this.firestore.collection('registry-declined').doc(request.id).set(declinedData);

      // Remove from registry-approval collection
      await this.firestore.collection('registry-approval').doc(request.id).delete();

      // Refresh the list
      await this.loadRegistryRequests();

      // Show success message
      const toast = await this.toastController.create({
        message: `Registration declined for ${request.fullName || request.name}`,
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('Error declining registration:', error);
      const toast = await this.toastController.create({
        message: 'Error declining registration',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      request.__busy = false;
    }
  }

}