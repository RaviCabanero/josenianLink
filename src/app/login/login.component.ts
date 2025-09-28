import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';  // Import IonicModule for standalone component
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel binding
import { RouterModule } from '@angular/router';  // Import RouterModule for routerLink
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
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
  private firestore = inject(AngularFirestore);
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
            // Check if user is approved (exists in users collection)
            const userDoc = await this.firestore.collection('users').doc(userCredential.user.uid).get().toPromise();

            if (userDoc && userDoc.exists) {
              // User is approved, allow login
              await this.presentToast('Login successful! Welcome back.', 'success');
              this.router.navigate([this.returnUrl]);
            } else {
              // Check if user is still pending approval
              const pendingDoc = await this.firestore.collection('registry-approval').doc(userCredential.user.uid).get().toPromise();

              if (pendingDoc && pendingDoc.exists) {
                // User is pending approval
                await this.afAuth.signOut(); // Sign out the user
                await this.presentToast('Your account is pending admin approval. Please wait for confirmation.', 'warning');
              } else {
                // User doesn't exist in either collection
                await this.afAuth.signOut(); // Sign out the user
                await this.presentToast('Account not found. Please contact administrator.', 'danger');
              }
            }
          }
        }
      } else {
        console.error('Please fill in all fields');
        await this.presentToast('Please fill in all fields', 'warning');
      }
    } catch (error: any) {
      console.error('Login error:', error.message);

      // Check if it's an auth error and provide appropriate message
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        await this.presentToast('Invalid email or password. Please try again.', 'danger');
      } else if (error.code === 'auth/too-many-requests') {
        await this.presentToast('Too many failed attempts. Please try again later.', 'danger');
      } else {
        await this.presentToast('Login failed: ' + error.message, 'danger');
      }
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
