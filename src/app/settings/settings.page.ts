import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  userProfile: any = null;
  notificationsEnabled: boolean = true;
  darkModeEnabled: boolean = false;
  privacyMode: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.authService.getUserProfile().subscribe(profile => {
      this.userProfile = profile;
      console.log('User profile loaded:', profile);
    });
  }

  async toggleNotifications() {
    console.log('Notifications toggled:', this.notificationsEnabled);
    await this.presentToast(
      this.notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled',
      'success'
    );
  }

  async toggleDarkMode() {
    console.log('Dark mode toggled:', this.darkModeEnabled);
    await this.presentToast(
      this.darkModeEnabled ? 'Dark mode enabled' : 'Dark mode disabled',
      'success'
    );
  }

  async togglePrivacyMode() {
    console.log('Privacy mode toggled:', this.privacyMode);
    await this.presentToast(
      this.privacyMode ? 'Privacy mode enabled' : 'Privacy mode disabled',
      'success'
    );
  }

  async changePassword() {
    const alert = await this.alertController.create({
      header: 'Change Password',
      message: 'This feature will be available soon.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async editProfile() {
    this.router.navigate(['/profile']);
  }

  async clearCache() {
    const alert = await this.alertController.create({
      header: 'Clear Cache',
      message: 'Are you sure you want to clear the app cache?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          handler: async () => {
            await this.presentToast('Cache cleared successfully', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            try {
              await this.authService.logout();
              await this.presentToast('Logged out successfully', 'success');
            } catch (error) {
              console.error('Logout error:', error);
              await this.presentToast('Error logging out', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
