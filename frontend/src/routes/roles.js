/** Role → home route. One place, so a redirect cannot drift from the router. */
export const ROLE_HOME = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

export const ROLE_LABEL = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

export const ROLE_ICON = {
  admin: 'bi-shield-lock',
  teacher: 'bi-person-video3',
  student: 'bi-mortarboard',
  parent: 'bi-people',
};

export function homeFor(role) {
  return ROLE_HOME[role] || '/login';
}
