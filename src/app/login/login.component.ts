import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';  // Import IonicModule for standalone component
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel binding
import { RouterModule } from '@angular/router';  // Import RouterModule for routerLink
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [IonicModule, FormsModule, RouterModule],  // Add RouterModule for routerLink directive
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  private returnUrl: string = '/home';
  
  private afAuth = inject(AngularFireAuth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastController = inject(ToastController);
  private authService = inject(AuthService);

  constructor() {
    // Get the return URL from query parameters
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
  }

  async login() {
    try {
      if (this.email && this.password) {
        const userCredential = await this.afAuth.signInWithEmailAndPassword(this.email, this.password);
        console.log('User logged in successfully:', userCredential.user);
        
        // Check if user is admin
        if (userCredential.user) {
          const isAdmin = this.authService.isAdmin(userCredential.user.email || '');
          
          if (isAdmin) {
            // Show admin success message
            await this.presentToast('Welcome Administrator! Redirecting to admin panel.', 'success');
            
            // Navigate to admin page for admin users
            this.router.navigate(['/admin']);
          } else {
            // Show regular user success message
            await this.presentToast('Login successful! Welcome back.', 'success');
            
            // Navigate to return URL or home page for regular users
            this.router.navigate([this.returnUrl]);
          }
        }
      } else {
        console.error('Please fill in all fields');
        await this.presentToast('Please fill in all fields', 'warning');
      }
    } catch (error: any) {
      console.error('Login error:', error.message);
      await this.presentToast('Login failed: ' + error.message, 'danger');
    }
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
}
