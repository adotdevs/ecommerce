export const PERMISSIONS = {
  PRODUCTS_READ: "products:read",
  PRODUCTS_WRITE: "products:write",
  ORDERS_READ: "orders:read",
  ORDERS_WRITE: "orders:write",
  CMS_READ: "cms:read",
  CMS_WRITE: "cms:write",
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",
  USERS_READ: "users:read",
  USERS_MANAGE: "users:manage",
  ANALYTICS_READ: "analytics:read",
  MARKETING_WRITE: "marketing:write",
  INVENTORY_WRITE: "inventory:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_DEFINITIONS = [
  {
    name: "super_admin",
    label: "Super Admin",
    permissions: ALL_PERMISSIONS,
  },
  {
    name: "admin",
    label: "Admin",
    permissions: ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.USERS_MANAGE),
  },
  {
    name: "manager",
    label: "Manager",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_WRITE,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.CMS_READ,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
  {
    name: "inventory_manager",
    label: "Inventory Manager",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_WRITE,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.ORDERS_READ,
    ],
  },
  {
    name: "marketing_manager",
    label: "Marketing Manager",
    permissions: [
      PERMISSIONS.CMS_READ,
      PERMISSIONS.CMS_WRITE,
      PERMISSIONS.MARKETING_WRITE,
      PERMISSIONS.ANALYTICS_READ,
      PERMISSIONS.PRODUCTS_READ,
    ],
  },
  {
    name: "customer_support",
    label: "Customer Support",
    permissions: [
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.PRODUCTS_READ,
    ],
  },
  {
    name: "customer",
    label: "Customer",
    permissions: [],
  },
] as const;

export const ADMIN_ROLES = [
  "super_admin",
  "admin",
  "manager",
  "inventory_manager",
  "marketing_manager",
  "customer_support",
];
