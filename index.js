const express = require("express");
const cors = require("cors");
const { sequelize } = require("./lib/index");
const { Op } = require("@sequelize/core");
const { employee } = require("./models/employee.model");
const { department } = require("./models/department.model");
const { role } = require("./models/role.model");
const { employeeDepartment } = require("./models/employeeDepartment.model");
const { employeeRole } = require("./models/employeeRole.model");

const app = express();

app.use(cors());
app.use(express.json());

// Endpoint to seed database
app.get("/seed_db", async (req, res) => {
  await sequelize.sync({ force: true });

  const departments = await department.bulkCreate([
    { name: "Engineering" },
    { name: "Marketing" },
  ]);

  const roles = await role.bulkCreate([
    { title: "Software Engineer" },
    { title: "Marketing Specialist" },
    { title: "Product Manager" },
  ]);

  const employees = await employee.bulkCreate([
    { name: "Rahul Sharma", email: "rahul.sharma@example.com" },
    { name: "Priya Singh", email: "priya.singh@example.com" },
    { name: "Ankit Verma", email: "ankit.verma@example.com" },
  ]);

  // Associate employees with departments and roles using create method on junction models
  await employeeDepartment.create({
    employeeId: employees[0].id,
    departmentId: departments[0].id,
  });
  await employeeRole.create({
    employeeId: employees[0].id,
    roleId: roles[0].id,
  });

  await employeeDepartment.create({
    employeeId: employees[1].id,
    departmentId: departments[1].id,
  });
  await employeeRole.create({
    employeeId: employees[1].id,
    roleId: roles[1].id,
  });

  await employeeDepartment.create({
    employeeId: employees[2].id,
    departmentId: departments[0].id,
  });
  await employeeRole.create({
    employeeId: employees[2].id,
    roleId: roles[2].id,
  });

  return res.json({ message: "Database seeded!" });
});

// Helper function to get employee's associated departments
async function getEmployeeDepartments(employeeId) {
  const employeeDepartments = await employeeDepartment.findAll({
    where: { employeeId },
    raw: true,
  });

  const departmentIds = employeeDepartments.map(
    (employeeDepartment) => employeeDepartment.departmentId,
  );

  const departments = await department.findAll({
    where: { id: { [Op.in]: departmentIds } },
    raw: true,
  });
  return departments;
}

// Helper function to get employee's associated roles
async function getEmployeeRoles(employeeId) {
  const employeeRoles = await employeeRole.findAll({
    where: { employeeId },
    raw: true,
  });

  const roleIds = employeeRoles.map((employeeRole) => employeeRole.roleId);

  const roles = await role.findAll({
    where: { id: { [Op.in]: roleIds } },
    raw: true,
  });
  return roles;
}

// Helper function to get employee details with associated departments and roles
async function getEmployeeDetails(employeeData) {
  const departments = await getEmployeeDepartments(employeeData.id);
  const roles = await getEmployeeRoles(employeeData.id);
  return {
    ...employeeData,
    departments,
    roles,
  };
}

async function fetchAllEmployees() {
  const employees = await employee.findAll({ raw: true });
  const employeesWithDepartmentAndRoleInfo = [];
  for (let employee of employees) {
    const employeeDetails = await getEmployeeDetails(employee);
    employeesWithDepartmentAndRoleInfo.push(employeeDetails);
  }

  return { employees: employeesWithDepartmentAndRoleInfo };
}

app.get("/employees", async (req, res) => {
  try {
    const response = await fetchAllEmployees();
    if (response.employees.length === 0) {
      res.status(404).json({ message: "No employees found" });
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function fetchEmployeeWithId(empId) {
  const emp = await employee.findOne({ where: { id: empId }, raw: true });
  if (!emp) return {};
  const employeeDetails = await getEmployeeDetails(emp);
  return { employee: employeeDetails };
}

app.get("/employees/details/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const response = await fetchEmployeeWithId(id);
    if (!response.employee) {
      res.status(404).json({ message: "Employee not found" });
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function fetchEmployeesByDepartmentId(departmentId) {
  const employeeDepartmentList = await employeeDepartment.findAll({
    where: { departmentId },
    raw: true,
  });
  const employees = [];

  for (let employeeDepartment of employeeDepartmentList) {
    const employeeData = await employee.findOne({
      where: { id: employeeDepartment.employeeId },
      raw: true,
    });
    const employeeWithDepartmentAndRoleDetails =
      await getEmployeeDetails(employeeData);
    employees.push(employeeWithDepartmentAndRoleDetails);
  }

  return { employees };
}

app.get("/employees/department/:departmentId", async (req, res) => {
  try {
    const departmentId = req.params.departmentId;
    const response = await fetchEmployeesByDepartmentId(departmentId);
    if (response.employees.length === 0) {
      res.status(404).json({ message: "Employees not found" });
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function fetchEmployeesByRoleId(roleId) {
  const employeeRoleList = await employeeRole.findAll({
    where: { roleId },
    raw: true,
  });
  const employees = [];

  for (let employeeRole of employeeRoleList) {
    const employeeData = await employee.findOne({
      where: { id: employeeRole.employeeId },
      raw: true,
    });
    const employeeWithDepartmentAndRoleDetails =
      await getEmployeeDetails(employeeData);
    employees.push(employeeWithDepartmentAndRoleDetails);
  }

  return { employees };
}

app.get("/employees/role/:roleId", async (req, res) => {
  try {
    const roleId = req.params.roleId;
    const response = await fetchEmployeesByRoleId(roleId);
    if (response.employees.length === 0) {
      res.status(404).json({ message: "Employees not found" });
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function fetchAllEmployeesSortedByName(order) {
  const employees = await employee.findAll({
    order: [["name", order]],
    raw: true,
  });
  const employeesWithDepartmentAndRoleInfo = [];
  for (let employee of employees) {
    const employeeDetails = await getEmployeeDetails(employee);
    employeesWithDepartmentAndRoleInfo.push(employeeDetails);
  }

  return { employees: employeesWithDepartmentAndRoleInfo };
}

app.get("/employees/sort-by-name", async (req, res) => {
  try {
    const order = req.query.order;
    const response = await fetchAllEmployeesSortedByName(order);
    if (response.employees.length === 0) {
      res.status(404).json({ message: "No employees found" });
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function addNewEmployee(newEmployee) {
  const emp = await employee.create({
    name: newEmployee.name,
    email: newEmployee.email,
  });

  await employeeDepartment.create({
    employeeId: emp.id,
    departmentId: newEmployee.departmentId,
  });
  await employeeRole.create({
    employeeId: emp.id,
    roleId: newEmployee.roleId,
  });
  const employeeDetails = await getEmployeeDetails(emp.get());
  return employeeDetails;
}

app.post("/employees/new", async (req, res) => {
  try {
    const newEmployee = req.body;
    const response = await addNewEmployee(newEmployee);

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function updateEmployeeData(employeeData, empId) {
  const emp = await employee.findOne({ where: { id: empId } });
  if (!emp) {
    return {};
  }
  const newEmployeeData = {};
  if (employeeData.name) {
    newEmployeeData.name = employeeData.name;
  }
  if (employeeData.email) {
    newEmployeeData.email = employeeData.email;
  }
  if (Object.keys(newEmployeeData).length > 0) {
    emp.set(newEmployeeData);
    await emp.save();
  }
  if (employeeData.departmentId) {
    await employeeDepartment.destroy({
      where: {
        employeeId: empId,
      },
    });
    await employeeDepartment.create({
      employeeId: empId,
      departmentId: employeeData.departmentId,
    });
  }
  if (employeeData.roleId) {
    await employeeRole.destroy({
      where: {
        employeeId: empId,
      },
    });
    await employeeRole.create({
      employeeId: empId,
      roleId: employeeData.roleId,
    });
  }
  const employeeDetails = await getEmployeeDetails(emp.get());
  return employeeDetails;
}

app.patch("/employees/update/:id", async (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const employeeData = req.body;
    const response = await updateEmployeeData(employeeData, empId);

    if (Object.keys(response).length == 0) {
      res.status(404).json({ message: "Employee not found with the given id" });
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function deleteEmployeeData(empId) {
  await employee.destroy({
    where: {
      id: empId,
    },
  });
  await employeeDepartment.destroy({
    where: {
      employeeId: empId,
    },
  });
  await employeeRole.destroy({
    where: {
      employeeId: empId,
    },
  });
}

app.post("/employees/delete", async (req, res) => {
  try {
    const empId = parseInt(req.body.id);
    await deleteEmployeeData(empId);

    res
      .status(200)
      .json({ message: `Employee with ID ${empId} has been deleted.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
