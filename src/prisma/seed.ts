
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

const prisma = new PrismaService();

const adminName = process.env.SEED_ADMIN_NAME ?? 'Platform Admin';
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const productPrice = process.env.SEED_PRODUCT_PRICE ?? '12.50';

async function seed() {
  try {
    const password = process.env.SEED_SAMPLE_PASSWORD;

    if (!password) {
      throw new Error('Please set SEED_SAMPLE_PASSWORD in .env');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create permissions and roles

    const roles = [
      {
        name: 'MERCHANT_OWNER',
        permissions: [
          'merchant:read',
          'merchant:update',
          'store:create',
          'store:read',
          'store:update',
          'product:create',
          'product:read',
          'product:update',
          'inventory:read',
          'inventory:restock',
          'sale:create',
          'sale:read',
          'user:create',
          'user:read',
        ],
      },
      {
        name: 'STORE_MANAGER',
        permissions: [
          'store:read',
          'store:update',
          'product:read',
          'inventory:read',
          'inventory:restock',
          'sale:create',
          'sale:read',
          'user:create',
          'user:read',
        ],
      },
      {
        name: 'INVENTORY_MANAGER',
        permissions: [
          'store:read',
          'product:read',
          'inventory:read',
          'inventory:restock',
        ],
      },
      {
        name: 'CASHIER',
        permissions: [
          'store:read',
          'product:read',
          'inventory:read',
          'sale:create',
          'sale:read',
        ],
      },
    ];

    for (const role of roles) {
      for (const permission of role.permissions) {
        await prisma.permission.upsert({
          where: { name: permission },
          update: {},
          create: { name: permission },
        });
      }

      await prisma.role.upsert({
        where: { name: role.name },
        update: {
          permissions: {
            set: role.permissions.map((name) => ({ name })),
          },
        },
        create: {
          name: role.name,
          permissions: {
            connect: role.permissions.map((name) => ({ name })),
          },
        },
      });
    }

    console.log('Roles and permissions created.');

    // 2. Create platform admin

    const admin = await prisma.user.upsert({
      where: {
        email: adminEmail,
      },
      update: {
        passwordHash,
        isPlatformAdmin: true,
        status: 'ACTIVE',
      },
      create: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        isPlatformAdmin: true,
      },
    });

    console.log('Platform admin:', admin.email);

    // 3. Create two merchants

    const merchants = [
      {
        name: process.env.SEED_MERCHANT_NAME ?? 'Sample Merchant A',
        storeName: process.env.SEED_STORE_NAME ?? 'Sample Store A',
        storeAddress: process.env.SEED_STORE_ADDRESS_A ?? '1 Sample Street',
        ownerEmail: process.env.SEED_OWNER_A_EMAIL ?? 'owner-a@example.com',
        managerEmail: process.env.SEED_MANAGER_A_EMAIL ?? 'manager-a@example.com',
        inventoryEmail: process.env.SEED_INVENTORY_A_EMAIL ?? 'inventory-a@example.com',
        cashierEmail: process.env.SEED_CASHIER_A_EMAIL ?? 'cashier-a@example.com',
        productName: process.env.SEED_PRODUCT_NAME ?? 'Sample Product A',
        sku: process.env.SEED_PRODUCT_SKU ?? 'SAMPLE-A-001',
      },
      {
        name: process.env.SEED_OTHER_MERCHANT_NAME ?? 'Sample Merchant B',
        storeName: process.env.SEED_OTHER_STORE_NAME ?? 'Sample Store B',
        storeAddress: process.env.SEED_STORE_ADDRESS_B ?? '2 Sample Street',
        ownerEmail: process.env.SEED_OWNER_B_EMAIL ?? 'owner-b@example.com',
        managerEmail: process.env.SEED_MANAGER_B_EMAIL ?? 'manager-b@example.com',
        inventoryEmail: process.env.SEED_INVENTORY_B_EMAIL ?? 'inventory-b@example.com',
        cashierEmail: process.env.SEED_CASHIER_B_EMAIL ?? 'cashier-b@example.com',
        productName: process.env.SEED_OTHER_PRODUCT_NAME ?? 'Sample Product B',
        sku: process.env.SEED_OTHER_PRODUCT_SKU ?? 'SAMPLE-B-001',
      },
    ];

    for (const merchantData of merchants) {
      // Create or find merchant

      let merchant = await prisma.merchant.findFirst({
        where: { name: merchantData.name },
      });

      if (!merchant) {
        merchant = await prisma.merchant.create({
          data: { name: merchantData.name },
        });
      }

      // Create or find store

      let store = await prisma.store.findFirst({
        where: {
          name: merchantData.storeName,
          merchantId: merchant.id,
        },
      });

      if (!store) {
        store = await prisma.store.create({
          data: {
            name: merchantData.storeName,
            address: merchantData.storeAddress,
            merchantId: merchant.id,
          },
        });
      }

      // Find the roles

      const ownerRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'MERCHANT_OWNER' },
      });

      const managerRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'STORE_MANAGER' },
      });

      const inventoryRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'INVENTORY_MANAGER' },
      });

      const cashierRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'CASHIER' },
      });

      // Create users

      const users = [
        {
          name: `${merchantData.name} Owner`,
          email: merchantData.ownerEmail,
          roleId: ownerRole.id,
          storeId: null,
        },
        {
          name: `${merchantData.name} Manager`,
          email: merchantData.managerEmail,
          roleId: managerRole.id,
          storeId: store.id,
        },
        {
          name: `${merchantData.name} Inventory Manager`,
          email: merchantData.inventoryEmail,
          roleId: inventoryRole.id,
          storeId: store.id,
        },
        {
          name: `${merchantData.name} Cashier`,
          email: merchantData.cashierEmail,
          roleId: cashierRole.id,
          storeId: store.id,
        },
      ];

      for (const userData of users) {
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {
            name: userData.name,
            passwordHash,
            status: 'ACTIVE',
          },
          create: {
            name: userData.name,
            email: userData.email,
            passwordHash,
          },
        });

        // Find existing membership

        const membership = await prisma.userMembership.findFirst({
          where: {
            userId: user.id,
            merchantId: merchant.id,
            storeId: userData.storeId,
          },
        });

        // Create or update membership

        if (membership) {
          await prisma.userMembership.update({
            where: { id: membership.id },
            data: {
              roleId: userData.roleId,
              status: 'ACTIVE',
            },
          });
        } else {
          await prisma.userMembership.create({
            data: {
              userId: user.id,
              merchantId: merchant.id,
              storeId: userData.storeId,
              roleId: userData.roleId,
            },
          });
        }
      }

      // 4. Create product

      const product = await prisma.product.upsert({
        where: {
          merchantId_sku: {
            merchantId: merchant.id,
            sku: merchantData.sku,
          },
        },
        update: {
          name: merchantData.productName,
          price: productPrice,
          status: 'ACTIVE',
        },
        create: {
          name: merchantData.productName,
          sku: merchantData.sku,
          price: productPrice,
          merchantId: merchant.id,
        },
      });

      // 5. Create initial inventory

      await prisma.storeInventory.upsert({
        where: {
          storeId_productId: {
            storeId: store.id,
            productId: product.id,
          },
        },
        update: {},
        create: {
          merchantId: merchant.id,
          storeId: store.id,
          productId: product.id,
          quantity: 20,
        },
      });

      console.log(`${merchant.name} seeded successfully.`);
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch(() => {
  process.exitCode = 1;
});
