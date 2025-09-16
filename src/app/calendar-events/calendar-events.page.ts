import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';

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
    course: ''
  };
  loading = false;
  requestSuccess = false;

  constructor(private router: Router, private firestore: AngularFirestore) {}

  ngOnInit() {}

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

  async submitAlumniIdRequest() {
    this.loading = true;
    try {
      const requestData = {
        ...this.alumniIdRequest,
        status: 'pending',
        timestamp: new Date()
      };
      await this.firestore.collection('alumniIdRequests').add(requestData);
      this.requestSuccess = true;
      this.alumniIdRequest = { name: '', email: '', yearGraduated: '', course: '' };
      setTimeout(() => this.requestSuccess = false, 3000);
    } catch (error) {
      console.error('Error submitting alumni ID request:', error);
    }
    this.loading = false;
  }
}
