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