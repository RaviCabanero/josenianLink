import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-alumni',
  templateUrl: './alumni.page.html',
  styleUrls: ['./alumni.page.scss'],
})
export class AlumniPage implements OnInit {
  alumni: any[] = [];
  filteredAlumni: any[] = [];
  loading: boolean = true;
  searchTerm: string = '';
  isFilterModalOpen: boolean = false;

  filters = {
    program: [] as string[],
    yearRange: { lower: 2000, upper: 2024 },
    location: ''
  };

  constructor(
    private router: Router,
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadAlumni();
  }

  async loadAlumni() {
    this.loading = true;
    try {
      this.firestore.collection('users', ref => 
        ref.where('role', '==', 'user')
           .orderBy('fullName')
      ).valueChanges({ idField: 'uid' }).subscribe(users => {
        this.alumni = users.map((user: any) => ({
          uid: user.uid,
          name: user.fullName || user.displayName || 'Unknown User',
          firstName: user.firstName || this.getFirstName(user.fullName || user.displayName || 'Unknown User'),
          lastName: user.lastName || this.getLastName(user.fullName || user.displayName || 'Unknown User'),
          email: user.email || '',
          program: user.program || 'N/A',
          yearGraduated: user.yearGraduated || 'N/A',
          location: user.address || '',
          photo: user.photoURL || user.photo || 'assets/default-avatar.png',
          isOnline: user.isOnline || false,
          contactNumber: user.contactNumber || '',
          bio: user.bio || '',
          idNumber: user.idNumber || 'N/A'
        }));
        this.filteredAlumni = [...this.alumni];
        this.loading = false;
      }, error => {
        console.error('Error loading alumni:', error);
        this.loading = false;
      });
    } catch (error) {
      console.error('Error loading alumni:', error);
      this.loading = false;
    }
  }

  filterAlumni() {
    let filtered = [...this.alumni];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(alumni => 
        alumni.name.toLowerCase().includes(term) ||
        alumni.program.toLowerCase().includes(term) ||
        alumni.yearGraduated.toString().includes(term) ||
        alumni.location.toLowerCase().includes(term)
      );
    }

    // Program filter
    if (this.filters.program.length > 0) {
      filtered = filtered.filter(alumni => 
        this.filters.program.includes(alumni.program)
      );
    }

    // Year range filter
    filtered = filtered.filter(alumni => {
      const year = parseInt(alumni.yearGraduated);
      return year >= this.filters.yearRange.lower && year <= this.filters.yearRange.upper;
    });

    // Location filter
    if (this.filters.location.trim()) {
      const location = this.filters.location.toLowerCase();
      filtered = filtered.filter(alumni => 
        alumni.location.toLowerCase().includes(location)
      );
    }

    this.filteredAlumni = filtered;
  }

  viewAlumniProfile(alumni: any) {
    // Navigate to alumni profile or open modal
    console.log('Viewing profile for:', alumni.name);
    // You can implement a profile modal or navigate to a profile page
  }

  sendMessage(alumni: any, event: Event) {
    event.stopPropagation();
    // Navigate to messages with this alumni
    this.router.navigate(['/messages'], { queryParams: { userId: alumni.uid } });
  }

  viewProfile(alumni: any, event: Event) {
    event.stopPropagation();
    // Open profile modal or navigate to profile
    console.log('Opening profile for:', alumni.name);
  }

  openFilterModal() {
    this.isFilterModalOpen = true;
  }

  closeFilterModal() {
    this.isFilterModalOpen = false;
  }

  // Helper methods for name parsing
  getFirstName(fullName: string): string {
    if (!fullName) return 'Unknown';
    const nameParts = fullName.trim().split(' ');
    return nameParts[0] || 'Unknown';
  }

  getLastName(fullName: string): string {
    if (!fullName) return '';
    const nameParts = fullName.trim().split(' ');
    return nameParts.slice(1).join(' ') || '';
  }

  clearFilters() {
    this.filters = {
      program: [],
      yearRange: { lower: 2000, upper: 2024 },
      location: ''
    };
    this.filterAlumni();
    this.closeFilterModal();
  }

  applyFilters() {
    this.filterAlumni();
    this.closeFilterModal();
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
  }
}
