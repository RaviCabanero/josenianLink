import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService, Employee } from '../services/employee.service';

@Component({
  selector: 'app-edit-employee',
  templateUrl: './edit-employee.page.html',
  styleUrls: ['./edit-employee.page.scss'],
  standalone: false,
})
export class EditEmployeePage implements OnInit {
  employee: Employee = {
    name: '',
    position: '',
    department: '',
    email: '',
  };
  id: string = '';

  constructor(
    private employeeService: EmployeeService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id') || '';
  }

  ngOnInit() {
    if (this.id) {
      this.employeeService.getEmployee(this.id).subscribe((data) => {
        if (data) {
          this.employee = data;
        }
      });
    }
  }

  updateEmployee() {
    this.employeeService.updateEmployee(this.id, this.employee).then(() => {
      this.router.navigate(['/employee-list']);
    });
  }
}
