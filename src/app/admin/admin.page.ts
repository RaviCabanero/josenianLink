import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  imports: [IonicModule, RouterModule, CommonModule]
})
export class AdminPage implements OnInit {
  adminProfile: any = null;
  adminName: string = 'Administrator';
  alumniList: any[] = [];
  filteredAlumniList: any[] = [];
  loading: boolean = false;
  
  private afAuth = inject(AngularFireAuth);
  private router = inject(Router);
  private authService = inject(AuthService);
  private firestore = inject(AngularFirestore);

  constructor() {}

  ngOnInit() {
    this.authService.checkUserRole().subscribe(result => {
      console.log('Admin page - User role check:', result);
      this.adminProfile = result.userProfile;
      this.adminName = result.userProfile?.fullName || 'Administrator';
    });
    
    // Load all users
    this.loadAllUsers();
  }

  async loadAllUsers() {
    this.loading = true;
    try {
      this.firestore.collection('users').valueChanges({ idField: 'uid' }).subscribe(users => {
        this.alumniList = users.map((user: any) => ({
          id: user.idNumber || 'N/A',
          name: user.fullName || 'Unknown User',
          email: user.email || 'No email',
          year: user.yearGraduated || 'N/A',
          program: user.program || 'N/A',
          contact: user.contactNumber || 'N/A',
          address: user.address || 'N/A',
          photo: user.photoURL || 'https://via.placeholder.com/40x40/cccccc/ffffff?text=👤',
          verified: user.verified || false,
          uid: user.uid
        }));
        this.filteredAlumniList = [...this.alumniList];
        this.loading = false;
        console.log('Loaded users:', this.alumniList);
      });
    } catch (error) {
      console.error('Error loading users:', error);
      this.loading = false;
    }
  }

  searchUsers(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm && searchTerm.trim() !== '') {
      this.filteredAlumniList = this.alumniList.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.id.toLowerCase().includes(searchTerm) ||
        user.program.toLowerCase().includes(searchTerm)
      );
    } else {
      this.filteredAlumniList = [...this.alumniList];
    }
  }

  async deleteUser(userUid: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await this.firestore.collection('users').doc(userUid).delete();
        console.log('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  editUser(user: any) {
    console.log('Edit user:', user);
    // Implement edit functionality here
  }

  trackByUid(index: number, user: any): string {
    return user.uid;
  }

  ionViewDidEnter() {
    console.log('Admin page loaded');
  }

  async logout() {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
