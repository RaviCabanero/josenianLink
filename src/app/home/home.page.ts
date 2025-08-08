import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  userProfile: any = null;
  userName: string = 'User';
  
  featuredAlumni: any[] = [];

  recentUpdates = [
    {
      author: 'Alumni Office',
      authorPhoto: 'assets/default-avatar.png',
      date: new Date('2025-08-07'),
      content: 'Welcome to the new JosenianLink platform! Connect with fellow alumni and stay updated.',
      likes: 24,
      comments: 8
    },
    {
      author: 'Career Services',
      authorPhoto: 'assets/default-avatar.png',
      date: new Date('2025-08-06'),
      content: 'New job opportunities available for alumni. Check out the latest openings in tech and business.',
      likes: 15,
      comments: 5
    },
    {
      author: 'University News',
      authorPhoto: 'assets/default-avatar.png',
      date: new Date('2025-08-05'),
      content: 'University celebrates 50 years of excellence in education. Join us for the anniversary celebration.',
      likes: 42,
      comments: 12
    }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.checkUserRole().subscribe(result => {
      console.log('User role check:', result);
      this.userProfile = result.userProfile;
      this.userName = result.userProfile?.fullName || 'User';
      
      // If user is admin, they can still access home page but will see their admin name
      if (result.isAdmin) {
        this.userName = 'Administrator';
      }
    });

    // Load real registered users as featured alumni
    this.loadFeaturedAlumni();
  }

  loadFeaturedAlumni() {
    this.authService.getAllUsers().subscribe(users => {
      // Filter and format users for featured alumni display
      this.featuredAlumni = users
        .filter(user => user && user.fullName) // Only show users with full names
        .slice(0, 5) // Limit to 5 featured alumni
        .map(user => ({
          name: user.fullName,
          program: user.program || user.course || 'Alumni',
          year: user.graduationYear || user.year || '2024',
          photo: user.photoURL || 'assets/default-avatar.png'
        }));
    });
  }

  logout() {
    this.authService.logout();
  }

  goToFreedomWall() {
    this.router.navigate(['/freedom-wall']);
  }

}
