import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  existingRequest: any = null;
  hasExistingRequest: boolean = false;

  constructor(
    private router: Router,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Load user profile to check if they have alumni ID
    this.authService.getUserProfile().subscribe(profile => {
      this.userProfile = profile;
    });
    
    // Check for existing alumni ID requests
    this.checkExistingRequest();
    console.log('Initial state - hasExistingRequest:', this.hasExistingRequest);
    console.log('Initial state - existingRequest:', this.existingRequest);
  }

  async checkExistingRequest() {
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (currentUser) {
        this.firestore.collection('alumniIdRequests', ref => 
          ref.where('userId', '==', currentUser.uid)
             .orderBy('timestamp', 'desc')
             .limit(1)
        ).valueChanges({ idField: 'id' }).subscribe(requests => {
          if (requests && requests.length > 0) {
            this.existingRequest = requests[0];
            this.hasExistingRequest = true;
            console.log('Found existing request:', this.existingRequest);
          } else {
            this.hasExistingRequest = false;
            this.existingRequest = null;
            console.log('No existing request found');
          }
          this.cdr.detectChanges();
        });
      }
    } catch (error) {
      console.error('Error checking existing request:', error);
    }
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
    console.log('Submitting alumni ID request...');
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

      console.log('Request data:', requestData);

      const docRef = await this.firestore.collection('alumniIdRequests').add(requestData);
      console.log('Request submitted with ID:', docRef.id);
      
      // Immediately set the existing request to show the pending status
      this.existingRequest = {
        id: docRef.id,
        ...requestData
      };
      this.hasExistingRequest = true;
      this.requestSuccess = true;
      
      console.log('Updated state - hasExistingRequest:', this.hasExistingRequest);
      console.log('Updated state - existingRequest:', this.existingRequest);
      
      // Force change detection to update the UI
      this.cdr.detectChanges();
      
      this.alumniIdRequest = { name: '', email: '', yearGraduated: '', course: '', studentId: '', contactNumber: '' };
      
      // Hide success message and ensure the status is displayed
      setTimeout(() => {
        this.requestSuccess = false;
        this.cdr.detectChanges();
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting alumni ID request:', error);
      alert('Error submitting request. Please try again.');
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

  getRequestStatusText(): string {
    if (!this.existingRequest) return '';
    
    switch (this.existingRequest.status) {
      case 'pending':
        return 'PENDING';
      case 'approved':
        return 'APPROVED';
      case 'rejected':
        return 'REJECTED';
      default:
        return 'UNKNOWN';
    }
  }

  getRequestDate(): string {
    if (!this.existingRequest || !this.existingRequest.timestamp) return '';
    
    const timestamp = this.existingRequest.timestamp;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  }

  getProcessingMessage(): string {
    if (!this.existingRequest) return '';
    
    switch (this.existingRequest.status) {
      case 'pending':
        return 'Your request is being processed by the alumni office.';
      case 'approved':
        return 'Congratulations! Your alumni ID has been approved.';
      case 'rejected':
        return 'Your request has been rejected. Please contact the alumni office.';
      default:
        return 'Request status unknown.';
    }
  }

  async viewAlumniId() {
    if (this.existingRequest && this.existingRequest.status === 'approved') {
      const modal = await this.modalController.create({
        component: AlumniIdModalComponent,
        componentProps: {
          alumniId: this.existingRequest.alumniId,
          userName: this.existingRequest.userName || this.existingRequest.name,
          userEmail: this.existingRequest.userEmail || this.existingRequest.email,
          userPhoto: this.existingRequest.userPhoto || this.userProfile?.photoURL || 'assets/default-avatar.png'
        }
      });
      return await modal.present();
    }
  }


}
