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
  events$: Observable<any[]> = of([]);

  currentYear = new Date().getFullYear();
  userRSVPs: { [eventId: string]: string } = {}; // Track user's RSVP status for each event

  alumniIdRequest = {
    firstName: '',
    lastName: '',
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
    // Load events from Firestore
    this.events$ = this.firestore.collection('events', ref => 
      ref.orderBy('date', 'asc')
    ).valueChanges({ idField: 'id' });

    // Add debugging to see events data
    this.events$.subscribe(events => {
      console.log('Events loaded:', events);
      events.forEach(event => {
        console.log(`Event: ${event.title}, RSVP Enabled: ${event.rsvpEnabled}`);
      });
    });

    // Load user profile to check if they have alumni ID
    this.authService.getUserProfile().subscribe(profile => {
      this.userProfile = profile;
    });
    
    // Load user's RSVP data
    this.loadUserRSVPs();
    
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
        name: `${this.alumniIdRequest.firstName} ${this.alumniIdRequest.lastName}`.trim(),
        status: 'pending',
        timestamp: new Date(),
        userId: currentUser?.uid,
        userName: (userProfile as any)?.fullName || currentUser?.displayName || `${this.alumniIdRequest.firstName} ${this.alumniIdRequest.lastName}`.trim(),
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
      
      this.alumniIdRequest = { firstName: '', lastName: '', email: '', yearGraduated: '', course: '', studentId: '', contactNumber: '' };
      
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
      this.alumniIdRequest.firstName &&
      this.alumniIdRequest.lastName &&
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
          userName: this.existingRequest.userName || this.existingRequest.name || `${this.existingRequest.firstName} ${this.existingRequest.lastName}`.trim(),
          userEmail: this.existingRequest.userEmail || this.existingRequest.email,
          userPhoto: this.existingRequest.userPhoto || this.userProfile?.photoURL || 'assets/default-avatar.png'
        }
      });
      return await modal.present();
    }
  }

  // RSVP Methods
  async loadUserRSVPs() {
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (currentUser) {
        this.firestore.collection('userRSVPs', ref => 
          ref.where('userId', '==', currentUser.uid)
        ).valueChanges({ idField: 'id' }).subscribe(rsvps => {
          this.userRSVPs = {};
          rsvps.forEach((rsvp: any) => {
            this.userRSVPs[rsvp.eventId] = rsvp.status;
          });
        });
      }
    } catch (error) {
      console.error('Error loading user RSVPs:', error);
    }
  }

  getUserRSVPStatus(eventId: string): string {
    const status = this.userRSVPs[eventId] || '';
    console.log(`Getting RSVP status for event ${eventId}: ${status}`);
    return status;
  }

  async updateRSVP(eventId: string, status: 'going' | 'interested' | 'notGoing') {
    console.log(`Updating RSVP for event ${eventId} to status: ${status}`);
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        alert('Please log in to RSVP to events');
        return;
      }

      console.log(`Current user: ${currentUser.uid}`);

      const rsvpData = {
        userId: currentUser.uid,
        eventId: eventId,
        status: status,
        timestamp: new Date()
      };

      // Check if user already has RSVP for this event
      const existingRSVP = await this.firestore.collection('userRSVPs', ref => 
        ref.where('userId', '==', currentUser.uid)
           .where('eventId', '==', eventId)
           .limit(1)
      ).get().toPromise();

      if (existingRSVP && !existingRSVP.empty) {
        // Update existing RSVP
        const rsvpId = existingRSVP.docs[0].id;
        await this.firestore.collection('userRSVPs').doc(rsvpId).update(rsvpData);
        console.log(`Updated existing RSVP: ${rsvpId}`);
      } else {
        // Create new RSVP
        const newRSVP = await this.firestore.collection('userRSVPs').add(rsvpData);
        console.log(`Created new RSVP: ${newRSVP.id}`);
      }

      // Update local state
      this.userRSVPs[eventId] = status;

      // Update event RSVP counts
      await this.updateEventRSVPCounts(eventId);

      console.log(`RSVP updated successfully: ${status} for event ${eventId}`);
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Error updating RSVP. Please try again.');
    }
  }

  async updateEventRSVPCounts(eventId: string) {
    try {
      // Get all RSVPs for this event
      const rsvps = await this.firestore.collection('userRSVPs', ref => 
        ref.where('eventId', '==', eventId)
      ).get().toPromise();

      const counts = {
        going: 0,
        interested: 0,
        notGoing: 0
      };

      const attendeesList = {
        going: [] as string[],
        interested: [] as string[],
        notGoing: [] as string[]
      };

      if (rsvps && !rsvps.empty) {
        rsvps.docs.forEach(doc => {
          const rsvp = doc.data() as any;
          if (rsvp.status && counts.hasOwnProperty(rsvp.status)) {
            counts[rsvp.status as keyof typeof counts]++;
            attendeesList[rsvp.status as keyof typeof attendeesList].push(rsvp.userId);
          }
        });
      }

      // Update event document
      await this.firestore.collection('events').doc(eventId).update({
        rsvpCounts: counts,
        attendeesList: attendeesList
      });

    } catch (error) {
      console.error('Error updating event RSVP counts:', error);
    }
  }


}
