import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';  // Import IonicModule for standalone component
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel binding
import { RouterModule } from '@angular/router';  // Import RouterModule for routerLink
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [IonicModule, FormsModule, RouterModule],  // Add RouterModule for routerLink directive and FormsModule for ngModel
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegisterComponent {
  fullName: string = '';
idNumber: string = '';
yearGraduated: number | null = null;
program: string = '';
contactNumber: string = '';
address: string = '';
email: string = '';
password: string = '';
  
  private afAuth = inject(AngularFireAuth);
  private router = inject(Router);
  private toastController = inject(ToastController);

  constructor() {}

  async register() {
    try {
      if (this.email && this.password) {
        const userCredential = await this.afAuth.createUserWithEmailAndPassword(this.email, this.password);
        console.log('User registered successfully:', userCredential.user);
        
        // Show success message
        await this.presentToast('Registration successful! Please log in with your credentials.', 'success');
        
        // Navigate to login page after successful registration
        this.router.navigate(['/login']);
      } else {
        console.error('Please fill in all fields');
        await this.presentToast('Please fill in all fields', 'warning');
      }
    } catch (error: any) {
      console.error('Registration error:', error.message);
      await this.presentToast('Registration failed: ' + error.message, 'danger');
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
