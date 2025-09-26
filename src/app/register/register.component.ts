import { Component, inject, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- Add this line
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';

interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule, RouterModule], // <-- Add CommonModule here
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class RegisterComponent {
  firstName: string = '';
  lastName: string = '';
  idNumber: string = '';
  yearGraduated: number | null = null;
  graduationDate: Date | null = null;
  program: string = '';
  contactNumber: string = '';
  address: string = '';
  email: string = '';
  password: string = '';

  isInputFocused: boolean = false;
  showProgramError: boolean = false;
  isProgramDropdownOpen: boolean = false;
  isDatePickerOpen: boolean = false;
  showDateError: boolean = false;
  selectedDateISO: string = '';
  tempSelectedDate: Date | null = null;

  // Calendar functionality
  currentCalendarDate: Date = new Date();
  selectedCalendarDate: Date | null = null;
  calendarDays: CalendarDay[] = [];
  weekDays: string[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // Year picker functionality
  isYearPickerOpen: boolean = false;
  availableYears: number[] = [];

  private afAuth = inject(AngularFireAuth);
  private firestore = inject(AngularFirestore);
  private router = inject(Router);
  private toastController = inject(ToastController);

  constructor() {
    this.generateAvailableYears();
    this.generateCalendar();
  }

  // Date picker computed properties
  get minDate(): string {
    return '1950-01-01T00:00:00.000Z';
  }

  get maxDate(): string {
    const today = new Date();
    return today.toISOString();
  }

  checkBlur() {
    // Check if any input is focused, if not, set isInputFocused to false
    setTimeout(() => {
      this.isInputFocused = false;
    }, 100);
  }

  toggleProgramDropdown() {
    this.isProgramDropdownOpen = !this.isProgramDropdownOpen;
  }

  selectProgram(programCode: string) {
    this.program = programCode;
    this.showProgramError = false;
    this.isProgramDropdownOpen = false; // Close dropdown after selection
    console.log('Selected program:', programCode);
  }

  getProgramDisplayName(programCode: string): string {
    const programs: { [key: string]: string } = {
      'BSIT': 'BSIT - Bachelor of Science in Information Technology',
      'BSBA': 'BSBA - Bachelor of Science in Business Administration',
      'BSN': 'BSN - Bachelor of Science in Nursing'
    };
    return programs[programCode] || programCode;
  }

  // Calendar methods
  toggleDatePicker() {
    this.isDatePickerOpen = !this.isDatePickerOpen;
    this.showDateError = false;

    if (this.isDatePickerOpen) {
      if (this.graduationDate) {
        this.currentCalendarDate = new Date(this.graduationDate);
        this.selectedCalendarDate = new Date(this.graduationDate);
      } else {
        this.currentCalendarDate = new Date();
        this.selectedCalendarDate = null;
      }
      this.generateCalendar();
    }
  }

  closeDatePicker() {
    this.isDatePickerOpen = false;
    this.selectedCalendarDate = null;
  }

  getMonthYearTitle(): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`;
  }

  previousMonth() {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentCalendarDate = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  generateCalendar() {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const today = new Date();
    const maxDate = new Date(); // Don't allow future dates
    const minDate = new Date(1950, 0, 1); // Minimum date: January 1, 1950

    // Get first day of the month and adjust for Monday start
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // Generate 42 days (6 weeks)
    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      const isToday = this.isSameDay(date, today);
      const isSelected = this.selectedCalendarDate ? this.isSameDay(date, this.selectedCalendarDate) : false;
      const isDisabled = date > maxDate || date < minDate;

      this.calendarDays.push({
        day: date.getDate(),
        date: new Date(date),
        isCurrentMonth,
        isSelected,
        isToday,
        isDisabled
      });
    }
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  selectDay(day: CalendarDay) {
    if (day.isDisabled) return;

    // Clear previous selection
    this.calendarDays.forEach(d => d.isSelected = false);

    // Set new selection
    day.isSelected = true;
    this.selectedCalendarDate = new Date(day.date);
  }

  confirmDate() {
    if (this.selectedCalendarDate) {
      this.graduationDate = new Date(this.selectedCalendarDate);
      this.yearGraduated = this.graduationDate.getFullYear();
      this.showDateError = false;
    }
    this.closeDatePicker();
  }

  clearDate() {
    this.graduationDate = null;
    this.yearGraduated = null;
    this.selectedCalendarDate = null;
    this.closeDatePicker();
  }

  // Year picker methods
  generateAvailableYears() {
    const currentYear = new Date().getFullYear();
    const startYear = 1950;
    this.availableYears = [];

    for (let year = currentYear; year >= startYear; year--) {
      this.availableYears.push(year);
    }
  }

  toggleYearPicker() {
    this.isYearPickerOpen = !this.isYearPickerOpen;
  }

  selectYear(year: number) {
    this.currentCalendarDate = new Date(year, this.currentCalendarDate.getMonth(), 1);
    this.generateCalendar();
    this.isYearPickerOpen = false;
  }

  // Helper method to get collection name based on program
  getProgramCollectionName(program: string): string {
    console.log(`getProgramCollectionName called with program: "${program}"`);
    switch (program) {
      case 'BSIT':
        console.log('Returning BSIT collection');
        return 'BSIT';
      case 'BSBA':
        console.log('Returning BSBA collection');
        return 'BSBA';
      case 'BSN':
        console.log('Returning BSN collection');
        return 'BSN';
      default:
        console.log('Returning default users collection');
        return 'users'; // Fallback to default users collection
    }
  }

  formatGraduationDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.program-dropdown-wrapper');
    const datePicker = target.closest('.date-picker-wrapper');
    const yearPicker = target.closest('.year-picker-dropdown, .month-year-title');

    if (!dropdown && this.isProgramDropdownOpen) {
      this.isProgramDropdownOpen = false;
    }

    if (!datePicker && this.isDatePickerOpen) {
      this.closeDatePicker();
    }

    if (!yearPicker && this.isYearPickerOpen) {
      this.isYearPickerOpen = false;
    }
  }

  async register() {
    try {
      // Validate required fields including program and year
      if (!this.program) {
        this.showProgramError = true;
        await this.presentToast('Please select a program', 'warning');
        return;
      }

      if (!this.graduationDate) {
        this.showDateError = true;
        await this.presentToast('Please select graduation date', 'warning');
        return;
      }

      if (this.email && this.password && this.firstName && this.lastName && this.program && this.graduationDate) {
        const userCredential = await this.afAuth.createUserWithEmailAndPassword(this.email, this.password);
        console.log('User registered successfully:', userCredential.user);

        // Combine first and last name for fullName
        const fullName = `${this.firstName.trim()} ${this.lastName.trim()}`;

        // Store additional user profile data in Firestore
        if (userCredential.user) {
          // Determine collection name based on program
          const collectionName = this.getProgramCollectionName(this.program);
          console.log(`Selected program: ${this.program}`);
          console.log(`Collection name: ${collectionName}`);

          const userData = {
            uid: userCredential.user.uid,
            firstName: this.firstName.trim(),
            lastName: this.lastName.trim(),
            fullName: fullName,
            name: fullName, // Add name field for compatibility
            idNumber: this.idNumber,
            yearGraduated: this.yearGraduated,
            graduationDate: this.graduationDate,
            program: this.program,
            contactNumber: this.contactNumber,
            address: this.address,
            email: this.email,
            photoURL: userCredential.user.photoURL || null,
            verified: false,
            role: 'user',
            createdAt: new Date()
          };

          try {
            // Save to program-specific collection
            console.log(`Saving to ${collectionName} collection...`);
            await this.firestore.collection(collectionName).doc(userCredential.user.uid).set(userData);
            console.log(`Successfully saved to ${collectionName} collection`);

            // Also save to main users collection for backward compatibility and cross-program queries
            console.log('Saving to users collection...');
            await this.firestore.collection('users').doc(userCredential.user.uid).set(userData);
            console.log('Successfully saved to users collection');

            console.log(`User profile saved to both ${collectionName} and users collections`);
          } catch (firestoreError) {
            console.error('Firestore save error:', firestoreError);
            throw firestoreError;
          }
        }

        // Show success message
        await this.presentToast('Registration successful! Please log in with your credentials.', 'success');

        // Navigate to login page after successful registration
        this.router.navigate(['/login']);
      } else {
        console.error('Please fill in all required fields');
        await this.presentToast('Please fill in all required fields (First Name, Last Name, Email, Password, Program, Graduation Date)', 'warning');
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