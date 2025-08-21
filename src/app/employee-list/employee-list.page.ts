import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EmployeeService, Employee } from '../services/employee.service';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.page.html',
  styleUrls: ['./employee-list.page.scss'],
  standalone: false,
})
export class EmployeeListPage implements OnInit {
  employees: Employee[] = [];

  constructor(
    private employeeService: EmployeeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.employeeService.getEmployees().subscribe((data) => {
      this.employees = data;
    });
  }

  // Delete an employee
  deleteEmployee(id: string) {
    this.employeeService.deleteEmployee(id).then(() => {
      console.log('Employee deleted');
    });
  }

  // Add test employee for testing purposes
  addTestEmployee() {
    const testEmployee = {
      name: 'John Doe',
      position: 'Software Developer',
      department: 'IT',
      email: 'john.doe@example.com'
    };
    
    this.employeeService.addEmployee(testEmployee).then(() => {
      console.log('Test employee added');
      // Refresh the list
      this.ngOnInit();
    });
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }
}
