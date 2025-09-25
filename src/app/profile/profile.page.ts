import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  activeTab: string = 'post';
  isEditModalOpen: boolean = false;
  isCreatePostModalOpen: boolean = false;
  isEditPostModalOpen: boolean = false;
  isAddJobModalOpen: boolean = false;
  isQrScannerModalOpen = false;
  userPosts: any[] | undefined = undefined; // undefined = loading, [] = no posts
  currentJobs: any[] = [];
  pastJobs: any[] = [];
  userActivities: any[] = [];
  userLevel: any = {
    current: 1,
    currentPoints: 0,
    pointsToNext: 1000,
    progressPercentage: 0,
    totalPoints: 0
  };

  newPost = {
    content: ''
  };

  editingPost = {
    id: '',
    content: ''
  };

  newJob = {
    type: 'current',
    companyName: '',
    position: '',
    startDate: '',
    endDate: '',
    address: '',
    contactNumber: '',
    email: ''
  };

  editingJob: any = null;

  // Navigation badge properties
  unreadNotifications: number = 0;
  unreadMessages: number = 0;

  // Define the user object with additional properties
  user = {
    name: 'mellow w allow',
    firstName: 'mellow',
    lastName: 'w allow',
    id: '1233445',
    program: 'BSIT',
    yearGraduated: '2026',
    email: 'mellow@gmail.com',
    address: 'mao nani',
    contactNumber: '+63 912 345 6789',
    photo: 'https://via.placeholder.com/80x80/4CAF50/ffffff?text=MW',
    postText: 'We have an opportunity for a software engineer at our company. Feel free to get in touch if you\'re interested.',
    isPublic: true
  };

  // Edit user object for modal
  editUser = { ...this.user };

  qrText = '';
  qrCodeUrl: string | null = null;
  selectedQrImage: File | null = null;
  scannedQrText: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    // Load user profile from Firebase
    this.loadUserProfile();
    // Load user posts
    this.loadUserPosts();
    // Load employment history
    this.loadEmploymentHistory();
    // Load user activities and level
    this.loadUserActivities();
  }

  async loadUserProfile() {
    // Get both profile data and auth user data
    const authUser = await this.authService.getCurrentUser();
    console.log('Auth user:', authUser); // Debug log

    this.authService.getUserProfile().subscribe(profile => {
      console.log('Profile data from Firestore:', profile); // Debug log

      if (profile) {
        // Try multiple sources for the photo
        let userPhoto = profile.photoURL ||
                       profile.photo ||
                       profile.profilePicture ||
                       authUser?.photoURL ||
                       this.getDefaultAvatar();

        console.log('Selected photo URL:', userPhoto); // Debug log

        // Parse first and last name from fullName if available
        const fullName = profile.fullName || profile.name || 'mellow w allow';
        const nameParts = fullName.split(' ');
        const firstName = profile.firstName || nameParts[0] || 'mellow';
        const lastName = profile.lastName || nameParts.slice(1).join(' ') || 'w allow';

        this.user = {
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          id: profile.idNumber || '1233445',
          program: profile.program || 'BSIT',
          yearGraduated: profile.yearGraduated || '2026',
          email: profile.email || 'mellow@gmail.com',
          address: profile.address || 'mao nani',
          contactNumber: profile.contactNumber || '+63 912 345 6789',
          photo: userPhoto,
          postText: profile.postText || 'We have an opportunity for a software engineer at our company. Feel free to get in touch if you\'re interested.',
          isPublic: profile.isPublic !== undefined ? profile.isPublic : true
        };
        this.editUser = { ...this.user };
        console.log('Final user object:', this.user); // Debug log
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
  }

  // Method to handle profile update (opens the edit modal)
  updateProfile() {
    this.editUser = { ...this.user }; // Reset edit form with current user data
    this.isEditModalOpen = true;
  }

  // Close edit modal
  closeEditModal() {
    this.isEditModalOpen = false;
  }

  // Handle photo selection
  selectPhoto() {
    this.fileInput.nativeElement.click();
  }

  // Handle photo file selection
  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.presentToast('File size should be less than 5MB', 'warning');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        this.presentToast('Please select a valid image file', 'warning');
        return;
      }

      // Show loading toast
      this.presentToast('Processing image...', 'primary');

      // Compress and resize the image
      this.compressImage(file).then(compressedDataUrl => {
        this.editUser.photo = compressedDataUrl;
        this.presentToast('Image processed successfully!', 'success');
      }).catch(error => {
        console.error('Error compressing image:', error);
        this.presentToast('Error processing image. Please try again.', 'danger');
      });
    }
  }

  // Compress image to reduce file size
  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 400x400)
        const maxSize = 400;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (0.8 quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Check if still too large (Firebase limit is ~1MB for document fields)
        if (compressedDataUrl.length > 800000) { // ~800KB limit
          // Further compress
          const furtherCompressed = canvas.toDataURL('image/jpeg', 0.6);
          resolve(furtherCompressed);
        } else {
          resolve(compressedDataUrl);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Create object URL for the image
      img.src = URL.createObjectURL(file);
    });
  }

  // Save profile changes
  async saveProfile() {
    // Validate required fields
    if (!this.editUser.firstName?.trim()) {
      this.presentToast('First name is required', 'warning');
      return;
    }

    if (!this.editUser.lastName?.trim()) {
      this.presentToast('Last name is required', 'warning');
      return;
    }

    if (!this.editUser.email.trim()) {
      this.presentToast('Email is required', 'warning');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editUser.email)) {
      this.presentToast('Please enter a valid email address', 'warning');
      return;
    }

    // Contact number validation (optional but if provided, should be valid)
    if (this.editUser.contactNumber && this.editUser.contactNumber.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(this.editUser.contactNumber.replace(/\s/g, ''))) {
        this.presentToast('Please enter a valid contact number', 'warning');
        return;
      }
    }

    try {
      // Combine first and last name for fullName
      const fullName = `${this.editUser.firstName?.trim() || ''} ${this.editUser.lastName?.trim() || ''}`.trim();

      // Update user object
      this.user = {
        ...this.editUser,
        name: fullName // Update the display name
      };

      // Save to Firebase
      await this.authService.updateUserProfile({
        firstName: this.editUser.firstName?.trim(),
        lastName: this.editUser.lastName?.trim(),
        fullName: fullName,
        name: fullName, // For compatibility
        email: this.editUser.email,
        address: this.editUser.address,
        contactNumber: this.editUser.contactNumber,
        photoURL: this.editUser.photo,
        isPublic: this.editUser.isPublic,
        updatedAt: new Date()
      });

      this.presentToast('Profile updated successfully!', 'success');
      this.closeEditModal();
    } catch (error) {
      console.error('Error updating profile:', error);
      this.presentToast('Failed to update profile. Please try again.', 'danger');
    }
  }

  // Load user posts
  loadUserPosts() {
    console.log('Loading user posts...'); // Debug log
    this.userPosts = undefined; // Set to loading state

    this.authService.getUserPosts().subscribe(posts => {
      console.log('Loaded posts:', posts); // Debug log
      this.userPosts = posts.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime();
      });
      console.log('Sorted posts:', this.userPosts); // Debug log
    }, error => {
      console.error('Error loading posts:', error);
      this.userPosts = []; // Set to empty array on error
    });
  }

  // Open create post modal
  openCreatePostModal() {
    this.newPost.content = '';
    this.isCreatePostModalOpen = true;
  }

  // Close create post modal
  closeCreatePostModal() {
    this.isCreatePostModalOpen = false;
    this.newPost.content = '';
  }

  // Create new post
  async createPost() {
    if (!this.newPost.content.trim()) {
      this.presentToast('Please enter some content for your post', 'warning');
      return;
    }

    try {
      const postData = {
        content: this.newPost.content.trim(),
        authorId: await this.authService.getCurrentUserId(),
        authorName: this.user.name,
        authorProgram: this.user.program,
        authorPhoto: this.getUserPhoto(), // Ensure photo is always available
        timestamp: new Date(),
        likes: 0,
        comments: []
      };

      await this.authService.createPost(postData);
      this.presentToast('Post created successfully!', 'success');
      this.closeCreatePostModal();
      this.loadUserPosts(); // Refresh posts
    } catch (error) {
      console.error('Error creating post:', error);
      this.presentToast('Failed to create post. Please try again.', 'danger');
    }
  }

  // Edit post
  editPost(post: any) {
    this.editingPost = {
      id: post.id,
      content: post.content
    };
    this.isEditPostModalOpen = true;
  }

  // Close edit post modal
  closeEditPostModal() {
    this.isEditPostModalOpen = false;
    this.editingPost = { id: '', content: '' };
  }

  // Update post
  async updatePost() {
    if (!this.editingPost.content.trim()) {
      this.presentToast('Please enter post content', 'warning');
      return;
    }

    try {
      await this.authService.updatePost(this.editingPost.id, {
        content: this.editingPost.content.trim(),
        updatedAt: new Date()
      });
      this.presentToast('Post updated successfully!', 'success');
      this.closeEditPostModal();
      this.loadUserPosts(); // Refresh posts
    } catch (error) {
      console.error('Error updating post:', error);
      this.presentToast('Failed to update post. Please try again.', 'danger');
    }
  }

  // Delete post
  async deletePost(post: any) {
    const alert = await this.alertController.create({
      header: 'Delete Post',
      message: 'Are you sure you want to delete this post?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            try {
              await this.authService.deletePost(post.id);
              this.presentToast('Post deleted successfully!', 'success');
              this.loadUserPosts(); // Refresh posts
            } catch (error) {
              console.error('Error deleting post:', error);
              this.presentToast('Failed to delete post. Please try again.', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Track by function for ngFor performance
  trackByPostId(index: number, post: any): any {
    return post.id || index;
  }

  // Format timestamp for display
  formatTimestamp(timestamp: any): string {
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleString();
      } else if (timestamp) {
        return new Date(timestamp).toLocaleString();
      }
      return '';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  }

  // Load employment history
  loadEmploymentHistory() {
    this.authService.getUserEmploymentHistory().subscribe(jobs => {
      this.currentJobs = jobs.filter(job => job.type === 'current');
      this.pastJobs = jobs.filter(job => job.type === 'past');
    }, error => {
      console.error('Error loading employment history:', error);
    });
  }

  // Load user activities and calculate level
  loadUserActivities() {
    // Start with no activities - replace with actual Firebase call later
    this.userActivities = [];

    this.calculateUserLevel();
  }

  // Calculate user level based on total points
  calculateUserLevel() {
    const totalPoints = this.userActivities.reduce((sum, activity) => sum + activity.points, 0);
    const pointsPerLevel = 1000;

    // Ensure user starts at Level 1 (minimum level is 1)
    const currentLevel = Math.max(1, Math.floor(totalPoints / pointsPerLevel) + 1);
    const pointsInCurrentLevel = totalPoints % pointsPerLevel;

    this.userLevel = {
      current: currentLevel,
      currentPoints: pointsInCurrentLevel,
      pointsToNext: pointsPerLevel,
      progressPercentage: (pointsInCurrentLevel / pointsPerLevel) * 100,
      totalPoints: totalPoints
    };

    console.log('User level calculated:', this.userLevel);
  }

  // Open use points modal
  openUsePointsModal() {
    // TODO: Implement use points functionality
    this.presentToast('Use Points feature coming soon!', 'primary');
  }

  // Helper method to add sample activities for testing (can be removed in production)
  addSampleActivities() {
    this.userActivities = [
      {
        id: '1',
        eventName: 'Home Coming',
        date: new Date('2025-11-01'),
        points: 1000,
        badges: [{ name: '⭐', color: '#f8961e' }]
      },
      {
        id: '2',
        eventName: 'Seminar',
        date: new Date('2024-01-03'),
        points: 250,
        badges: [{ name: '⭐', color: '#f8961e' }]
      },
      {
        id: '3',
        eventName: 'Social Gathering',
        date: new Date('2023-12-10'),
        points: 250,
        badges: [{ name: '⭐', color: '#f8961e' }]
      },
      {
        id: '4',
        eventName: 'Reunion',
        date: new Date('2022-07-20'),
        points: 200,
        badges: [{ name: '⭐', color: '#f8961e' }]
      }
    ];
    this.calculateUserLevel();
    this.presentToast('Sample activities added for demonstration!', 'success');
  }

  // Open add job modal
  openAddJobModal() {
    this.resetJobForm();
    this.isAddJobModalOpen = true;
  }

  // Close add job modal
  closeAddJobModal() {
    this.isAddJobModalOpen = false;
    this.editingJob = null;
    this.resetJobForm();
  }

  // Reset job form
  resetJobForm() {
    this.newJob = {
      type: 'current',
      companyName: '',
      position: '',
      startDate: '',
      endDate: '',
      address: '',
      contactNumber: '',
      email: ''
    };
  }

  // Validate job form
  isJobFormValid(): boolean {
    const required = !!(this.newJob.companyName.trim() &&
                       this.newJob.position.trim() &&
                       this.newJob.startDate.trim());

    if (this.newJob.type === 'past') {
      return required && !!this.newJob.endDate.trim();
    }

    return required;
  }

  // Add or update job
  async addJob() {
    if (!this.isJobFormValid()) {
      this.presentToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      // Check if user object is available
      if (!this.user) {
        this.presentToast('User profile not loaded. Please try again.', 'warning');
        return;
      }

      const jobData = {
        type: this.newJob.type,
        companyName: this.newJob.companyName.trim(),
        position: this.newJob.position.trim(),
        startDate: this.newJob.startDate.trim(),
        endDate: this.newJob.type === 'past' ? this.newJob.endDate.trim() : '',
        address: this.newJob.address.trim(),
        contactNumber: this.newJob.contactNumber.trim(),
        email: this.newJob.email.trim(),
        userId: await this.authService.getCurrentUserId(),
        userName: this.user.name, // Include user's name
        userProgram: this.user.program, // Include user's program
        userEmail: this.user.email, // Include user's email
        createdAt: this.editingJob ? this.editingJob.createdAt : new Date(),
        updatedAt: new Date() // Always set updatedAt to avoid undefined values
      };

      if (this.editingJob) {
        // Update existing job
        await this.authService.updateEmploymentHistory(this.editingJob, jobData);
        this.presentToast('Employment history updated successfully!', 'success');
      } else {
        // Add new job
        await this.authService.addEmploymentHistory(jobData);
        this.presentToast('Employment history added successfully!', 'success');
      }

      this.closeAddJobModal();
      this.loadEmploymentHistory(); // Refresh employment history
    } catch (error) {
      console.error('Error saving employment history:', error);
      this.presentToast('Failed to save employment history. Please try again.', 'danger');
    }
  }

  // Edit job
  editJob(job: any) {
    this.editingJob = { ...job };
    this.newJob = {
      type: job.type,
      companyName: job.companyName || '',
      position: job.position || '',
      startDate: job.startDate || '',
      endDate: job.endDate || '',
      address: job.address || '',
      contactNumber: job.contactNumber || '',
      email: job.email || ''
    };
    this.isAddJobModalOpen = true;
  }

  // Delete job
  async deleteJob(job: any) {
    const alert = await this.alertController.create({
      header: 'Delete Employment',
      message: 'Are you sure you want to delete this employment record?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            try {
              await this.authService.deleteEmploymentHistory(job);
              this.presentToast('Employment record deleted successfully!', 'success');
              this.loadEmploymentHistory(); // Refresh employment history
            } catch (error) {
              console.error('Error deleting employment history:', error);
              this.presentToast('Failed to delete employment record. Please try again.', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Get post author photo with fallback
  getPostAuthorPhoto(post: any): string {
    console.log('Getting photo for post:', post); // Debug log
    console.log('Post authorPhoto:', post.authorPhoto); // Debug log
    console.log('User photo:', this.user?.photo); // Debug log
    console.log('Has valid user photo:', this.hasValidUserPhoto()); // Debug log

    // For posts on the profile page, always use the current user's photo
    // since all posts here are from the current user
    if (this.hasValidUserPhoto()) {
      console.log('Using current user photo for profile post'); // Debug log
      return this.user.photo;
    }

    // Fallback to post's saved photo if available
    if (post.authorPhoto && post.authorPhoto.trim() && !post.authorPhoto.includes('placeholder')) {
      console.log('Using post authorPhoto as fallback'); // Debug log
      return post.authorPhoto;
    }

    console.log('Using default avatar'); // Debug log
    return this.getDefaultAvatar();
  }

  // Get user photo with fallback
  getUserPhoto(): string {
    console.log('getUserPhoto called, user.photo:', this.user?.photo); // Debug log
    if (this.hasValidUserPhoto()) {
      console.log('Returning user photo:', this.user.photo); // Debug log
      return this.user.photo;
    }
    console.log('Returning default avatar'); // Debug log
    return this.getDefaultAvatar();
  }

  // Check if user has a valid photo URL
  hasValidUserPhoto(): boolean {
    return !!(this.user?.photo &&
             this.user.photo.trim() &&
             !this.user.photo.includes('data:image/svg') &&
             !this.user.photo.includes('placeholder') &&
             (this.user.photo.startsWith('http') || this.user.photo.startsWith('data:image')));
  }

  // Get default avatar
  getDefaultAvatar(): string {
    // Return a default avatar URL or data URI
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMyYzU0M2YiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA9MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMFYyMkgxOFYyMEMxOCAxNi42ODYzIDE1LjMxMzcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
  }

  // Handle image loading errors
  onImageError(event: any): void {
    console.log('Image failed to load, using default avatar');
    event.target.src = this.getDefaultAvatar();
  }

  // Present toast message
  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  async openQrScannerModal() {
    this.isQrScannerModalOpen = true;
  }

  closeQrScannerModal() {
    this.isQrScannerModalOpen = false;
  }

  generateQrCode() {
    if (this.qrText.trim()) {
      const encoded = encodeURIComponent(this.qrText.trim());
      this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200`;
    }
  }

  onQrImageSelected(event: any) {
    const file = event.target.files[0];
    this.selectedQrImage = file ? file : null;
  }

  async scanQrImage() {
    if (!this.selectedQrImage) return;

    const formData = new FormData();
    formData.append('file', this.selectedQrImage);

    try {
      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      this.scannedQrText = result[0]?.symbol[0]?.data || 'No QR code found';
    } catch (error) {
      this.scannedQrText = 'Error reading QR code';
    }
  }

  openNotifications() {
    this.router.navigate(['/notifications']);
  }
}