export const USER_ROLES = {
  REPARTIDOR: 'repartidor',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ALL_ROLES: UserRole[] = [
  USER_ROLES.REPARTIDOR,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPERADMIN,
];

export const isValidRole = (role: string): role is UserRole =>
  ALL_ROLES.includes(role as UserRole);

export const normalizeRole = (value: unknown): UserRole => {
  if (typeof value === 'string' && isValidRole(value)) {
    return value;
  }

  const nivel = Number(value);
  if (nivel === 1) return USER_ROLES.REPARTIDOR;
  if (nivel === 3) return USER_ROLES.SUPERADMIN;

  return USER_ROLES.ADMIN;
};

export const roleLabel = (role: UserRole): string => {
  switch (role) {
    case USER_ROLES.REPARTIDOR:
      return 'Repartidor';
    case USER_ROLES.SUPERADMIN:
      return 'Superadmin';
    default:
      return 'Admin';
  }
};
