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
  confirmPassword: string = '';

  isInputFocused: boolean = false;
  showPasswordMismatchError: boolean = false;
  showProgramError: boolean = false;
  showIdError: boolean = false;
  showContactError: boolean = false;
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

  onPasswordChange() {
    // Check password match when password changes
    if (this.confirmPassword) {
      this.validatePasswordMatch();
    }
  }

  onConfirmPasswordChange() {
    // Check password match when confirm password changes
    this.validatePasswordMatch();
  }

  validatePasswordMatch() {
    if (this.password && this.confirmPassword) {
      this.showPasswordMismatchError = this.password !== this.confirmPassword;
    } else {
      this.showPasswordMismatchError = false;
    }
  }

  validateStudentId(event: any) {
    const value = event.target.value;
    // Remove any non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Update the model with only numeric characters
    this.idNumber = numericValue;
    
    // Show error if not exactly 10 digits
    if (numericValue.length > 0 && numericValue.length !== 10) {
      this.showIdError = true;
    } else {
      this.showIdError = false;
    }
  }

  validateContactNumber(event: any) {
    const value = event.target.value;
    // Remove any non-numeric characters
    let numericValue = value.replace(/[^0-9]/g, '');
    
    // Limit to 11 characters
    if (numericValue.length > 11) {
      numericValue = numericValue.substring(0, 11);
    }
    
    // Update the model
    this.contactNumber = numericValue;
    
    // Validate format: must start with 0 and be exactly 11 digits
    const isValid = /^0\d{10}$/.test(numericValue);
    
    if (numericValue.length > 0 && numericValue.length !== 11) {
      this.showContactError = true;
    } else if (numericValue.length === 11 && !isValid) {
      this.showContactError = true;
    } else {
      this.showContactError = false;
    }
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (charCode === 65 && event.ctrlKey === true) ||
        (charCode === 67 && event.ctrlKey === true) ||
        (charCode === 86 && event.ctrlKey === true) ||
        (charCode === 88 && event.ctrlKey === true)) {
      return true;
    }
    // Ensure that it is a number and stop the keypress
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
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

      // Validate student ID
      if (!this.idNumber || this.idNumber.length !== 10 || !/^\d{10}$/.test(this.idNumber)) {
        this.showIdError = true;
        await this.presentToast('Student ID must be exactly 10 numbers', 'warning');
        return;
      }

      // Validate contact number
      if (!this.contactNumber || !/^0\d{10}$/.test(this.contactNumber)) {
        this.showContactError = true;
        await this.presentToast('Contact number must start with 0 and be exactly 11 digits', 'warning');
        return;
      }

      if (!this.graduationDate) {
        this.showDateError = true;
        await this.presentToast('Please select graduation date', 'warning');
        return;
      }

      // Validate password confirmation
      if (!this.confirmPassword) {
        await this.presentToast('Please confirm your password', 'warning');
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.showPasswordMismatchError = true;
        await this.presentToast('Passwords do not match', 'warning');
        return;
      }

      // Validate password strength (optional)
      if (this.password.length < 6) {
        await this.presentToast('Password must be at least 6 characters long', 'warning');
        return;
      }

      if (this.email && this.password && this.confirmPassword && this.firstName && this.lastName && this.program && this.graduationDate) {
        const userCredential = await this.afAuth.createUserWithEmailAndPassword(this.email, this.password);
        console.log('User registered successfully:', userCredential.user);

        // Combine first and last name for fullName
        const fullName = `${this.firstName.trim()} ${this.lastName.trim()}`;

        // Store additional user profile data in Firestore
        if (userCredential.user) {
          console.log(`Selected program: ${this.program}`);

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
            createdAt: new Date(),
            updatedAt: new Date()
          };

          try {
            // Save alumni data to registry-approval collection for admin approval
            console.log(`Saving alumni data to registry-approval collection for approval...`);

            // Save to registry-approval collection
            await this.firestore.collection('registry-approval').doc(userCredential.user.uid).set(userData);
            console.log(`Successfully saved to registry-approval/${userCredential.user.uid}`);

            console.log(`Alumni data saved to registry-approval collection for admin review`);
          } catch (firestoreError) {
            console.error('Firestore save error:', firestoreError);
            throw firestoreError;
          }
        }

        // Show success message with 5-second timeout
        await this.presentToast("You've successfully created an account! Please wait for admin confirmation.", 'success', 5000);

        // Navigate to login page after 5 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 5000);
      } else {
        console.error('Please fill in all required fields');
        await this.presentToast('Please fill in all required fields (First Name, Last Name, Email, Password, Confirm Password, Program, Graduation Date)', 'warning');
      }
    } catch (error: any) {
      console.error('Registration error:', error.message);
      await this.presentToast('Registration failed: ' + error.message, 'danger');
    }
  }

  async presentToast(message: string, color: string = 'primary', duration: number = 3000) {
    const toast = await this.toastController.create({
      message: message,
      duration: duration,
      position: 'top',
      color: color
    });
    toast.present();
  }

}