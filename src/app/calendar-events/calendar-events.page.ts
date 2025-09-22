import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ModalController } from '@ionic/angular';
import { AlumniIdModalComponent } from '../components/alumni-id-modal/alumni-id-modal.component';

@Component({
  selector: 'app-calendar-events',
  templateUrl: './calendar-events.page.html',
  styleUrls: ['./calendar-events.page.scss']
})
export class CalendarEventsPage implements OnInit {
  events$: Observable<any[]> = of([
    { title: 'Alumni Homecoming', date: new Date(2025, 9, 15), location: 'USJR Main Campus' },
    { title: 'Career Fair', date: new Date(2025, 10, 5), location: 'USJR Gymnasium' }
  ]);

  alumniIdRequest = {
    name: '',
    email: '',
    yearGraduated: '',
    course: '',
    studentId: '',
    contactNumber: ''
  };
  loading = false;
  requestSuccess = false;
  userProfile: any = null;

  constructor(
    private router: Router,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    // Load user profile to check if they have alumni ID
    this.authService.getUserProfile().subscribe(profile => {
      this.userProfile = profile;
    });
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    // Implement logout logic or navigate to login page
    this.router.navigate(['/login']);
  }

  viewEvent(event: any) {
    // Implement event details modal or navigation
    alert(`Event: ${event.title}\nDate: ${event.date}\nLocation: ${event.location}`);
  }

  async viewDigitalAlumniId() {
    if (!this.userProfile?.alumniId) {
      alert('No Alumni ID found. Please request an Alumni ID first.');
      return;
    }

    const modal = await this.modalController.create({
      component: AlumniIdModalComponent,
      componentProps: {
        alumniId: this.userProfile.alumniId,
        userName: this.userProfile.fullName || this.userProfile.name || 'Alumni',
        userPhoto: this.userProfile.photoURL || 'assets/images/default-avatar.png',
        program: this.userProfile.program || 'USJR Alumni',
        graduationYear: this.userProfile.yearGraduated || 'N/A'
      }
    });

    return await modal.present();
  }

  async submitAlumniIdRequest() {
    this.loading = true;
    try {
      // Get current user information
      const currentUser = await this.authService.getCurrentUser();
      const userProfile = await new Promise((resolve) => {
        this.authService.getUserProfile().subscribe(profile => resolve(profile));
      });

      const requestData = {
        ...this.alumniIdRequest,
        status: 'pending',
        timestamp: new Date(),
        userId: currentUser?.uid,
        userName: (userProfile as any)?.fullName || currentUser?.displayName || this.alumniIdRequest.name,
        userEmail: (userProfile as any)?.email || currentUser?.email || this.alumniIdRequest.email,
        userPhoto: (userProfile as any)?.photoURL || currentUser?.photoURL
      };

      await this.firestore.collection('alumniIdRequests').add(requestData);
      this.requestSuccess = true;
      this.alumniIdRequest = { name: '', email: '', yearGraduated: '', course: '', studentId: '', contactNumber: '' };
      setTimeout(() => this.requestSuccess = false, 3000);
    } catch (error) {
      console.error('Error submitting alumni ID request:', error);
    }
    this.loading = false;
  }

  isFormValid(): boolean {
    return !!(
      this.alumniIdRequest.name &&
      this.alumniIdRequest.email &&
      this.alumniIdRequest.yearGraduated &&
      this.alumniIdRequest.course &&
      this.alumniIdRequest.studentId &&
      this.alumniIdRequest.contactNumber
    );
  }


}
