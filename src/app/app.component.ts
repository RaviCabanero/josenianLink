import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private hasCheckedInitialAuth = false;

  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  ngOnInit() {
    // Only check auth state once on app initialization
    this.checkInitialAuthState();
  }

  private checkInitialAuthState() {
    this.afAuth.authState.pipe(take(1)).subscribe(user => {
      const currentUrl = this.router.url;
      console.log('App Component - Initial auth check - URL:', currentUrl, 'User:', !!user);
      
      this.hasCheckedInitialAuth = true;
      
      // Only redirect on initial load if on root and not authenticated
      if (!user && (currentUrl === '/' || currentUrl === '')) {
        console.log('App Component - Redirecting to login on initial load');
        this.router.navigate(['/login']);
      }
    });
  }
}
