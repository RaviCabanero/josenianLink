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
  userPosts: any[] | undefined = undefined; // undefined = loading, [] = no posts
  currentJobs: any[] = [];
  pastJobs: any[] = [];

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

  // Define the user object with additional properties
  user = {
    name: 'mellow w allow',
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Load user profile from Firebase
    this.loadUserProfile();
    // Load user posts
    this.loadUserPosts();
    // Load employment history
    this.loadEmploymentHistory();
  }

  loadUserProfile() {
    this.authService.getUserProfile().subscribe(profile => {
      if (profile) {
        this.user = {
          name: profile.fullName || 'mellow w allow',
          id: profile.idNumber || '1233445',
          program: profile.program || 'BSIT',
          yearGraduated: profile.yearGraduated || '2026',
          email: profile.email || 'mellow@gmail.com',
          address: profile.address || 'mao nani',
          contactNumber: profile.contactNumber || '+63 912 345 6789',
          photo: profile.photoURL || 'https://via.placeholder.com/80x80/4CAF50/ffffff?text=MW',
          postText: profile.postText || 'We have an opportunity for a software engineer at our company. Feel free to get in touch if you\'re interested.',
          isPublic: profile.isPublic !== undefined ? profile.isPublic : true
        };
        this.editUser = { ...this.user };
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
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

      // Create file reader to convert to base64
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editUser.photo = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Save profile changes
  async saveProfile() {
    // Validate required fields
    if (!this.editUser.name.trim()) {
      this.presentToast('Name is required', 'warning');
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
      // Update user object
      this.user = { ...this.editUser };

      // Save to Firebase
      await this.authService.updateUserProfile({
        fullName: this.editUser.name,
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
        authorPhoto: this.user.photo,
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
        updatedAt: this.editingJob ? new Date() : undefined
      };

      if (this.editingJob) {
        // Update existing job
        console.log('Updating occupation data:', jobData); // Debug log
        await this.authService.updateEmploymentHistory(this.editingJob, jobData);
        this.presentToast('Employment history updated successfully!', 'success');
      } else {
        // Add new job
        console.log('Adding occupation data:', jobData); // Debug log
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
}