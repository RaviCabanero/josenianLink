import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';  // Import IonicModule for standalone component
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel binding
import { RouterModule } from '@angular/router';  // Import RouterModule for routerLink
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
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
  private firestore = inject(AngularFirestore);
  private router = inject(Router);
  private toastController = inject(ToastController);

  constructor() {}

  async register() {
    try {
      if (this.email && this.password && this.fullName) {
        const userCredential = await this.afAuth.createUserWithEmailAndPassword(this.email, this.password);
        console.log('User registered successfully:', userCredential.user);
        
        // Store additional user profile data in Firestore
        if (userCredential.user) {
          await this.firestore.collection('users').doc(userCredential.user.uid).set({
            fullName: this.fullName,
            idNumber: this.idNumber,
            yearGraduated: this.yearGraduated,
            program: this.program,
            contactNumber: this.contactNumber,
            address: this.address,
            email: this.email,
            createdAt: new Date()
          });
          console.log('User profile saved to Firestore');
        }
        
        // Show success message
        await this.presentToast('Registration successful! Please log in with your credentials.', 'success');
        
        // Navigate to login page after successful registration
        this.router.navigate(['/login']);
      } else {
        console.error('Please fill in all required fields');
        await this.presentToast('Please fill in all required fields (Full Name, Email, Password)', 'warning');
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
