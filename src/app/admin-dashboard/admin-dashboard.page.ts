import { Component, OnInit, inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss']
})
export class AdminDashboardPage implements OnInit {
  notifCount: number = 0;
  totals: any = { alumni: 0, events: 0, idRequests: 0, pending: 0 };
  alumniList: any[] = [];
  eventsList: any[] = [];
  idRequestsList: any[] = [];
  alumniIdRequests: any[] = [];
  loadingAlumniIdRequests: boolean = false;
  private firestore = inject(AngularFirestore);

  ngOnInit() {
    this.loadAlumniIdRequests();
    this.loadStats();
    this.loadAlumniList();
    this.loadEventsList();
    this.loadIdRequestsList();
  }

  loadAlumniIdRequests() {
    this.loadingAlumniIdRequests = true;
    this.firestore.collection('alumniIdRequests', ref => ref.orderBy('timestamp', 'desc'))
      .valueChanges({ idField: 'id' })
      .subscribe(requests => {
        this.alumniIdRequests = requests;
        this.totals.idRequests = requests.length;
        this.totals.pending = requests.filter((r: any) => r.status === 'pending').length;
        this.idRequestsList = requests;
        this.loadingAlumniIdRequests = false;
      }, error => {
        console.error('Error loading Alumni ID requests:', error);
        this.loadingAlumniIdRequests = false;
      });
  }

  loadStats() {
    // Simulate stats loading, replace with Firestore queries as needed
    this.totals = { alumni: 120, events: 8, idRequests: this.alumniIdRequests.length, pending: this.alumniIdRequests.filter(r => r.status === 'pending').length };
    this.notifCount = 3;
  }

  loadAlumniList() {
    // Load registered alumni from Firestore collection 'users' where role is 'alumni'
    this.firestore.collection('users', ref => ref.where('role', '==', 'alumni'))
      .valueChanges({ idField: 'id' })
      .subscribe((alumni: any[]) => {
        this.alumniList = alumni;
        this.totals.alumni = alumni.length;
      }, error => {
        console.error('Error loading alumni:', error);
      });
  }

  loadEventsList() {
    // Simulate events list, replace with Firestore queries as needed
    this.eventsList = [
      { title: 'Alumni Homecoming', department: 'All', start: new Date(), location: 'USJR Main Campus' },
      { title: 'Career Fair', department: 'Engineering', start: new Date(), location: 'USJR Gymnasium' }
    ];
    this.totals.events = this.eventsList.length;
  }

  loadIdRequestsList() {
    // Simulate ID requests list, replace with Firestore queries as needed
    this.idRequestsList = this.alumniIdRequests.slice(0, 5);
  }

  approveRequest(request: any) {
    request.__busy = true;
    setTimeout(() => {
      request.status = 'approved';
      request.__busy = false;
    }, 1000);
  }

  rejectRequest(request: any) {
    request.__busy = true;
    setTimeout(() => {
      request.status = 'rejected';
      request.__busy = false;
    }, 1000);
  }
}
